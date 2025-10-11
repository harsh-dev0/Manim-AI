from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel
from s3_storage import S3Storage

from anthropic import Anthropic
import google.genai as genai
import os
import subprocess
import uuid
import logging
import signal
from pathlib import Path
import shutil
import time
import json
import sys
import re
import hashlib

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="MANIM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://manimai.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def handle_exit_signal(signum, frame):
    logger.info(f"Received exit signal {signum}. Cleaning up and shutting down...")
    sys.exit(0)

signal.signal(signal.SIGINT, handle_exit_signal)
signal.signal(signal.SIGTERM, handle_exit_signal)

BASE_DIR = Path("./outputs")
CODE_DIR = BASE_DIR / "code"
MEDIA_DIR = BASE_DIR / "media"
JOB_DIR = BASE_DIR / "jobs"
LOG_DIR = BASE_DIR / "logs"

CODE_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
JOB_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

file_handler = logging.FileHandler(LOG_DIR / "manim_api.log")
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)

app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# Initialize S3 storage for cloud deployment
s3_storage = S3Storage()

# Debug logging for S3 storage initialization status only
logger.info(f"S3 storage initialized: {s3_storage.is_enabled}")
if s3_storage.is_enabled:
    logger.info(f"S3 bucket configured: {s3_storage.bucket_name}")
else:
    logger.info("S3 storage not initialized, using local storage only")
    


try:
    # Initialize Gemini client with global API key (for fallback)
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if gemini_api_key:
        gemini_client = genai.Client(api_key=gemini_api_key)
        logger.info("Gemini client initialized successfully with new SDK")
    else:
        gemini_client = None
        logger.warning("No global Gemini API key found")
    
    # Initialize Anthropic client
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_api_key:
        anthropic_client = Anthropic(api_key=anthropic_api_key)
        logger.info("Anthropic client initialized successfully")
    else:
        logger.warning("No Anthropic API key found")
        anthropic_client = None
        
except Exception as e:
    logger.error(f"Error initializing LLM clients: {e}")
    anthropic_client = None
    gemini_client = None

DEV_MODE = os.environ.get("DEV_MODE", "0") == "1"
if DEV_MODE:
    logger.info("Running in development mode")

class PromptRequest(BaseModel):
    prompt: str
    gemini_api_key: str = None  # BYOK support for Gemini

class ManimGenerationResponse(BaseModel):
    id: str
    status: str
    video_url: str = None
    title: str = None
    code: str = None
    previous_video_url: str = None
    previous_video_id: str = None
    error: str = None
    error_type: str = None

class EditRequest(BaseModel):
    code: str
    prompt: str
    previous_video_url: str = None
    previous_video_id: str = None
    gemini_api_key: str = None

generation_jobs = {}

def load_jobs():
    try:
        job_files = list(JOB_DIR.glob("*.json"))
        for job_file in job_files:
            try:
                with open(job_file, "r") as f:
                    job_data = json.load(f)
                    job_id = job_file.stem
                    generation_jobs[job_id] = job_data
                    logger.info(f"Loaded job {job_id} from disk")
            except Exception as e:
                logger.error(f"Error loading job file {job_file}: {e}")
    except Exception as e:
        logger.error(f"Error loading jobs: {e}")

def save_job(job_id, job_data):
    try:
        job_file = JOB_DIR / f"{job_id}.json"
        with open(job_file, "w") as f:
            json.dump(job_data, f)
        logger.info(f"Saved job {job_id} to disk")
    except Exception as e:
        logger.error(f"Error saving job {job_id}: {e}")

def categorize_error(error_message: str) -> tuple[str, str]:
    """Categorize errors and return user-friendly messages"""
    error_lower = error_message.lower()
    
    if "timeout" in error_lower or "timed out" in error_lower:
        return "TIMEOUT_ERROR", "Video rendering took too long. The animation might be too complex. Try simplifying your request."
    
    elif "memory" in error_lower or "out of memory" in error_lower:
        return "MEMORY_ERROR", "Video rendering failed due to insufficient memory. Try creating a shorter or simpler animation."
    
    elif "latex" in error_lower or "tex" in error_lower or "dvisvgm" in error_lower:
        return "LATEX_ERROR", "LaTeX rendering failed. There might be an issue with mathematical expressions in your animation."
    
    elif "api" in error_lower or "rate limit" in error_lower or "quota" in error_lower:
        return "API_ERROR", "AI service is temporarily unavailable. Please try again in a moment."
    
    elif "invalid code" in error_lower or "syntax" in error_lower or "indentation" in error_lower:
        return "CODE_ERROR", "Generated code has errors. Please try rephrasing your request."
    
    elif "file not found" in error_lower or "no such file" in error_lower:
        return "DEPENDENCY_ERROR", "Missing required dependencies for rendering. Please contact support."
    
    elif "failed to generate" in error_lower or "no code" in error_lower:
        return "GENERATION_ERROR", "Failed to generate animation code. Please try a different prompt."
    
    elif "render failed" in error_lower or "rendering error" in error_lower:
        return "RENDER_ERROR", "Video rendering failed. The animation might be too complex or contain unsupported features."
    
    else:
        return "UNKNOWN_ERROR", "An unexpected error occurred. Please try again or contact support."

def sanitize_filename(prompt: str) -> str:
    """Convert prompt to a safe filename for S3 upload"""
    # Remove special characters and replace spaces with underscores
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-_]', '', prompt)
    sanitized = re.sub(r'\s+', '_', sanitized)
    sanitized = sanitized.strip('_')
    
    # Limit length and add hash for uniqueness
    if len(sanitized) > 50:
        sanitized = sanitized[:50]
    
    # Add hash for uniqueness
    prompt_hash = hashlib.md5(prompt.encode()).hexdigest()[:8]
    return f"{sanitized}_{prompt_hash}"
