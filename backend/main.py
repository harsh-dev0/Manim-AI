from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import anthropic
import os
import subprocess
import uuid
import logging
from pathlib import Path
import shutil
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="VisuaMath Forge API")

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for storing files
BASE_DIR = Path("./outputs")
CODE_DIR = BASE_DIR / "code"
MEDIA_DIR = BASE_DIR / "media"

# Ensure directories exist
CODE_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Mount the media directory to serve videos
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# Initialize Claude client (requires API key)
try:
    claude_client = anthropic.Anthropic(
        api_key=os.environ.get("ANTHROPIC_API_KEY")
    )
    logger.info("Claude client initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Claude client: {e}")
    raise

# Pydantic models for request/response
class PromptRequest(BaseModel):
    prompt: str

class ManimGenerationResponse(BaseModel):
    id: str
    status: str
    video_url: str = None
    code: str = None
    title: str = None
    error: str = None

# In-memory storage for job status
generation_jobs = {}

@app.get("/")
def read_root():
    return {"message": "VisuaMath Forge API is running"}

@app.post("/generate", response_model=ManimGenerationResponse)
async def generate_animation(request: PromptRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    generation_jobs[job_id] = {
        "status": "processing",
        "created_at": time.time()
    }
    
    # Add the task to background processing
    background_tasks.add_task(
        process_animation_request, 
        job_id=job_id, 
        prompt=request.prompt
    )
    
    # Return immediate response with job ID
    return ManimGenerationResponse(
        id=job_id,
        status="processing"
    )

@app.get("/status/{job_id}", response_model=ManimGenerationResponse)
async def get_job_status(job_id: str):
    if job_id not in generation_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = generation_jobs[job_id]
    
    return ManimGenerationResponse(
        id=job_id,
        status=job.get("status", "unknown"),
        video_url=job.get("video_url"),
        code=job.get("code"),
        title=job.get("title"),
        error=job.get("error")
    )

@app.get("/download/{job_id}")
async def download_video(job_id: str):
    if job_id not in generation_jobs or generation_jobs[job_id].get("status") != "completed":
        raise HTTPException(status_code=404, detail="Video not found or not ready")
    
    video_path = generation_jobs[job_id].get("video_path")
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        path=video_path, 
        filename=f"animation_{job_id}.mp4", 
        media_type="video/mp4"
    )

# Cleanup old jobs - this would ideally be run by a scheduled task
@app.on_event("startup")
def setup_periodic_cleanup():
    # Here you'd set up a background task to clean up old jobs
    # For simplicity, we'll just ensure the directories exist
    CODE_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Main function to process the animation request
async def process_animation_request(job_id: str, prompt: str):
    try:
        # Step 1: Generate Manim code using Claude
        code, title = await generate_manim_code(prompt)
        
        # Save the generated code
        code_file_path = CODE_DIR / f"{job_id}.py"
        with open(code_file_path, "w") as f:
            f.write(code)
        
        # Update job status
        generation_jobs[job_id]["code"] = code
        generation_jobs[job_id]["title"] = title
        
        # Step 2: Run Manim to generate the animation
        output_file = await run_manim(job_id, code_file_path)
        
        # Step 3: Update job with the result
        video_url = f"/media/{output_file.name}"
        video_path = str(output_file)
        
        generation_jobs[job_id].update({
            "status": "completed",
            "video_url": video_url,
            "video_path": video_path
        })
        
        logger.info(f"Job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {str(e)}")
        generation_jobs[job_id].update({
            "status": "failed",
            "error": str(e)
        })

async def generate_manim_code(prompt: str):
    """Generate Manim code using Claude API"""
    try:
        logger.info(f"Sending prompt to Claude: {prompt}")
        
        # Construct the system prompt for Claude
        system_prompt = """
        You are a mathematical animation creator specialized in Manim (Mathematical Animation Engine).
        Based on the user's request, generate Python code using the Manim library that creates a mathematical animation.
        
        Follow these guidelines:
        1. Use Manim CE (Community Edition) syntax and features
        2. Focus on clarity and educational value of the animation
        3. Include helpful comments in the code
        4. Make sure the animations are not too long or complex
        5. Use appropriate colors, labels, and visual elements
        6. Return only valid, importable Manim code that can be executed directly
        7. Verify imports, proper Scene class, and construct method
        8. Ensure all animation elements are properly rendered and visible
        9. Include a relevant title for the animation
        
        The code should be a complete Python script ready to be executed with Manim CE.
        """
        
        # Construct the user prompt
        user_prompt = f"Create a Manim animation for the following: {prompt}\n\nPlease provide just the Python code that I can save as a .py file and run with Manim CE. Also include a short title for this animation."
        
        # Make the API call to Claude
        response = claude_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        
        # Extract the code from the response
        content = response.content[0].text
        
        # Parse the content to separate code and title
        if "```python" in content:
            # Extract code from markdown code block
            code_block = content.split("```python")[1].split("```")[0].strip()
            code = code_block
        else:
            # If no markdown formatting, use the entire content
            code = content
        
        # Extract or create a title
        title_line = None
        for line in content.split("\n"):
            if "title" in line.lower() or "animation" in line.lower():
                title_line = line
                break
        
        if title_line:
            title = title_line.split(":")[-1].strip() if ":" in title_line else title_line.strip()
        else:
            # Default title if none provided
            title = f"Mathematical Animation for: {prompt[:30]}..."
        
        return code, title
        
    except Exception as e:
        logger.error(f"Error generating Manim code: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate animation code: {str(e)}"
        )

async def run_manim(job_id: str, code_file_path: Path):
    """Run Manim on the generated code file and return the output video file path"""
    try:
        logger.info(f"Running Manim for job {job_id}")
        
        # Directory for this job's output
        job_output_dir = MEDIA_DIR / job_id
        job_output_dir.mkdir(exist_ok=True)
        
        # Detect the scene class name from the code
        scene_class = detect_scene_class(code_file_path)
        if not scene_class:
            raise ValueError("Could not detect Scene class in the generated code")
        
        # Build the Manim command
        command = [
            "manim",
            str(code_file_path),
            scene_class,
            "-qm",  # Medium quality
            "--media_dir", str(job_output_dir)
        ]
        
        # Run Manim command
        logger.info(f"Executing command: {' '.join(command)}")
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate()
        
        # Check if successful
        if process.returncode != 0:
            logger.error(f"Manim execution failed: {stderr}")
            raise ValueError(f"Manim execution failed: {stderr}")
        
        logger.info(f"Manim output: {stdout}")
        
        # Find the generated video file
        video_files = list(job_output_dir.glob("**/*.mp4"))
        if not video_files:
            raise FileNotFoundError("No video files were generated by Manim")
        
        # Get the first video file (should be only one)
        video_file = video_files[0]
        
        # Copy to a standardized location
        output_file = MEDIA_DIR / f"{job_id}.mp4"
        shutil.copy(video_file, output_file)
        
        return output_file
        
    except Exception as e:
        logger.error(f"Error running Manim: {str(e)}")
        raise

def detect_scene_class(code_file_path: Path):
    """Parse the Python file to detect the Scene class name"""
    with open(code_file_path, "r") as f:
        code = f.read()
    
    # Simple parsing to find class that extends Scene
    lines = code.split("\n")
    for line in lines:
        if "class" in line and "Scene" in line:
            # Extract class name, assuming format "class ClassName(Scene):"
            class_name = line.split("class ")[1].split("(")[0].strip()
            return class_name
    
    return None

# Main entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)