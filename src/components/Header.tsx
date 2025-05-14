import React from "react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  className?: string
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  return (
    <header
      className={cn("w-full px-4 py-3 bg-slate-950 border-b border-slate-800 text-white", className)}
    >
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white p-2 rounded-lg shadow-lg">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
              <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">VisuaMath Forge</h1>
            <p className="text-xs text-slate-400">
              Mathematical visualizations powered by AI
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <a href="https://github.com/harsh-dev0/Manim-AI" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.477 2 2 6.477 2 12C2 16.418 4.865 20.166 8.839 21.489C9.339 21.581 9.5 21.278 9.5 21.017C9.5 20.778 9.492 20.046 9.489 19.192C6.727 19.79 6.139 17.819 6.139 17.819C5.685 16.635 5.029 16.334 5.029 16.334C4.121 15.693 5.098 15.705 5.098 15.705C6.101 15.774 6.629 16.75 6.629 16.75C7.521 18.306 8.97 17.866 9.52 17.615C9.608 16.967 9.858 16.528 10.134 16.294C7.933 16.057 5.62 15.187 5.62 11.371C5.62 10.249 6.01 9.331 6.649 8.622C6.549 8.375 6.201 7.431 6.746 6.075C6.746 6.075 7.586 5.812 9.476 7.083C10.295 6.866 11.15 6.757 12 6.753C12.85 6.757 13.705 6.866 14.525 7.083C16.414 5.812 17.254 6.075 17.254 6.075C17.799 7.431 17.451 8.375 17.351 8.622C17.991 9.331 18.38 10.249 18.38 11.371C18.38 15.197 16.062 16.054 13.855 16.287C14.203 16.575 14.513 17.148 14.513 18.018C14.513 19.259 14.5 20.68 14.5 21.017C14.5 21.28 14.659 21.586 15.167 21.486C19.137 20.161 22 16.415 22 12C22 6.477 17.523 2 12 2Z" fill="currentColor"/>
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}

export default Header
