from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel
from s3_storage import S3Storage

from anthropic import Anthropic
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

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="VisuaMath Forge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_api_key:
        anthropic_client = Anthropic(api_key=anthropic_api_key)
        logger.info("Anthropic client initialized successfully")
    else:
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if groq_api_key:
            import groq
            groq_client = groq.Client(api_key=groq_api_key)
            logger.info("Groq client initialized successfully")
            anthropic_client = None
        else:
            logger.warning("No API keys found for LLM services")
            anthropic_client = None
            groq_client = None
except Exception as e:
    logger.error(f"Error initializing LLM clients: {e}")
    anthropic_client = None
    groq_client = None

DEV_MODE = os.environ.get("DEV_MODE", "0") == "1"
if DEV_MODE:
    logger.info("Running in development mode")

class PromptRequest(BaseModel):
    prompt: str

class ManimGenerationResponse(BaseModel):
    id: str
    status: str
    video_url: str = None
    title: str = None
    error: str = None

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

@app.get("/")
def read_root():
    return {"message": "Welcome to VisuaMath Forge API"}

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
        "prompt": request.prompt
    }
    generation_jobs[job_id] = job_data
    save_job(job_id, job_data)

    try:
        background_tasks.add_task(
            process_animation_request, 
            job_id=job_id, 
            prompt=request.prompt
        )
        return ManimGenerationResponse(
            id=job_id,
            status="processing"
        )
    except Exception as e:
        error_message = f"Failed to start animation task: {str(e)}"
        logger.error(error_message)
        
        job_data = {
            "status": "failed",
            "created_at": time.time(),
            "prompt": request.prompt,
            "error": error_message
        }
        
        generation_jobs[job_id] = job_data
        save_job(job_id, job_data)
        
        return ManimGenerationResponse(
            id=job_id,
            status="failed",
            error=error_message
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
        if "error" in job:
            response.error = job["error"]
            
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

def process_animation_request(job_id: str, prompt: str):
    try:
        logger.info(f"Processing animation request for job {job_id}")
        
        generation_jobs[job_id] = {
            "status": "processing",
            "created_at": time.time(),
            "prompt": prompt
        }
        save_job(job_id, generation_jobs[job_id])
        
        code, title = generate_manim_code(prompt)
        
        if not code:
            raise ValueError("Failed to generate Manim code")
        
        code_file_path = CODE_DIR / f"{job_id}.py"
        with open(code_file_path, "w") as f:
            f.write(code)
        
        generation_jobs[job_id].update({
            "title": title,
            "status": "rendering"
        })
        save_job(job_id, generation_jobs[job_id])
        
        video_result = create_video(job_id, code_file_path)
        
        output_path = MEDIA_DIR / f"{job_id}.mp4"
        if os.path.exists(output_path):
            try:
                # Get AWS credentials from environment variables
                aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
                aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
                bucket_name = os.environ.get("S3_BUCKET_NAME")
                aws_region = os.environ.get("AWS_REGION", "us-east-1")
                
                if aws_access_key and aws_secret_key and bucket_name:
                    logger.info(f"S3 upload: Credentials found, uploading to bucket {bucket_name}")
                    
                    # Initialize S3 client directly (exactly like test.py)
                    import boto3
                    s3_client = boto3.client(
                        's3',
                        aws_access_key_id=aws_access_key,
                        aws_secret_access_key=aws_secret_key,
                        region_name=aws_region
                    )
                    
                    # Upload the file using a more direct approach
                    s3_key = f"videos/{job_id}.mp4"
                    logger.info(f"S3 upload: Uploading {output_path} to {bucket_name}/{s3_key}")
                    
                    # Use a more direct approach with the low-level client
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
                    video_path = str(output_path)
                else:
                    logger.warning(f"S3 upload: AWS credentials not found, using local URL")
                    video_url = f"/media/{job_id}.mp4"
                    video_path = str(output_path)
            except Exception as e:
                logger.error(f"S3 upload error: {str(e)}")
                import traceback
                logger.error(f"S3 upload error details:\n{traceback.format_exc()}")
                video_url = f"/media/{job_id}.mp4"
                video_path = str(output_path)
        else:
            video_url = f"/media/{job_id}.mp4"
            video_path = video_result["local_path"] if isinstance(video_result, dict) else str(video_result)
        
        logger.info(f"Final video URL: {video_url}")
        generation_jobs[job_id].update({
            "status": "completed",
            "video_url": video_url,
            "video_path": video_path,
            "completed_at": time.time()
        })
        save_job(job_id, generation_jobs[job_id])
        
        logger.info(f"Animation generation completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Error processing animation for job {job_id}: {str(e)}")
        
        error_data = {
            "status": "failed",
            "error": str(e)
        }
        
        if job_id in generation_jobs:
            generation_jobs[job_id].update(error_data)
        else:
            generation_jobs[job_id] = {
                "status": "failed",
                "created_at": time.time(),
                "prompt": prompt,
                "error": str(e),
                "title": title if 'title' in locals() else None
            }
            
        save_job(job_id, generation_jobs[job_id])

def generate_manim_code(prompt: str):
    """Generate Manim code using AI with fallback to API error demo"""
    try:
        system_prompt = """You are a Manim expert. Generate ONLY valid Python code for Manim mathematical animations. NO explanations or markdown - ONLY code.
        
        Requirements:
        1. Start with a comment containing a descriptive title
        2. Include 'from manim import *'
        3. Define a class that inherits from Scene
        4. Implement a detailed construct() method with multiple animations
        5. Use proper colors, positioning, and timing
        6. Include helpful comments explaining each section
        7. Create visually appealing animations with smooth transitions
        8. Keep animations between 5-15 seconds total
        9. Use appropriate mathematical notation when needed
        10. Ensure code is complete and runnable without modifications
        
        Example format:
        # Dynamic Wave Function Visualization
        from manim import *
        
        class WaveFunction(Scene):
            def construct(self):
                # Create axes
                axes = Axes(
                    x_range=[-3, 3, 1],
                    y_range=[-1.5, 1.5, 0.5],
                    axis_config={"color": BLUE},
                )
                
                # Create wave function
                def func(x):
                    return np.sin(x)
                
                # Plot the wave
                graph = axes.plot(func, color=YELLOW)
                
                # Add labels
                labels = axes.get_axis_labels(x_label="x", y_label="sin(x)")
                
                # Create animation
                self.play(Create(axes), Create(labels))
                self.wait(0.5)
                self.play(Create(graph))
                self.wait(1)
        """

        # Try to use Anthropic Claude API if available
        if 'anthropic_client' in globals() and anthropic_client:
            logger.info("Generating code with Anthropic Claude")
            
            response = anthropic_client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=4000,
                temperature=0.2,
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
                logger.warning("Claude generated code missing required elements, trying Groq or fallback")
            else:    
                if code and title:
                    logger.info("Successfully generated valid Manim code with Claude")
                    return code, title
        
        # Try to use Groq API if available and Claude failed or isn't available
        if 'groq_client' in globals() and groq_client:
            logger.info("Generating code with Groq")
            
            response = groq_client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Create a Manim animation that demonstrates: {prompt}"}
                ],
                temperature=0.2,
                max_tokens=4000
            )
            
            # Clean the response
            code = response.choices[0].message.content
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
                logger.warning("Groq generated code missing required elements, using API error fallback")
            else:
                if code and title:
                    logger.info("Successfully generated valid Manim code with Groq")
                    return code, title
        
        # If we get here, both APIs failed or aren't available
        logger.warning("No working LLM API found, using API error fallback")


        # Fallback to API error demo code if AI generation fails
        logger.warning("AI generation failed or not available, using API error demo code")
        
        # Create API error demo code
        api_error_code = f"""
# API key exhausted or error occurred
from manim import *

class APIErrorDemo(Scene):
    def construct(self):
        # Create a title
        title = Text("API Credits Exhausted", font_size=48)
        title.to_edge(UP)
        
        # Create explanation text
        explanation = Text(
            "The Anthropic API credits are currently exhausted.", 
            font_size=24
        )
        contact = Text(
            "Contact @ithp7 on Twitter or clone the GitHub project.",
            font_size=24
        )
        
        explanation.next_to(title, DOWN, buff=1)
        contact.next_to(explanation, DOWN, buff=0.5)
        
        # Create the animation
        self.play(Write(title))
        self.wait(0.5)
        self.play(FadeIn(explanation))
        self.wait(0.5)
        self.play(FadeIn(contact))
        self.wait(2)
        
        # Add a note about the prompt
        prompt_text = Text(f"Your prompt was: {prompt}", font_size=18, color=BLUE)
        prompt_text.to_edge(DOWN, buff=1)
        self.play(Write(prompt_text))
        self.wait(1)
"""
        
        return api_error_code, "API Error Demo"

    except Exception as e:
        logger.error(f"Error in code generation: {str(e)}")
        
        # Use the same API error demo code as defined above
        logger.warning("Exception occurred, using API error demo code")
        
        # Create API error demo code
        api_error_code = f"""
# API key exhausted or error occurred
from manim import *

class APIErrorDemo(Scene):
    def construct(self):
        # Create a title
        title = Text("API Credits Exhausted", font_size=48)
        title.to_edge(UP)
        
        # Create explanation text
        explanation = Text(
            "The Anthropic API credits are currently exhausted.", 
            font_size=24
        )
        contact = Text(
            "Contact @ithp7 on Twitter or clone the GitHub project.",
            font_size=24
        )
        
        explanation.next_to(title, DOWN, buff=1)
        contact.next_to(explanation, DOWN, buff=0.5)
        
        # Create the animation
        self.play(Write(title))
        self.wait(0.5)
        self.play(FadeIn(explanation))
        self.wait(0.5)
        self.play(FadeIn(contact))
        self.wait(2)
        
        # Add a note about the prompt
        prompt_text = Text(f"Your prompt was: {prompt}", font_size=18, color=BLUE)
        prompt_text.to_edge(DOWN, buff=1)
        self.play(Write(prompt_text))
        self.wait(1)
"""
        
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