def sanitize_manim_code(code: str) -> str:
    """Sanitize Manim code to fix common issues and deprecated methods"""
    try:
        logger.info("Sanitizing Manim code...")
        
        # Remove deprecated methods and fix common issues
        fixes = [
            # Fix deprecated shorten_ends method
            (r'\.shorten_ends\([^)]*\)', ''),
            (r'shorten_ends\s*=\s*[^,)]+[,)]?', ''),
            
            # Fix deprecated Line methods
            (r'Line\.set_length\(', 'Line(ORIGIN, RIGHT).scale('),
            
            # Fix deprecated NumberPlane methods  
            (r'NumberPlane\([^)]*background_line_style[^)]*\)', 'NumberPlane()'),
            
            # Fix deprecated Axes methods
            (r'\.add_coordinates\(\)', '.add_coordinate_labels()'),
            (r'axes\.plot\([^,]+,\s*label\s*=\s*[^,)]+', lambda m: m.group(0).split(',')[0]),
            
            # Fix deprecated positioning methods
            (r'\.next_to_point\(', '.next_to('),
            (r'\.shift_onto_screen\(\)', '.to_edge()'),
            
            # Fix deprecated animation methods
            (r'ShowCreation\(', 'Create('),
            (r'DrawBorderThenFill\(', 'DrawBorderThenFill('),
            
            # Fix deprecated color constants
            (r'\bAVERAGE_COLOR\b', 'BLUE'),
            (r'\bCOLOR_MAP\b', 'BLUE'),
            
            # Fix deprecated VMobject methods
            (r'\.set_stroke_width\(', '.set_stroke(width='),
            (r'\.set_fill_opacity\(', '.set_fill(opacity='),
            
            # Fix deprecated Scene methods
            (r'self\.camera\.frame\.', 'self.camera.frame.'),
            (r'self\.add_fixed_in_frame_mobjects\(', 'self.add_fixed_orientation_mobjects('),
        ]
        
        # Apply all fixes
        for pattern, replacement in fixes:
            if callable(replacement):
                code = re.sub(pattern, replacement, code)
            else:
                code = re.sub(pattern, replacement, code)
        
        # Ensure proper imports
        if 'from manim import *' not in code:
            code = 'from manim import *\n' + code
            
        # Ensure numpy import if used
        if 'np.' in code and 'import numpy as np' not in code:
            code = code.replace('from manim import *', 'from manim import *\nimport numpy as np')
        
        # Validate basic structure
        if 'class' not in code or 'Scene' not in code:
            raise ValueError("Code missing required class or Scene inheritance")
            
        if 'def construct(self):' not in code:
            raise ValueError("Code missing construct method")
        
        logger.info("Code sanitization completed successfully")
        return code
        
    except Exception as e:
        logger.error(f"Error sanitizing code: {str(e)}")
        raise ValueError(f"Code sanitization failed: {str(e)}")


@app.get("/")
def read_root():
    return {"message": "Welcome to MANIM API"}

@app.get("/test-s3-upload")
def test_s3_upload():
    try:
        test_file_path = MEDIA_DIR / "test_file.txt"
        with open(test_file_path, "w") as f:
            f.write("This is a test file for S3 upload")
            
        logger.info(f"Created test file at {test_file_path}")
        logger.info(f"S3 storage enabled: {s3_storage.is_enabled}")
        logger.info(f"S3 bucket name: {s3_storage.bucket_name}")
        
        if s3_storage.is_enabled:
            s3_key = "test/test_upload.txt"
            logger.info(f"Attempting to upload test file to S3 with key: {s3_key}")
            s3_url = s3_storage.upload_file(str(test_file_path), s3_key)
            
            if s3_url:
                return {"success": True, "message": "S3 upload successful", "url": s3_url}
            else:
                return {"success": False, "message": "S3 upload failed"}
        else:
            return {"success": False, "message": "S3 storage not enabled"}
    except Exception as e:
        logger.error(f"Error in test S3 upload: {str(e)}")
        return {"success": False, "message": f"Error: {str(e)}"}

