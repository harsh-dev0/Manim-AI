from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

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

# Set up signal handlers for graceful shutdown
def handle_exit_signal(signum, frame):
    logger.info(f"Received exit signal {signum}. Cleaning up and shutting down...")
    sys.exit(0)

signal.signal(signal.SIGINT, handle_exit_signal)
signal.signal(signal.SIGTERM, handle_exit_signal)

# Create directories for storing files
BASE_DIR = Path("./outputs")
CODE_DIR = BASE_DIR / "code"
MEDIA_DIR = BASE_DIR / "media"
JOB_DIR = BASE_DIR / "jobs"  # Directory for job data persistence
LOG_DIR = BASE_DIR / "logs"  # Directory for logs

# Ensure directories exist
CODE_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
JOB_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Add file handler for logging
file_handler = logging.FileHandler(LOG_DIR / "manim_api.log")
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)

# Mount the media directory to serve videos
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# Initialize LLM clients
try:
    # Try to use Anthropic if API key is available
    anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_api_key:
        anthropic_client = Anthropic(api_key=anthropic_api_key)
        logger.info("Anthropic client initialized successfully")
    else:
        # Try to use Groq if API key is available
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if groq_api_key:
            # Import Groq only if we're using it
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
    groq_client = None  # Allow startup without API clients for development

# Set development mode
DEV_MODE = os.environ.get("DEV_MODE", "0") == "1"
if DEV_MODE:
    logger.info("Running in development mode")

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
        "created_at": time.time(),
        "prompt": request.prompt  # Store the original prompt
    }
    
    # Store in memory and on disk
    generation_jobs[job_id] = job_data
    save_job(job_id, job_data)
    
    # Add the task to background processing with error handling
    try:
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
    except Exception as e:
        # Update job status if task addition fails
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
def process_animation_request(job_id: str, prompt: str):
    try:
        logger.info(f"Processing animation request for job {job_id}")
        
        # Update job status
        generation_jobs[job_id] = {
            "status": "processing",
            "created_at": time.time(),
            "prompt": prompt
        }
        save_job(job_id, generation_jobs[job_id])
        
        # Generate Manim code using Claude
        code, title = generate_manim_code(prompt)
        
        if not code:
            raise ValueError("Failed to generate Manim code")
        
        # Save the generated code to a file
        code_file_path = CODE_DIR / f"{job_id}.py"
        with open(code_file_path, "w") as f:
            f.write(code)
        
        logger.info(f"Code generated and saved for job {job_id}")
        
        # Update job with code before running Manim
        generation_jobs[job_id].update({
            "code": code,
            "title": title,
            "status": "rendering"  # Intermediate status to track rendering phase
        })
        save_job(job_id, generation_jobs[job_id])
        
        # Run Manim to generate the animation
        video_file_path = run_manim(job_id, code_file_path)
        
        # Get the relative path for the video URL
        video_url = f"/media/{job_id}.mp4"
        
        # Update job status to completed
        generation_jobs[job_id].update({
            "status": "completed",
            "video_url": video_url,
        })
        save_job(job_id, generation_jobs[job_id])
        
        logger.info(f"Animation generation completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Error processing animation for job {job_id}: {str(e)}")
        
        # Update job status to failed
        error_data = {
            "status": "failed",
            "error": str(e)
        }
        
        # Keep existing data if available
        if job_id in generation_jobs:
            generation_jobs[job_id].update(error_data)
        else:
            generation_jobs[job_id] = {
                "status": "failed",
                "created_at": time.time(),
                "prompt": prompt,
                "error": str(e),
                "code": code if 'code' in locals() else None,
                "title": title if 'title' in locals() else None
            }
            
        save_job(job_id, generation_jobs[job_id])