def create_video(job_id: str, code_file_path: Path):
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

        # Create runner script with proper imports
        runner_script = f'''
from manim import *
import sys
import os

# Add the code directory to Python path
sys.path.append(os.path.dirname(__file__))

# Import the scene module
from {module_name} import {scene_class}

# Configure Manim
config.media_dir = "{str(MEDIA_DIR)}"
config.video_dir = "{str(MEDIA_DIR)}"
config.output_file = "{job_id}"
config.frame_rate = 30
config.pixel_height = 720
config.pixel_width = 1280

# Render the scene
scene = {scene_class}()
scene.render()
'''
        runner_path = code_file_path.parent / f"run_{job_id}.py"
        with open(runner_path, "w") as f:
            f.write(runner_script)

        # Run the script in a separate process with timeout
        process = subprocess.Popen(
            [sys.executable, str(runner_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW  # Windows only
        )

        try:
            stdout, stderr = process.communicate(timeout=120)  # 2 minute timeout
            logger.info(f"Process stdout: {stdout}")
            if stderr:
                logger.error(f"Process stderr: {stderr}")

            if process.returncode != 0:
                raise Exception(f"Render failed: {stderr}")

        except subprocess.TimeoutExpired:
            process.kill()
            raise Exception("Animation render timed out after 120 seconds")

        finally:
            # Cleanup temporary files
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
            
            # Debug S3 storage status
            logger.info(f"S3 storage enabled in create_video: {s3_storage.is_enabled}")
            logger.info(f"S3 bucket name in create_video: {s3_storage.bucket_name}")
            
            # If S3 is enabled, upload the video
            if s3_storage.is_enabled:
                logger.info(f"Attempting to upload video to S3: {output_path}")
                s3_key = f"videos/{job_id}.mp4"
                s3_url = s3_storage.upload_file(str(output_path), s3_key)
                logger.info(f"S3 upload result: {s3_url}")
                if s3_url:
                    # Store both local path and S3 URL
                    logger.info(f"Returning S3 URL: {s3_url}")
                    return {"local_path": str(output_path), "s3_url": s3_url}
            else:
                logger.info("S3 storage is not enabled, using local storage only")
            
            return {"local_path": str(output_path)}

        raise FileNotFoundError("No video file was generated")

    except Exception as e:
        logger.error(f"Error creating video: {str(e)}")
        return create_dummy_video(job_id, str(e))

def create_dummy_video(job_id: str, error_message: str):
    dummy_video_path = MEDIA_DIR / f"{job_id}.mp4"
    try:
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=rgb(25,25,40):s=1280x720:d=10",
            "-vf", f"drawtext=text='Error Creating Animation':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=100,drawtext=text='{error_message}':fontcolor=red:fontsize=24:x=(w-text_w)/2:y=200",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dummy_video_path)
        ]
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
        return dummy_video_path
    except Exception:
        dummy_video_path.touch()
        return dummy_video_path

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)