@app.post("/generate", response_model=ManimGenerationResponse)
async def generate_animation(request: PromptRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    job_data = {
        "status": "processing",
        "created_at": time.time(),
        "prompt": request.prompt,
        "gemini_api_key": request.gemini_api_key  # Store BYOK key
    }
    generation_jobs[job_id] = job_data
    save_job(job_id, job_data)

    try:
        background_tasks.add_task(
            process_animation_request, 
            job_id=job_id, 
            prompt=request.prompt,
            gemini_api_key=request.gemini_api_key
        )
        return ManimGenerationResponse(
            id=job_id,
            status="processing"
        )
    except Exception as e:
        error_message = f"Failed to start animation task: {str(e)}"
        logger.error(error_message)
        
        error_type, user_message = categorize_error(error_message)
        
        job_data = {
            "status": "failed",
            "created_at": time.time(),
            "prompt": request.prompt,
            "error": user_message,
            "error_type": error_type,
            "gemini_api_key": request.gemini_api_key
        }
        
        generation_jobs[job_id] = job_data
        save_job(job_id, job_data)
        
        return ManimGenerationResponse(
            id=job_id,
            status="failed",
            error=user_message,
            error_type=error_type
        )

@app.post("/edit", response_model=ManimGenerationResponse)
async def edit_animation(request: EditRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    job_data = {
        "status": "processing",
        "created_at": time.time(),
        "edit_prompt": request.prompt,
        "original_code": request.code,
        "previous_video_url": request.previous_video_url,
        "previous_video_id": request.previous_video_id,
        "gemini_api_key": request.gemini_api_key
    }
    generation_jobs[job_id] = job_data
    save_job(job_id, job_data)

    try:
        background_tasks.add_task(
            process_edit_request, 
            job_id=job_id, 
            code=request.code,
            prompt=request.prompt,
            previous_video_url=request.previous_video_url,
            previous_video_id=request.previous_video_id,
            gemini_api_key=request.gemini_api_key
        )
        return ManimGenerationResponse(
            id=job_id,
            status="processing"
        )
    except Exception as e:
        error_message = f"Failed to start edit task: {str(e)}"
        logger.error(error_message)
        
        error_type, user_message = categorize_error(error_message)
        
        job_data = {
            "status": "failed",
            "created_at": time.time(),
            "edit_prompt": request.prompt,
            "original_code": request.code,
            "previous_video_url": request.previous_video_url,
            "previous_video_id": request.previous_video_id,
            "error": user_message,
            "error_type": error_type,
            "gemini_api_key": request.gemini_api_key
        }
        
        generation_jobs[job_id] = job_data
        save_job(job_id, job_data)
        
        return ManimGenerationResponse(
            id=job_id,
            status="failed",
            error=user_message,
            error_type=error_type
        )

@app.get("/status/{job_id}", response_model=ManimGenerationResponse)
async def get_job_status(job_id: str):
    try:
        logger.info(f"Status check requested for job: {job_id}")
        logger.info(f"Current jobs in memory: {list(generation_jobs.keys())}")
        
        if job_id not in generation_jobs:
            job_file = JOB_DIR / f"{job_id}.json"
            if job_file.exists():
                try:
                    with open(job_file, "r") as f:
                        generation_jobs[job_id] = json.load(f)
                        logger.info(f"Loaded job {job_id} from disk on demand")
                except Exception as e:
                    logger.error(f"Error loading job {job_id} from disk: {e}")
        
        if job_id not in generation_jobs:
            logger.error(f"Job not found: {job_id}")
            return JSONResponse(
                status_code=404,
                content={"detail": "Job not found", "id": job_id, "status": "not_found"}
            )
        
        job = generation_jobs[job_id]
        
        response = ManimGenerationResponse(
            id=job_id,
            status=job.get("status", "unknown")
        )
        
        if "video_url" in job:
            response.video_url = job["video_url"]
        if "title" in job:
            response.title = job["title"]
        if "code" in job:
            response.code = job["code"]
        if "previous_video_url" in job:
            response.previous_video_url = job["previous_video_url"]
        if "previous_video_id" in job:
            response.previous_video_id = job["previous_video_id"]
        if "error" in job:
            response.error = job["error"]
        if "error_type" in job:
            response.error_type = job["error_type"]
            
        return response
    except Exception as e:
        logger.error(f"Error processing status request for job {job_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error while checking job status",
                "id": job_id,
                "status": "error",
                "error": str(e)
            }
        )

@app.get("/download/{job_id}")
async def download_video(job_id: str):
    if job_id not in generation_jobs or generation_jobs[job_id].get("status") != "completed":
        raise HTTPException(status_code=404, detail="Video not found or not ready")

    # Check if we have an S3 URL
    if "video_url" in generation_jobs[job_id] and generation_jobs[job_id]["video_url"].startswith("https://"):
        # Redirect to the S3 URL
        return RedirectResponse(url=generation_jobs[job_id]["video_url"])
    
    # Fall back to local file
    video_path = generation_jobs[job_id].get("video_path")
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        path=video_path, 
        filename=f"animation_{job_id}.mp4", 
        media_type="video/mp4"
    )

@app.on_event("startup")
def setup_periodic_cleanup():
    load_jobs()
    CODE_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    JOB_DIR.mkdir(parents=True, exist_ok=True)
    
    # Start a background task for periodic cleanup
    import asyncio
    from fastapi.concurrency import run_in_threadpool
    
    async def periodic_cleanup():
        while True:
            await run_in_threadpool(cleanup_old_jobs)
            await asyncio.sleep(540)  # Run cleanup every hour
    
    asyncio.create_task(periodic_cleanup())

def cleanup_old_jobs():
    """Clean up old jobs from memory and disk to prevent memory accumulation."""
    try:
        current_time = time.time()
        jobs_to_remove = []
        
        # Find jobs older than 24 hours
        for job_id, job_data in generation_jobs.items():
            job_age = current_time - job_data.get("created_at", current_time)
            if job_age > 600:  # 24 hours in seconds
                jobs_to_remove.append(job_id)
        
        # Remove old jobs from memory
        for job_id in jobs_to_remove:
            if job_id in generation_jobs:
                del generation_jobs[job_id]
                logger.info(f"Removed job {job_id} from memory")
            
            # Remove job file
            job_file = JOB_DIR / f"{job_id}.json"
            if job_file.exists():
                job_file.unlink()
                logger.info(f"Removed job file {job_id}.json")
            
            # Remove code file
            code_file = CODE_DIR / f"{job_id}.py"
            if code_file.exists():
                code_file.unlink()
                logger.info(f"Removed code file {job_id}.py")
            
            # Remove media file if it exists locally
            media_files = list(MEDIA_DIR.glob(f"*{job_id}*.mp4"))
            for media_file in media_files:
                media_file.unlink()
                logger.info(f"Removed media file {media_file}")
        
        logger.info(f"Cleanup completed: removed {len(jobs_to_remove)} old jobs")
    except Exception as e:
        logger.error(f"Error during job cleanup: {str(e)}")

