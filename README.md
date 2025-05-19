# [MANIM AI](https://manimai.vercel.app/)

---
## DEMO

https://github.com/user-attachments/assets/1f6efdc1-d661-4467-8e26-7e8846a29161

---

## 🧠 Project Overview

**Manim-AI** is an innovative platform that transforms natural language prompts into captivating mathematical animations using [Manim](https://github.com/ManimCommunity/manim). By integrating AI models like Claude, it empowers users to generate complex animations without writing a single line of code.

---

## 🚀 Features

* **Natural Language Interface**: Describe the animation you envision, and Manim-AI brings it to life.
* **AI-Powered Code Generation**: Utilizes Claude to convert textual prompts into executable Manim scripts.
* **Automated Rendering**: Seamlessly processes and renders animations into `.mp4` videos.
* **User-Friendly Frontend**: Built with Next.js and Tailwind CSS for a responsive and intuitive user experience.
* **Robust Backend**: Powered by FastAPI, ensuring efficient handling of requests and rendering tasks.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js, Tailwind CSS
* **Backend**: FastAPI (Python)
* **AI Integration**: Claude API
* **Animation Engine**: Manim
* **Deployment**: Vercel

---

## 📦 Installation & Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/harsh-dev0/Manim-AI.git
   cd Manim-AI
   ```

2. **Backend Setup**:

  Here is Repository for backend: https://github.com/harsh-dev0/manimbe


3. **Frontend Setup**:

   * Install dependencies:

     ```bash
     npm install
     ```
   * Start the development server:

     ```bash
     npm run dev
     ```

---

## 🧪 Usage

1. **Access the Application**: Open your browser and navigate to `http://localhost:3000`.
2. **Enter a Prompt**: Describe the animation you want, such as:

   ```
   "Animate a sine wave"
   ```
3. **Generate Animation**: Click on the "Generate" button.
4. **View & Download**: Once rendering is complete, view the animation and download the `.mp4` file if desired.

---

## 📄 Example Prompt

> "Visualize the Pythagorean theorem with a right-angled triangle and squares on each side."

This prompt would generate an animation illustrating the Pythagorean theorem, showcasing the relationship between the squares of the sides of a right-angled triangle.

---

## 🧠 Future Enhancements

* **Multi-language Support**: Incorporate support for prompts in multiple languages.
* **Advanced Editing**: Allow users to fine-tune generated animations.
* **User Accounts**: Enable saving and managing past animations.
* **Template Library**: Provide a collection of pre-made animation templates for quick generation.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request. For major changes, open an issue first to discuss your ideas.

---

## 📄 License

This project is licensed under the MIT License..

---

## 📬 Contact

For questions or feedback, please reach out via [twitter](https://x.com/itshp7).

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
