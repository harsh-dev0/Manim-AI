# MANIM-AI

---

# ✅ To-Do List to Build the Project

### Setup

- [x] Create `frontend/` using **Next.js** + Tailwind
- [x] Create `backend/` with **FastAPI** + Python
- [x] Install **Manim** in backend for rendering

---

### Claude + Backend Integration

- [ ] Build Claude API wrapper (POST `/generate-code`)
- [ ] Send prompt → get Python code (as string)
- [ ] Save to `.py` file
- [ ] Run `manim` subprocess to generate video
- [ ] Serve the resulting `.mp4` from backend

---

### Frontend Integration

- [ ] Input box to enter prompt
- [ ] Call backend API (`/generate`) with prompt
- [ ] Show loading spinner
- [ ] Display the video once done
- [ ] Add download button for `.mp4`

---

### Bonus Features (Optional)

- [ ] Claude retry/fix if Manim code fails
- [ ] Preset prompt buttons
- [ ] Gallery of generated videos
- [ ] User history / login

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