def edit_manim_code(original_code: str, edit_prompt: str, gemini_api_key: str = None):
    """Edit existing Manim code using AI based on user prompt"""
    try:
        system_prompt = """You are a Manim expert specializing in editing and improving existing Manim code.

Your task is to modify the provided Manim code according to the user's edit request.

⚠️ VERY IMPORTANT RULES:
1. DO NOT use `label=` in `axes.plot()` — it causes rendering issues
2. Only use LaTeX fully supported by Manim
3. Maintain the existing structure and class names unless specifically asked to change them
4. Keep all existing functionality unless the user asks to remove it
5. Follow all modern Manim best practices
6. The video dimensions must remain in landscape: 1920x1080
7. Always preserve imports and configuration settings unless asked to change them

✅ YOUR RESPONSE MUST:
- Return ONLY the complete modified Python code
- Include NO explanations, NO markdown, NO text outside the code
- Maintain proper indentation and structure
- Keep the same class name unless explicitly asked to change it
- Preserve all working features from the original code

Example input:
Original code: [some manim code]
Edit request: "Make the circle red and add a square"

Example output:
# Modified animation
from manim import *
[complete modified code here]
"""

        models_to_try = [
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-1.5-pro'
        ]
        
        gemini_key_to_use = gemini_api_key or os.environ.get("GEMINI_API_KEY")
        if gemini_key_to_use:
            for model_name in models_to_try:
                try:
                    logger.info(f"Trying to edit code with Gemini model: {model_name}")
                    
                    client = genai.Client(api_key=gemini_key_to_use)
                    
                    full_prompt = f"""System Instructions: {system_prompt}

Original Manim Code:
```python
{original_code}
```

User's Edit Request: {edit_prompt}

Please provide the complete modified code following all the system instructions above. Return ONLY the modified Python code with no explanations."""
                    
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            {'role': 'user', 'parts': [{'text': full_prompt}]}
                        ]
                    )
                    
                    if response and response.text:
                        code = response.text
                        code = code.replace("```python", "").replace("```", "").strip()
                        
                        title = None
                        lines = code.split('\n')
                        for line in lines:
                            if line.strip().startswith('#') and not line.strip().startswith('#!'):
                                title = line.strip('# ').strip()
                                break
                        
                        if not title:
                            title = "Edited Animation"
                                
                        if 'from manim import' not in code or 'class' not in code or 'Scene' not in code:
                            logger.warning(f"{model_name} generated code missing required elements, trying next model")
                            continue
                        else:    
                            if code:
                                logger.info(f"Successfully edited Manim code with {model_name}")
                                return code, title
                    else:
                        logger.warning(f"{model_name} returned empty response, trying next model")
                        continue
                        
                except Exception as e:
                    logger.error(f"Error with {model_name}: {str(e)}")
                    continue
        
        if 'anthropic_client' in globals() and anthropic_client:
            try:
                logger.info("Editing code with Anthropic Claude")
                
                response = anthropic_client.messages.create(
                    model="claude-3-5-haiku-20241022",  
                    max_tokens=2000,                    
                    temperature=0.1,                    
                    system=system_prompt,               
                    messages=[{
                        "role": "user", 
                        "content": f"Original Manim Code:\n```python\n{original_code}\n```\n\nUser's Edit Request: {edit_prompt}\n\nPlease provide the complete modified code."
                    }]
                )
                
                code = response.content[0].text
                code = code.replace("```python", "").replace("```", "").strip()
                
                title = None
                lines = code.split('\n')
                for line in lines:
                    if line.strip().startswith('#') and not line.strip().startswith('#!'):
                        title = line.strip('# ').strip()
                        break
                
                if not title:
                    title = "Edited Animation"
                        
                if 'from manim import' not in code or 'class' not in code or 'Scene' not in code:
                    logger.warning("Claude generated code missing required elements")
                else:    
                    if code:
                        logger.info("Successfully edited Manim code with Claude")
                        return code, title
                        
            except Exception as e:
                logger.error(f"Error with Anthropic API: {str(e)}")
        
        logger.warning("All AI models failed to edit code, returning original code")
        return original_code, "Edit Failed - Original Code"

    except Exception as e:
        logger.error(f"Error in code editing: {str(e)}")
        return original_code, "Edit Failed - Original Code"

def process_edit_request(job_id: str, code: str, prompt: str, previous_video_url: str = None, previous_video_id: str = None, gemini_api_key: str = None):
    try:
        logger.info(f"Processing edit request: {job_id}, prompt: {prompt}")
        logger.info(f"Previous video URL: {previous_video_url}, Previous video ID: {previous_video_id}")
        
        generation_jobs[job_id] = {
            "status": "processing",
            "edit_prompt": prompt,
            "original_code": code,
            "previous_video_url": previous_video_url,
            "previous_video_id": previous_video_id,
            "created_at": time.time(),
            "gemini_api_key": gemini_api_key
        }
        save_job(job_id, generation_jobs[job_id])
        
        edited_code, title = edit_manim_code(code, prompt, gemini_api_key)
        if not edited_code:
            raise ValueError("Failed to edit Manim code")

        try:
            edited_code = sanitize_manim_code(edited_code)
        except ValueError as e:
            logger.error(f"Code sanitization failed: {str(e)}")
            raise ValueError(f"Edited code is invalid: {str(e)}")
        
        code_file_path = CODE_DIR / f"{job_id}.py"
        with open(code_file_path, "w") as f:
            f.write(edited_code)
        
        generation_jobs[job_id].update({
            "title": title,
            "code": edited_code,
            "status": "rendering"
        })
        save_job(job_id, generation_jobs[job_id])
        
        video_result = create_video(job_id, code_file_path, prompt)
        logger.info(f"Video creation result: {video_result}")
        
        if video_result and isinstance(video_result, dict) and "local_path" in video_result:
            video_path = video_result["local_path"]
            output_path = Path(video_path)
            
            if "s3_url" in video_result:
                video_url = video_result["s3_url"]
                logger.info(f"Using S3 URL from create_video: {video_url}")
            else:
                try:
                    aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
                    aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
                    bucket_name = os.environ.get("S3_BUCKET_NAME")
                    aws_region = os.environ.get("AWS_REGION", "us-east-1")
                    
                    if aws_access_key and aws_secret_key and bucket_name and os.path.exists(output_path):
                        logger.info(f"S3 upload: Credentials found, uploading to bucket {bucket_name}")
                        
                        import boto3
                        s3_client = boto3.client(
                            's3',
                            aws_access_key_id=aws_access_key,
                            aws_secret_access_key=aws_secret_key,
                            region_name=aws_region
                        )
                        
                        prompt_filename = sanitize_filename(prompt)
                        s3_key = f"videos/{prompt_filename}.mp4"
                        logger.info(f"S3 upload: Uploading {output_path} to {bucket_name}/{s3_key}")
                        
                        with open(str(output_path), 'rb') as data:
                            s3_client.put_object(
                                Bucket=bucket_name,
                                Key=s3_key,
                                Body=data,
                                ContentType='video/mp4'
                            )
                        logger.info(f"S3 upload: Direct put_object completed successfully")
                        
                        s3_url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
                        logger.info(f"S3 upload: Success! URL: {s3_url}")
                        video_url = s3_url
                    else:
                        logger.warning(f"S3 upload: AWS credentials not found or file doesn't exist, using local URL")
                        video_url = f"/media/{job_id}.mp4"
                except Exception as e:
                    logger.error(f"S3 upload error: {str(e)}")
                    import traceback
                    logger.error(f"S3 upload error details:\n{traceback.format_exc()}")
                    video_url = f"/media/{job_id}.mp4"
        else:
            logger.error(f"Invalid video result: {video_result}")
            video_url = f"/media/{job_id}.mp4"
            video_path = str(MEDIA_DIR / f"{job_id}.mp4")
            Path(video_path).touch()
        
        logger.info(f"Final video URL: {video_url}")
        generation_jobs[job_id].update({
            "status": "completed",
            "video_url": video_url,
            "video_path": video_path,
            "previous_video_url": previous_video_url,
            "previous_video_id": previous_video_id,
            "completed_at": time.time()
        })
        save_job(job_id, generation_jobs[job_id])
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error processing edit request: {error_message}")
        
        error_type, user_message = categorize_error(error_message)
        
        if 'title' not in locals():
            title = None
            
        if job_id in generation_jobs:
            generation_jobs[job_id].update({
                "status": "failed",
                "error": user_message,
                "error_type": error_type,
                "completed_at": time.time()
            })
        else:
            generation_jobs[job_id] = {
                "status": "failed",
                "created_at": time.time(),
                "edit_prompt": prompt,
                "original_code": code,
                "previous_video_url": previous_video_url,
                "previous_video_id": previous_video_id,
                "error": user_message,
                "error_type": error_type,
                "title": title,
                "gemini_api_key": gemini_api_key
            }
            
        save_job(job_id, generation_jobs[job_id])
        logger.info(f"Edit failed for job {job_id}: {error_type}")