def generate_manim_code(prompt: str):
    """Generate Manim code using Claude API"""
    try:
        logger.info(f"Sending prompt to Claude: {prompt}")
        
        system_prompt = """
        You are an expert in creating mathematical animations using the Manim library.
        Your task is to generate Python code that uses Manim to create a beautiful, educational animation based on the user's request.
        
        Follow these guidelines:
        1. Generate clean, well-commented Manim code that will run without errors
        2. Focus on creating visually appealing animations that clearly illustrate the mathematical concept
        3. Use appropriate colors, timing, and visual elements to enhance understanding
        4. Include a Scene class that extends manim.Scene
        5. Implement the construct() method to build the animation
        6. Use appropriate Manim objects and animations based on the request
        7. Keep the animation under 30 seconds in length
        8. Provide a title for the animation as a comment at the top of the code
        
        Output only the Python code without any additional explanation or markdown formatting.
        """
        
        # Define a sample code for development or fallback scenarios
        sample_code = '''
# Binary Search Tree Visualization
from manim import *

class BinarySearchTreeFromSortedArray(Scene):
    def construct(self):
        # Title
        title = Text("Binary Search Tree from Sorted Array", font_size=40)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create a sorted array
        sorted_array = [10, 20, 30, 40, 50, 60, 70]
        array_mobs = []
        
        # Display the array
        for i, val in enumerate(sorted_array):
            square = Square(side_length=0.8).set_stroke(WHITE, 2)
            text = Text(str(val), font_size=24)
            group = VGroup(square, text)
            array_mobs.append(group)
        
        array_group = VGroup(*array_mobs).arrange(RIGHT, buff=0.1)
        array_group.next_to(title, DOWN, buff=1)
        
        self.play(FadeIn(array_group))
        self.wait(1)
        
        # Function to create BST from sorted array
        def create_bst_node(arr, start, end, y_pos=-3, x_offset=0, parent=None, is_left=None):
            if start > end:
                return None
            
            # Get middle element as root
            mid = (start + end) // 2
            value = arr[mid]
            
            # Create circle node
            circle = Circle(radius=0.4).set_stroke(BLUE, 2)
            text = Text(str(value), font_size=20)
            node = VGroup(circle, text).move_to([x_offset, y_pos, 0])
            
            # Draw line to parent if not root
            line = None
            if parent:
                line = Line(parent.get_center(), node.get_center()).set_stroke(GRAY, 2)
                self.play(Create(line), FadeIn(node), run_time=0.5)
            else:
                self.play(FadeIn(node), run_time=0.5)
            
            # Calculate x_offset for children based on the level
            level_factor = 1.5 / (abs(y_pos) + 1)
            
            # Create left subtree
            left = create_bst_node(arr, start, mid-1, y_pos-1, x_offset-level_factor, node, True)
            
            # Create right subtree
            right = create_bst_node(arr, mid+1, end, y_pos-1, x_offset+level_factor, node, False)
            
            return node
        
        # Create the BST
        root = create_bst_node(sorted_array, 0, len(sorted_array)-1)
        
        # Final message
        message = Text("Binary Search Tree Created!", font_size=36, color=GREEN)
        message.next_to(array_group, DOWN, buff=4)
        self.play(Write(message))
        self.wait(2)
'''
        
        # Check if we're in development mode
        if DEV_MODE:
            logger.info("Using sample code in development mode")
            return sample_code, "Binary Search Tree Visualization"
        
        # Try to use available LLM client
        code = None
        if anthropic_client:
            # Use Anthropic Claude
            try:
                logger.info("Using Anthropic Claude to generate code")
                message = anthropic_client.messages.create(
                    model="claude-3-opus-20240229",
                    max_tokens=4000,
                    temperature=0.2,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                code = message.content[0].text
                logger.info("Successfully generated code with Anthropic")
            except Exception as e:
                logger.error(f"Error using Anthropic: {str(e)}")
                code = None
                
        if code is None and 'groq_client' in globals() and groq_client:
            # Use Groq as fallback
            try:
                logger.info("Using Groq to generate code")
                completion = groq_client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,
                    max_tokens=4000
                )
                code = completion.choices[0].message.content
                logger.info("Successfully generated code with Groq")
            except Exception as e:
                logger.error(f"Error using Groq: {str(e)}")
                code = None
        
        # If both LLM attempts failed or no clients available, use sample code
        if code is None:
            logger.warning("No LLM client available or API calls failed, using sample code")
            code = sample_code
        # Extract the title from the first comment line
        title = None
        lines = code.split('\n')
        for line in lines:
            if line.strip().startswith('#') and not line.strip().startswith('#!'):
                title = line.strip('# ').strip()
                break
        
        if not title:
            title = "Mathematical Animation"
        
        # Clean up the code - remove any Python markdown indicators
        code = code.replace("```python", "").replace("```", "").strip()
        
        return code, title
        
    except Exception as e:
        logger.error(f"Error generating Manim code: {str(e)}")
        # Return a simple fallback code in case of error
        fallback_code = '''
# Fallback Animation
from manim import *

class FallbackAnimation(Scene):
    def construct(self):
        title = Text("Fallback Animation", font_size=40)
        title.to_edge(UP)
        self.play(Write(title))
        
        text = Text("Could not generate the requested animation", font_size=24)
        text.next_to(title, DOWN, buff=1)
        self.play(Write(text))
        
        error_text = Text(f"Error: {str(e)[:50]}", font_size=18, color=RED)
        error_text.next_to(text, DOWN, buff=1)
        self.play(Write(error_text))
        
        self.wait(2)
'''
        return fallback_code, "Fallback Animation"

