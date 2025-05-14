from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from groq import Groq  # Import Groq client instead of Anthropic
import os
import subprocess
import uuid
import logging
from pathlib import Path

# Load environment variables from .env file

import shutil
import time
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="VisuaMath Forge API")

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories for storing files
BASE_DIR = Path("./outputs")
CODE_DIR = BASE_DIR / "code"
MEDIA_DIR = BASE_DIR / "media"
JOB_DIR = BASE_DIR / "jobs"  # New directory for job data persistence

# Ensure directories exist
CODE_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
JOB_DIR.mkdir(parents=True, exist_ok=True)  # Create jobs directory

# Mount the media directory to serve videos
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# Initialize Groq client (requires API key)
try:
    groq_client = Groq(
        api_key=os.environ.get("GROQ_API_KEY")
    )
    logger.info("Groq client initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Groq client: {e}")
    groq_client = None  # Allow startup without Groq for development

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

# In-memory storage for job status with persistence
generation_jobs = {}

# Load existing jobs from disk
def load_jobs():
    try:
        job_files = list(JOB_DIR.glob("*.json"))
        for job_file in job_files:
            try:
                with open(job_file, "r") as f:
                    job_data = json.load(f)
                    job_id = job_file.stem  # Use filename (without extension) as job ID
                    generation_jobs[job_id] = job_data
                    logger.info(f"Loaded job {job_id} from disk")
            except Exception as e:
                logger.error(f"Error loading job file {job_file}: {e}")
    except Exception as e:
        logger.error(f"Error loading jobs: {e}")

# Save job data to disk
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
    return {"message": "VisuaMath Forge API is running"}

@app.post("/generate", response_model=ManimGenerationResponse)
async def generate_animation(request: PromptRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    
    # Initialize job status
    job_data = {
        "status": "processing",
        "created_at": time.time()
    }
    
    # Store in memory and on disk
    generation_jobs[job_id] = job_data
    save_job(job_id, job_data)
    
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
    try:
        # Debug log for tracking status requests
        logger.info(f"Status check requested for job: {job_id}")
        
        # Log all current jobs for debugging
        logger.info(f"Current jobs in memory: {list(generation_jobs.keys())}")
        
        # Check if job exists in memory, if not try to load from disk
        if job_id not in generation_jobs:
            # Try to load from disk as a fallback
            job_file = JOB_DIR / f"{job_id}.json"
            if job_file.exists():
                try:
                    with open(job_file, "r") as f:
                        generation_jobs[job_id] = json.load(f)
                        logger.info(f"Loaded job {job_id} from disk on demand")
                except Exception as e:
                    logger.error(f"Error loading job {job_id} from disk: {e}")
        
        # If still not found, return 404
        if job_id not in generation_jobs:
            logger.error(f"Job not found: {job_id}")
            return JSONResponse(
                status_code=404,
                content={"detail": "Job not found", "id": job_id, "status": "not_found"}
            )
        
        job = generation_jobs[job_id]
        
        # Ensure all fields are properly handled to avoid 500 errors
        response = ManimGenerationResponse(
            id=job_id,
            status=job.get("status", "unknown")
        )
        
        # Only set optional fields if they exist in the job data
        if "video_url" in job:
            response.video_url = job["video_url"]
        if "code" in job:
            response.code = job["code"]
        if "title" in job:
            response.title = job["title"]
        if "error" in job:
            response.error = job["error"]
            
        return response
    except Exception as e:
        # Catch any unexpected errors to prevent 500 responses
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
    # Load existing jobs from disk
    load_jobs()
    
    # Here you'd set up a background task to clean up old jobs
    # For simplicity, we'll just ensure the directories exist
    CODE_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    JOB_DIR.mkdir(parents=True, exist_ok=True)

# Main function to process the animation request
async def process_animation_request(job_id: str, prompt: str):
    try:
        # Step 1: Generate Manim code using Groq
        code, title = await generate_manim_code(prompt)
        
        # Save the generated code
        code_file_path = CODE_DIR / f"{job_id}.py"
        with open(code_file_path, "w") as f:
            f.write(code)
        
        # Update job status
        generation_jobs[job_id]["code"] = code
        generation_jobs[job_id]["title"] = title
        save_job(job_id, generation_jobs[job_id])  # Save to disk
        
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
        
        # Save updated job status to disk
        save_job(job_id, generation_jobs[job_id])
        
        logger.info(f"Job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {str(e)}")
        generation_jobs[job_id].update({
            "status": "failed",
            "error": str(e)
        })
        
        # Save failed status to disk
        save_job(job_id, generation_jobs[job_id])

async def generate_manim_code(prompt: str):
    """Generate Manim code using Groq API"""
    try:
        logger.info(f"Sending prompt to Groq: {prompt}")
        
        # Construct the system prompt for Groq
        system_prompt = """
          You are a 2D animation creator specialized in Manim (Mathematical Animation Engine).
            Based on the user's request, generate Python code using the Manim library that creates a visual animation.
            
            Follow these guidelines:
            1. Use Manim CE (Community Edition) syntax and features
            2. Focus on making a visually appealing 2D animation - NOT a math equation visualization
            3. Include helpful comments in the code
            4. Make sure the animations look good and are smooth
            5. Use appropriate colors, shapes, and visual elements
            6. Return only valid, importable Manim code that can be executed directly
            7. Include a relevant title for the animation
            8. Always end the animation with self.wait(2) to ensure it displays properly
            9. Use a variety of animation techniques like FadeIn, Write, Create, etc.
            10. Don't just focus on mathematical concepts - be creative with visual storytelling
            
            The code should be a complete Python script ready to be executed with Manim CE.
        """
        
        # Construct the user prompt
        user_prompt = f"Create a Manim animation for the following: {prompt}\n\nPlease provide just the Python code that I can save as a .py file and run with Manim CE. Also include a short title for this animation."
        
        # Check if Groq client is available
        if not groq_client:
            # For development without Groq API key, return dummy code
            logger.warning("No Groq client available, returning dummy code")
            code = """
from manim import *

class DummyAnimation(Scene):
    def construct(self):
        title = Text("Demo Animation")
        self.play(Write(title))
        self.wait()
        
        # Create a circle
        circle = Circle(radius=2, color=BLUE)
        self.play(Create(circle))
        self.wait()
        
        # Add text
        text = Text("Test Animation", color=WHITE).next_to(circle, DOWN)
        self.play(Write(text))
        self.wait(2)
"""
            title = "Demo Animation (Dev Mode)"
            return code, title
        
        # Make the API call to Groq
        # Using Mixtral 8x7B or Llama-3-70b-8192 as they're powerful models on Groq
        response = groq_client.chat.completions.create(
            model="llama3-70b-8192",  # Use latest best model from Groq
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,  # Lower temperature for more deterministic code generation
            max_tokens=4000
        )
        
        # Extract the code from the response
        content = response.choices[0].message.content
        
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
        
        # For development, allow skipping actual Manim execution
        if os.environ.get("DEV_MODE") == "1":
            # Create a dummy video file for development
            dummy_video = job_output_dir / f"{scene_class}.mp4"
            # Create an empty file as placeholder
            dummy_video.touch()
            logger.info(f"Created dummy video in DEV_MODE: {dummy_video}")
            output_file = MEDIA_DIR / f"{job_id}.mp4"
            shutil.copy(dummy_video, output_file)
            return output_file
            
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