def process_animation_request(job_id: str, prompt: str, gemini_api_key: str = None):
    try:
        logger.info(f"Processing animation request: {job_id}, prompt: {prompt}")
        
        # Update job status to processing
        generation_jobs[job_id] = {
            "status": "processing",
            "prompt": prompt,
            "created_at": time.time(),
            "gemini_api_key": gemini_api_key
        }
        save_job(job_id, generation_jobs[job_id])
        
        # Generate Manim code
        code, title = generate_manim_code(prompt, gemini_api_key)
        if not code:
            raise ValueError("Failed to generate Manim code")

        try:
            code = sanitize_manim_code(code)
        except ValueError as e:
            logger.error(f"Code sanitization failed: {str(e)}")
            raise ValueError(f"Generated code is invalid: {str(e)}")
        
        # Save code to file
        code_file_path = CODE_DIR / f"{job_id}.py"
        with open(code_file_path, "w") as f:
            f.write(code)
        
        # Update job status to rendering
        generation_jobs[job_id].update({
            "title": title,
            "code": code,
            "status": "rendering"
        })
        save_job(job_id, generation_jobs[job_id])
        
        # Check if we have a direct URL from the code generation step
        if "direct_url" in generation_jobs[job_id]:
            # Use the direct URL instead of creating a video
            direct_url = generation_jobs[job_id]["direct_url"]
            logger.info(f"Using direct URL for job {job_id}: {direct_url}")
            video_result = {"local_path": str(MEDIA_DIR / f"{job_id}.mp4"), "s3_url": direct_url}
        else:
            # Create the animation video normally
            video_result = create_video(job_id, code_file_path, prompt)
            logger.info(f"Video creation result: {video_result}")
        
        # Handle video storage (local or S3)
        if video_result and isinstance(video_result, dict) and "local_path" in video_result:
            video_path = video_result["local_path"]
            output_path = Path(video_path)
            
            # Check if S3 URL is already available from create_video
            if "s3_url" in video_result:
                video_url = video_result["s3_url"]
                logger.info(f"Using S3 URL from create_video: {video_url}")
            else:
                # Try to upload to S3 if not already done
                try:
                    # Get AWS credentials from environment variables
                    aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
                    aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
                    bucket_name = os.environ.get("S3_BUCKET_NAME")
                    aws_region = os.environ.get("AWS_REGION", "us-east-1")
                    
                    if aws_access_key and aws_secret_key and bucket_name and os.path.exists(output_path):
                        logger.info(f"S3 upload: Credentials found, uploading to bucket {bucket_name}")
                        
                        # Initialize S3 client
                        import boto3
                        s3_client = boto3.client(
                            's3',
                            aws_access_key_id=aws_access_key,
                            aws_secret_access_key=aws_secret_key,
                            region_name=aws_region
                        )
                        
                        # Create prompt-based filename for S3
                        prompt_filename = sanitize_filename(prompt)
                        s3_key = f"videos/{prompt_filename}.mp4"
                        logger.info(f"S3 upload: Uploading {output_path} to {bucket_name}/{s3_key}")
                        
                        with open(str(output_path), 'rb') as data:
                            s3_client.put_object(
                                Bucket=bucket_name,
                                Key=s3_key,
                                Body=data,
                                ContentType='video/mp4'
                            )
                        logger.info(f"S3 upload: Direct put_object completed successfully")
                        
                        # Generate the URL
                        s3_url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
                        logger.info(f"S3 upload: Success! URL: {s3_url}")
                        video_url = s3_url
                    else:
                        logger.warning(f"S3 upload: AWS credentials not found or file doesn't exist, using local URL")
                        video_url = f"/media/{job_id}.mp4"
                except Exception as e:
                    logger.error(f"S3 upload error: {str(e)}")
                    import traceback
                    logger.error(f"S3 upload error details:\n{traceback.format_exc()}")
                    video_url = f"/media/{job_id}.mp4"
        else:
            logger.error(f"Invalid video result: {video_result}")
            video_url = f"/media/{job_id}.mp4"
            video_path = str(MEDIA_DIR / f"{job_id}.mp4")
            # Create an empty file as a last resort
            Path(video_path).touch()
        
        logger.info(f"Final video URL: {video_url}")
        generation_jobs[job_id].update({
            "status": "completed",
            "video_url": video_url,
            "video_path": video_path,
            "completed_at": time.time()
        })
        save_job(job_id, generation_jobs[job_id])
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error processing animation request: {error_message}")
        
        error_type, user_message = categorize_error(error_message)
        
        if 'title' not in locals():
            title = None
            
        if job_id in generation_jobs:
            generation_jobs[job_id].update({
                "status": "failed",
                "error": user_message,
                "error_type": error_type,
                "completed_at": time.time()
            })
        else:
            generation_jobs[job_id] = {
                "status": "failed",
                "created_at": time.time(),
                "prompt": prompt,
                "error": user_message,
                "error_type": error_type,
                "title": title,
                "gemini_api_key": gemini_api_key
            }
            
        save_job(job_id, generation_jobs[job_id])
        logger.info(f"Animation generation failed for job {job_id}: {error_type}")

