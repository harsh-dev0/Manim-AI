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
    code: str = None
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
    return {"message": "VisuaMath Forge API is running"}

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
        if "code" in job:
            response.code = job["code"]
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

    video_path = generation_jobs[job_id].get("video_path")
    if not os.path.exists(video_path):
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
        
        logger.info(f"Code generated and saved for job {job_id}")
        
        generation_jobs[job_id].update({
            "code": code,
            "title": title,
            "status": "rendering"
        })
        save_job(job_id, generation_jobs[job_id])
        
        video_file_path = create_video(job_id, code_file_path)
        
        video_url = f"/media/{job_id}.mp4"
        
        generation_jobs[job_id].update({
            "status": "completed",
            "video_url": video_url,
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
                "code": code if 'code' in locals() else None,
                "title": title if 'title' in locals() else None
            }
            
        save_job(job_id, generation_jobs[job_id])

def generate_manim_code(prompt: str):
    """Generate Manim code using AI with fallback to demo code"""
    try:
        system_prompt = """You must respond ONLY with valid Python code for Manim. No explanations or other text.
        The code should:
        1. Start with a comment containing the title
        2. Include the manim import
        3. Define a Scene class
        4. Implement the construct method
        
        Example format:
        # Title Here
        from manim import *
        
        class MyScene(Scene):
            def construct(self):
                # animation code here
        """

        if anthropic_client:
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
                logger.warning("Generated code missing required elements, using fallback")
                return BINARY_TREE_DEMO_CODE, "Binary Tree Visualization Demo"
                
            if code and title:
                logger.info("Successfully generated valid Manim code")
                return code, title

        # Fallback to demo code if AI generation fails
        logger.warning("AI generation failed, using demo binary tree code")
        return BINARY_TREE_DEMO_CODE, "Binary Tree Visualization Demo"

    except Exception as e:
        logger.error(f"Error in code generation: {str(e)}")
        return BINARY_TREE_DEMO_CODE, "Binary Tree Visualization Demo"

BINARY_TREE_DEMO_CODE = '''
# Binary Tree Visualization Demo

from manim import *

class BinaryTreeDemo(Scene):
    def construct(self):
        # Create title
        title = Text("Binary Tree Basics", font_size=40)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create the root node
        root = Circle(radius=0.5).set_stroke(WHITE, 2)
        root_text = Text("5", font_size=24)
        root_group = VGroup(root, root_text)
        root_group.move_to([0, 2, 0])
        
        # Create left child
        left = Circle(radius=0.5).set_stroke(WHITE, 2)
        left_text = Text("3", font_size=24)
        left_group = VGroup(left, left_text)
        left_group.move_to([-2, 0, 0])
        
        # Create right child
        right = Circle(radius=0.5).set_stroke(WHITE, 2)
        right_text = Text("7", font_size=24)
        right_group = VGroup(right, right_text)
        right_group.move_to([2, 0, 0])
        
        # Create edges
        edge1 = Line(root_group.get_bottom(), left_group.get_top())
        edge2 = Line(root_group.get_bottom(), right_group.get_top())
        
        # Animate the tree construction
        self.play(Create(root_group))
        self.wait(0.5)
        
        self.play(
            Create(edge1),
            Create(edge2)
        )
        self.wait(0.5)
        
        self.play(
            Create(left_group),
            Create(right_group)
        )
        
        # Add explanation text
        explanation = Text(
            "A binary tree where each node has at most 2 children",
            font_size=24,
            color=YELLOW
        )
        explanation.next_to(title, DOWN, buff=0.5)
        self.play(Write(explanation))
        
        self.wait(2)
'''

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
            return output_path

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