def run_manim(job_id: str, code_file_path: Path):
    try:
        logger.info(f"Running Manim for job {job_id}")
        
        # Directory for this job's output
        job_output_dir = MEDIA_DIR / job_id
        job_output_dir.mkdir(exist_ok=True, parents=True)
        
        # Save stdout/stderr to log files
        stdout_log = LOG_DIR / f"{job_id}_stdout.log"
        stderr_log = LOG_DIR / f"{job_id}_stderr.log"
        
        # Detect the scene class name from the code
        scene_class = detect_scene_class(code_file_path)
        if not scene_class:
            logger.warning("Could not detect Scene class in the generated code, using fallback")
            scene_class = "Scene"
        
        # Always create a dummy video file in case Manim fails
        dummy_video_path = MEDIA_DIR / f"{job_id}.mp4"
        
        # Check if we're in development mode or if FORCE_DUMMY is set
        if DEV_MODE or os.environ.get("FORCE_DUMMY") == "1":
            # Create a dummy video file
            logger.info(f"Creating dummy video in DEV_MODE: {dummy_video_path}")
            
            # Try to copy a sample video if available
            sample_video = Path("./sample_videos/sample.mp4")
            if sample_video.exists():
                shutil.copy(sample_video, dummy_video_path)
                logger.info(f"Copied sample video to {dummy_video_path}")
            else:
                # Create a simple video with ffmpeg
                try:
                    ffmpeg_cmd = [
                        "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=blue:s=1280x720:d=5",
                        "-vf", "drawtext=text='Sample Animation':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dummy_video_path)
                    ]
                    subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
                    logger.info(f"Created dummy video using ffmpeg: {dummy_video_path}")
                except Exception as e:
                    logger.error(f"Failed to create dummy video with ffmpeg: {str(e)}")
                    dummy_video_path.touch()
                    logger.info(f"Created empty file as placeholder: {dummy_video_path}")
            
            return dummy_video_path
        
        # Try to run Manim, but be prepared for failure
        try:
            # Build the Manim command
            command = [
                "python",
                "-m", "manim",
                str(code_file_path),
                scene_class,
                "-qm",  # Medium quality
                "--media_dir", str(job_output_dir),
                "--progress_bar", "none"  # Disable progress bar which can cause issues
            ]
            
            # Run Manim command
            logger.info(f"Executing command: {' '.join(command)}")
            
            # Set timeout to prevent hanging processes
            timeout = 300  # 5 minutes timeout
            
            # Use files for stdout/stderr to avoid buffer issues
            with open(stdout_log, 'w') as stdout_file, open(stderr_log, 'w') as stderr_file:
                try:
                    # Use subprocess.run with timeout for better error handling
                    result = subprocess.run(
                        command,
                        stdout=stdout_file,
                        stderr=stderr_file,
                        timeout=timeout,
                        check=False,  # Don't raise exception on non-zero exit
                        cwd=os.path.dirname(code_file_path)  # Run in the same directory as the code file
                    )
                    
                    # Read logs after process completes
                    with open(stdout_log, 'r') as f:
                        stdout_content = f.read()
                    with open(stderr_log, 'r') as f:
                        stderr_content = f.read()
                    
                    # Log the output for debugging
                    logger.info(f"Manim command output: {stdout_content[:500]}...")
                    if stderr_content:
                        logger.warning(f"Manim command stderr: {stderr_content[:500]}...")
                    
                    # Check for errors in output
                    if result.returncode != 0:
                        logger.error(f"Manim command failed with return code {result.returncode}")
                        raise RuntimeError(f"Manim command failed with return code {result.returncode}")
                    
                    logger.info(f"Manim command completed successfully")
                    
                except subprocess.TimeoutExpired:
                    logger.error(f"Manim command timed out after {timeout} seconds")
                    raise TimeoutError(f"Manim command timed out after {timeout} seconds")
            
            # Find the generated video file - search in multiple locations
            video_files = []
            search_paths = [
                job_output_dir,
                job_output_dir / "videos",
                job_output_dir / scene_class,
                Path("./media/videos"),
                Path(f"./media/videos/{scene_class}"),
                Path("./media"),
            ]
            
            for path in search_paths:
                if path.exists():
                    logger.info(f"Searching for videos in {path}")
                    video_files.extend(list(path.glob("**/*.mp4")))
            
            logger.info(f"Found {len(video_files)} video files: {[str(v) for v in video_files[:3]]}")
            
            if not video_files:
                # Try to find image files that might have been generated instead
                image_files = []
                for path in search_paths:
                    if path.exists():
                        image_files.extend(list(path.glob("**/*.png")))
                
                logger.info(f"Found {len(image_files)} image files: {[str(i) for i in image_files[:3]]}")
                
                if image_files:
                    # Convert the first image to a video using ffmpeg
                    try:
                        image_file = image_files[0]
                        logger.info(f"Converting image to video: {image_file}")
                        
                        # Use ffmpeg to create a video from the image
                        ffmpeg_cmd = [
                            "ffmpeg", "-y", "-loop", "1", "-i", str(image_file),
                            "-c:v", "libx264", "-t", "5", "-pix_fmt", "yuv420p",
                            str(dummy_video_path)
                        ]
                        subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
                        logger.info(f"Created video from image: {dummy_video_path}")
                        return dummy_video_path
                    except Exception as e:
                        logger.error(f"Failed to create video from image: {str(e)}")
                        # Fall through to the dummy video creation below
                else:
                    logger.error("No video or image files were generated by Manim")
                    # Fall through to the dummy video creation below
            else:
                # Get the first video file
                video_file = video_files[0]
                logger.info(f"Using video file: {video_file}")
                
                # Copy to a standardized location
                shutil.copy(video_file, dummy_video_path)
                logger.info(f"Copied generated video to {dummy_video_path}")
                return dummy_video_path
        
        except Exception as e:
            logger.error(f"Error running Manim: {str(e)}")
            # Fall through to the dummy video creation below
        
        # If we get here, something went wrong with Manim or ffmpeg
        # Create a simple dummy video as a last resort
        logger.warning("Creating fallback dummy video due to Manim execution failure")
        
        # Try to create a simple video with ffmpeg directly
        try:
            # Create a simple color gradient video with the job_id and error message
            ffmpeg_cmd = [
                "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=blue:s=1280x720:d=5",
                "-vf", f"drawtext=text='Animation Generation Failed':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2-50,drawtext=text='Job ID: {job_id}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2+50",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dummy_video_path)
            ]
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
            logger.info(f"Created fallback video using ffmpeg: {dummy_video_path}")
        except Exception as e:
            logger.error(f"Failed to create fallback video with ffmpeg: {str(e)}")
            # Try a simpler ffmpeg command as a last resort
            try:
                simple_cmd = [
                    "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=blue:s=640x480:d=3",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dummy_video_path)
                ]
                subprocess.run(simple_cmd, check=True, capture_output=True)
                logger.info(f"Created simple blue screen video as fallback: {dummy_video_path}")
            except Exception as e2:
                logger.error(f"Failed to create simple fallback video: {str(e2)}")
                # Just create an empty file as the absolute last resort
                dummy_video_path.touch()
                logger.warning(f"Created empty file as video placeholder: {dummy_video_path}")
        
        return dummy_video_path
        
    except Exception as e:
        logger.error(f"Critical error in run_manim: {str(e)}")
        # Create an emergency dummy file and return it
        emergency_path = MEDIA_DIR / f"{job_id}.mp4"
        try:
            # Try one last time to create a simple error video
            error_cmd = [
                "ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=red:s=640x480:d=3",
                "-vf", "drawtext=text='Error':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", str(emergency_path)
            ]
            subprocess.run(error_cmd, check=True, capture_output=True)
            logger.info(f"Created emergency error video: {emergency_path}")
        except Exception:
            # If all else fails, create an empty file
            emergency_path.touch()
            logger.error(f"Created empty emergency file: {emergency_path}")
        
        return emergency_path

def detect_scene_class(code_file_path: Path):
    """Parse the Python file to detect the Scene class name"""
    try:
        with open(code_file_path, "r") as f:
            code = f.read()
        
        # More robust parsing to find class that extends Scene
        import re
        # Look for class definitions that inherit from Scene
        scene_classes = re.findall(r'class\s+([\w_]+)\s*\(\s*(?:manim\.)?Scene\s*\)', code)
        if scene_classes:
            return scene_classes[0]
            
        # Fallback to the old method if regex doesn't find anything
        lines = code.split("\n")
        for line in lines:
            if "class" in line and "Scene" in line:
                # Extract class name, assuming format "class ClassName(Scene):"
                parts = line.split("class ")[1].split("(")
                if len(parts) > 0:
                    class_name = parts[0].strip()
                    return class_name
        
        # Last resort: look for any class definition
        all_classes = re.findall(r'class\s+([\w_]+)', code)
        if all_classes:
            logger.warning(f"Could not find Scene class, using first class found: {all_classes[0]}")
            return all_classes[0]
            
        return None
    except Exception as e:
        logger.error(f"Error detecting scene class: {str(e)}")
        return None

# Main entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)