def generate_manim_code(prompt: str, gemini_api_key: str = None):
    """Generate Manim code using AI with Gemini first, then Anthropic fallback"""
    try:
        system_prompt = """You are a Manim expert. Generate only Python code for mathematical animations.

Always Remember this:
    You are a Manim expert. Generate only valid Python code for 2D mathematical animations and also some alogorithms using Manim Community Edition.

⚠️ VERY IMPORTANT RULES:
1. DO NOT use `label=` in `axes.plot()` — it causes rendering issues in Manim. All labels must be added manually using `MathTex()` or `Text()` and placed using `.next_to()`.
2. Only use LaTeX that is fully supported by Manim with COMPREHENSIVE LaTeX support including: \\mathrm{}, \\text{}, \\textbf{}, \\textit{}, \\mathbb{}, \\mathcal{}, \\mathfrak{}, \\operatorname{}, \\limits, \\displaystyle, \\scriptstyle, \\scriptscriptstyle, advanced fractions, matrices, integrals, derivatives, and complex mathematical expressions.
3. Full LaTeX package support available: amsmath, amssymb, amsfonts, mathtools, physics, siunitx, and more.
4. Use proper mathematical notation with Greek letters (\\alpha, \\beta, \\gamma, etc.), mathematical operators, and formatting.
5. Support for complex expressions like: \\frac{\\partial^2 f}{\\partial x^2}, \\int_{-\\infty}^{\\infty} e^{-x^2} dx, \\sum_{n=1}^{\\infty} \\frac{1}{n^2}, etc.
6. DO NOT auto-generate labels on axes or plots. Label them manually and position them properly.
7. The dimensions of video must be in accordanfe with landsacpe view: 1920x1080.

✅ STYLE AND STRUCTURE REQUIREMENTS:
- Alway follow latest Manim code not deprecated ones
- Only return valid Python code — no text, explanations, or markdown.
- Start with a comment title (e.g., `# Advanced Calculus Visualization`)
- Use only: `from manim import *`, `import numpy as np`
- Define a class inheriting from `Scene` with a `construct()` method
- Use `config.pixel_height = 720`, `config.pixel_width = 1280`, and `config.frame_width = 14`, `config.frame_height = 8`
- Use `.animate` for property transitions (`self.play(square.animate.move_to(...))`)
- Center visuals with `.center()` or `.move_to(ORIGIN)`
- Keep animations under 20 seconds, memory-efficient, and smooth
- Use only color constants like `BLUE`, `GREEN`, `YELLOW`
- End every scene with `self.wait(1)`
- Never import other packages or modules

🎯 GOAL:
Create clear, comprehensive mathematical animations using full LaTeX support and advanced mathematical notation for professional-quality visualizations.

✅ GOOD EXAMPLE ADVANCED LABELING:
```python
equation = MathTex(r"\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u")
integral_text = MathTex(r"\\int_{-\\infty}^{\\infty} e^{-\\alpha x^2} dx = \\sqrt{\\frac{\\pi}{\\alpha}}")
matrix_eq = MathTex(r"\\mathbf{A} = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}")
```
✅ GOOD PATTERNS:
```python
# Good line creation
line = Line(ORIGIN, RIGHT * 2)

# Good labeling  
equation = MathTex(r"f(x) = x^2")
equation.next_to(graph, UP)

# Good animations
self.play(Create(line))
self.play(line.animate.rotate(PI/2))
```

❌ FORBIDDEN PATTERNS:
```python
# NEVER use these deprecated methods
line.shorten_ends(0.1)  # FORBIDDEN
axes.plot(func, label="f(x)")  # FORBIDDEN  
ShowCreation(line)  # FORBIDDEN
"""

        # Try Gemini 2.5 Pro first, then Flash models
        models_to_try = [
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-1.5-pro'
        ]
        
        gemini_key_to_use = gemini_api_key or os.environ.get("GEMINI_API_KEY")
        if gemini_key_to_use:
            for model_name in models_to_try:
                try:
                    logger.info(f"Trying Gemini model: {model_name}")
                    
                    # Create client with the provided key
                    client = genai.Client(api_key=gemini_key_to_use)
                    
                    # FIXED: Create the user prompt with system instructions included
                    full_prompt = f"""System Instructions: {system_prompt}

User Request: Create a Manim animation that demonstrates: {prompt}

Remember to follow all the system instructions above and generate only valid Python code with no explanations."""
                    
                    # FIXED: Use correct Gemini API format - no system role
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            {'role': 'user', 'parts': [{'text': full_prompt}]}
                        ]
                    )
                    
                    if response and response.text:
                        # Clean the response
                        code = response.text
                        # Remove any markdown code blocks
                        code = code.replace("```python", "").replace("```", "").strip()
                        
                        # Extract title from first comment
                        title = None
                        lines = code.split('\n')
                        for line in lines:
                            if line.strip().startswith('#') and not line.strip().startswith('#!'):
                                title = line.strip('# ').strip()
                                break
                                
                        # Validate code structure
                        if 'from manim import' not in code or 'class' not in code or 'Scene' not in code:
                            logger.warning(f"{model_name} generated code missing required elements, trying next model")
                            continue
                        else:    
                            if code and title:
                                logger.info(f"Successfully generated valid Manim code with {model_name}")
                                return code, title
                    else:
                        logger.warning(f"{model_name} returned empty response, trying next model")
                        continue
                        
                except Exception as e:
                    logger.error(f"Error with {model_name}: {str(e)}")
                    continue
                logger.info("Trying fallback to Anthropic")
        
        # Try to use Anthropic Claude API if available and Gemini failed or isn't available
        if 'anthropic_client' in globals() and anthropic_client:
            try:
                logger.info("Generating code with Anthropic Claude")
                
                response = anthropic_client.messages.create(
                        model="claude-3-5-haiku-20241022",  
                        max_tokens=2000,                    
                        temperature=0.1,                    
                        system=system_prompt,               
                        messages=[{
                            "role": "user", 
                            "content": f"Create a Manim animation that demonstrates: {prompt}"
                        }]
                )
                
                # Clean the response
                code = response.content[0].text
                # Remove any markdown code blocks
                code = code.replace("```python", "").replace("```", "").strip()
                # Extract title from first comment
                title = None
                lines = code.split('\n')
                for line in lines:
                    if line.strip().startswith('#') and not line.strip().startswith('#!'):
                        title = line.strip('# ').strip()
                        break
                        
                # Validate code structure
                if 'from manim import' not in code or 'class' not in code or 'Scene' not in code:
                    logger.warning("Claude generated code missing required elements, using API error fallback")
                else:    
                    if code and title:
                        logger.info("Successfully generated valid Manim code with Claude")
                        return code, title
                        
            except Exception as e:
                logger.error(f"Error with Anthropic API: {str(e)}")
        
        # If we get here, both APIs failed or aren't available
        logger.warning("No working LLM API found, using API error fallback")

        # Fallback to direct URL instead of generating API error demo code
        logger.warning("AI generation failed or not available, using direct API error video URL")
        
        # Instead of generating code, we'll return a dummy code that won't be used
        # The URL will be used directly in the process_animation_request function
        api_error_code = f"""
# Dummy code - not used
from manim import *

class APIErrorDemo(Scene):
    def construct(self):
        # This code won't be executed as we're using a direct URL
        pass
"""
        
        # Update the job to use the direct URL
        job_id = next((k for k, v in generation_jobs.items() if v.get("prompt") == prompt), None)
        if job_id:
            generation_jobs[job_id]["direct_url"] = "https://manim-ai-videos.s3.amazonaws.com/videos/9f13cd36-1399-4ffe-af16-a2f1f9bdbdf7.mp4"
            save_job(job_id, generation_jobs[job_id])
            
        return api_error_code, "API Error Demo"

    except Exception as e:
        logger.error(f"Error in code generation: {str(e)}")
        
        # Use direct URL instead of API error demo code
        logger.warning("Exception occurred, using direct API error video URL")
        
        # Create minimal dummy code that won't be used
        api_error_code = f"""
# Dummy code - not used
from manim import *

class APIErrorDemo(Scene):
    def construct(self):
        # This code won't be executed as we're using a direct URL
        pass
"""
        
        # Update the job to use the direct URL if possible
        job_id = next((k for k, v in generation_jobs.items() if v.get("prompt") == prompt), None)
        if job_id:
            generation_jobs[job_id]["direct_url"] = "https://manim-ai-videos.s3.amazonaws.com/videos/9f13cd36-1399-4ffe-af16-a2f1f9bdbdf7.mp4"
            save_job(job_id, generation_jobs[job_id])
            
        return api_error_code, "API Error Demo"

