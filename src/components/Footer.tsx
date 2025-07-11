import React from "react"

const Footer = () => {
  return (
    <footer className="border-t border-cyan-800/30 py-6 px-8 bg-slate-950">
      <div className="container text-center">
        <div className="flex items-center justify-center mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
              <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
            </svg>
          </div>
          <span className="font-medium text-cyan-400">Manim AI</span>
        </div>
        <div className="text-xs text-cyan-400/50">
          © {new Date().getFullYear()} Manim AI | Powered by Manim
        </div>
      </div>
    </footer>
  )
}

export default Footer
