# MANIM-AI

---

# ✅ To-Do List to Build the Project

### Setup

- [x] Create `frontend/` using **Next.js** + Tailwind
- [x] Create `backend/` with **FastAPI** + Python
- [x] Install **Manim** in backend for rendering

---

### Claude + Backend Integration

- [x] Build Claude API wrapper (POST `/generate-code`)
- [x] Send prompt → get Python code (as string)
- [x] Save to `.py` file
- [x] Run `manim` subprocess to generate video
- [x] Serve the resulting `.mp4` from backend

---

### Frontend Integration

- [x] Input box to enter prompt
- [x] Call backend API (`/generate`) with prompt
- [x] Show loading spinner
- [x] Display the video once done
- [x] Add download button for `.mp4`

---

### Bonus Features (Optional)

- [x] Claude retry/fix if Manim code fails
- [x] Preset prompt buttons
- [x] Gallery of generated videos
- [x] User history / login

---

# 📦 What This Project Is

This project lets users **type a text prompt** and generates an **educational animation video** using Claude and Manim.

Example:

> “Show how quicksort works” → 🎬 You get an `.mp4` showing the full sorting animation.

---

# ⚙️ Tech Stack

| Layer     | Tool              |
| --------- | ----------------- |
| Frontend  | Next.js, Tailwind |
| Backend   | Python, FastAPI   |
| Animation | Manim CE          |
| AI Model  | Claude 3 (API)    |
| Storage   | Local or S3       |

---