# No demo code constants needed as we're using the API error demo code directly in the generate_manim_code function

def detect_scene_class(code_file_path: Path):
    try:
        with open(code_file_path, "r") as f:
            code = f.read()
        
        scene_classes = re.findall(r'class\s+([\w_]+)\s*\(\s*(?:manim\.)?Scene\s*\)', code)
        if scene_classes:
            return scene_classes[0]
            
        lines = code.split("\n")
        for line in lines:
            if "class" in line and "Scene" in line:
                parts = line.split("class ")[1].split("(")
                if len(parts) > 0:
                    class_name = parts[0].strip()
                    return class_name
        
        all_classes = re.findall(r'class\s+([\w_]+)', code)
        if all_classes:
            logger.warning(f"Could not find Scene class, using first class found: {all_classes[0]}")
            return all_classes[0]
            
        return None
    except Exception as e:
        logger.error(f"Error detecting scene class: {str(e)}")
        return None

def create_video(job_id: str, code_file_path: Path, prompt: str):
    try:
        output_path = MEDIA_DIR / f"{job_id}.mp4"
        scene_class = detect_scene_class(code_file_path)
        if not scene_class:
            raise ValueError("Could not detect Scene class in the code")

        # Create a valid module name from the job_id
        module_name = f"manim_scene_{job_id.replace('-', '_')}"
        
        # Copy the original code file with a valid module name
        module_path = code_file_path.parent / f"{module_name}.py"
        shutil.copy(code_file_path, module_path)

        # Create runner script with proper imports and resource optimization
        runner_script = f'''
import os
import sys
import platform

# Add MiKTeX to PATH on Windows (fix for LaTeX rendering)
if platform.system() == "Windows":
    miktex_path = r"C:\\Users\\harsh\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64"
    if os.path.exists(miktex_path) and miktex_path not in os.environ.get("PATH", ""):
        os.environ["PATH"] = miktex_path + os.pathsep + os.environ.get("PATH", "")

from manim import *
import numpy as np

# Add the code directory to Python path
sys.path.append(os.path.dirname(__file__))

# Import the scene module
from {module_name} import {scene_class}

# Configure Manim with resource optimization for Railway
config.media_dir = "{str(MEDIA_DIR)}"
config.video_dir = "{str(MEDIA_DIR)}"
config.output_file = "{job_id}"
config.frame_rate = 24  # Reduced from 30 for performance
config.pixel_height = 720
config.pixel_width = 1280
config.frame_width = 14
config.frame_height = 8

# Memory optimization settings
config.max_files_cached = 10
config.flush_cache = True

# Render the scene
try:
    scene = {scene_class}()
    scene.render()
    print("Rendering completed successfully")
except Exception as e:
    print(f"Rendering error: {{e}}")
    raise e
'''
        runner_path = code_file_path.parent / f"run_{job_id}.py"
        with open(runner_path, "w") as f:
            f.write(runner_script)

        # Run the script in a separate process with timeout and resource limits
        popen_kwargs = {
            'stdout': subprocess.PIPE,
            'stderr': subprocess.PIPE,
            'text': True
        }

        # Platform-specific process configuration
        if sys.platform == 'win32':
            popen_kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
        else:
            # On Unix-like systems, start process in new session
            import os
            popen_kwargs['preexec_fn'] = os.setsid
            
        process = subprocess.Popen(
            [sys.executable, str(runner_path)],
            **popen_kwargs
        )

        try:
            # Reduced timeout for Railway resource optimization
            stdout, stderr = process.communicate(timeout=90)  # 90 seconds timeout
            logger.info(f"Process stdout: {stdout}")
            if stderr:
                logger.error(f"Process stderr: {stderr}")

            if process.returncode != 0:
                raise Exception(f"Render failed with code {process.returncode}: {stderr}")

        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()  # Ensure process is fully terminated
            raise Exception("Animation render timed out after 90 seconds")

        finally:
            # Cleanup temporary files immediately to save memory
            try:
                runner_path.unlink(missing_ok=True)
                module_path.unlink(missing_ok=True)
            except Exception as e:
                logger.error(f"Error cleaning up temp files: {e}")

        # Check for output video
        video_files = list(MEDIA_DIR.glob(f"*{job_id}*.mp4"))
        if video_files:
            output_path = video_files[0]
            logger.info(f"Found rendered video at {output_path}")
            
            # Try S3 upload if enabled
            if s3_storage.is_enabled:
                logger.info(f"Attempting to upload video to S3: {output_path}")
                prompt_filename = sanitize_filename(prompt)
                s3_key = f"videos/{prompt_filename}.mp4"
                s3_url = s3_storage.upload_file(str(output_path), s3_key)
                logger.info(f"S3 upload result: {s3_url}")
                if s3_url:
                    # Delete local file after successful S3 upload to save space
                    try:
                        output_path.unlink()
                        logger.info(f"Deleted local file after S3 upload: {output_path}")
                    except Exception as e:
                        logger.warning(f"Could not delete local file: {e}")
                    return {"local_path": str(output_path), "s3_url": s3_url}
            else:
                logger.info("S3 storage is not enabled, using local storage only")
            
            return {"local_path": str(output_path)}

        raise FileNotFoundError("No video file was generated")

    except Exception as e:
        logger.error(f"Error creating video: {str(e)}")
        raise Exception(f"Video rendering failed: {str(e)}")

def create_dummy_video(job_id: str, error_message: str, prompt: str):
    """Create a simple error video with minimal resource usage"""
    try:
        dummy_video_path = MEDIA_DIR / f"{job_id}.mp4"
        
        # Create a minimal Manim scene for the error message
        error_scene_code = f'''# Error Display Animation
from manim import *

config.pixel_height = 720
config.pixel_width = 1280
config.frame_rate = 24

class ErrorScene(Scene):
    def construct(self):
        # Title
        title = Text("Rendering Error", font_size=48, color=RED)
        title.to_edge(UP)
        
        # Error message (truncated for display)
        error_text = "{error_message[:80]}..." if len("{error_message}") > 80 else "{error_message}"
        error = Text(error_text, font_size=24, color=YELLOW)
        error.center()
        
        # Simple animation
        self.play(Write(title))
        self.wait(0.5)
        self.play(Write(error))
        self.wait(2)
        self.play(FadeOut(title), FadeOut(error))
        self.wait(0.5)
'''
        
        # Write and render the error scene
        error_file_path = CODE_DIR / f"error_{job_id}.py"
        with open(error_file_path, "w") as f:
            f.write(error_scene_code)
        
        # Try to render the error scene
        try:
            video_result = create_video_direct(job_id, error_file_path, f"Error: {error_message}")
            if video_result and isinstance(video_result, dict):
                return video_result
        except Exception as e:
            logger.error(f"Failed to create error video: {str(e)}")
        
        # Final fallback - create empty file and use direct URL
        dummy_video_path.touch()
        return {
            "local_path": str(dummy_video_path), 
            "s3_url": "https://manim-ai-videos.s3.amazonaws.com/videos/Create_a_video_saying_Gemini_API_Error_Please_try__ac101d18.mp4"
        }
            
    except Exception as e:
        logger.error(f"Failed to create dummy video: {str(e)}")
        dummy_video_path = MEDIA_DIR / f"{job_id}.mp4"
        dummy_video_path.touch()
        return {
            "local_path": str(dummy_video_path), 
            "s3_url": "https://manim-ai-videos.s3.amazonaws.com/videos/Create_a_video_saying_Gemini_API_Error_Please_try__ac101d18.mp4"
        }

def create_video_direct(job_id: str, code_file_path: Path, prompt: str):
    """Direct video creation without recursion for error handling"""
    try:
        output_path = MEDIA_DIR / f"error_{job_id}.mp4"
        scene_class = detect_scene_class(code_file_path)
        if not scene_class:
            scene_class = "ErrorScene"  # Default for error videos

        # Create minimal runner for error video
        runner_script = f'''
import os
import sys
import platform

# Add MiKTeX to PATH on Windows (fix for LaTeX rendering)
if platform.system() == "Windows":
    miktex_path = r"C:\\Users\\harsh\\AppData\\Local\\Programs\\MiKTeX\\miktex\\bin\\x64"
    if os.path.exists(miktex_path) and miktex_path not in os.environ.get("PATH", ""):
        os.environ["PATH"] = miktex_path + os.pathsep + os.environ.get("PATH", "")

from manim import *

sys.path.append(os.path.dirname(__file__))
from error_{job_id} import {scene_class}

config.media_dir = "{str(MEDIA_DIR)}"
config.video_dir = "{str(MEDIA_DIR)}"
config.output_file = "error_{job_id}"
config.frame_rate = 24
config.pixel_height = 720
config.pixel_width = 1280

scene = {scene_class}()
scene.render()
'''
        
        runner_path = code_file_path.parent / f"run_error_{job_id}.py"
        with open(runner_path, "w") as f:
            f.write(runner_script)

        # Quick render with short timeout
        process = subprocess.Popen(
            [sys.executable, str(runner_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        try:
            stdout, stderr = process.communicate(timeout=30)  # Short timeout for error videos
            if process.returncode == 0:
                error_videos = list(MEDIA_DIR.glob(f"*error_{job_id}*.mp4"))
                if error_videos:
                    return {"local_path": str(error_videos[0])}
        except subprocess.TimeoutExpired:
            process.kill()
            
        finally:
            # Cleanup
            try:
                runner_path.unlink(missing_ok=True)
            except:
                pass

        return None
        
    except Exception as e:
        logger.error(f"Error in create_video_direct: {str(e)}")
        return None

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
