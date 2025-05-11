import React from "react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  className?: string
}

const Header: React.FC<HeaderProps> = ({ className }) => {
  return (
    <header
      className={cn("w-full px-4 py-4 bg-black text-white", className)}
    >
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 text-white p-2 rounded-lg">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L20 8V16L12 20L4 16V8L12 4Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 12L12 20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 12L20 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 12L4 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">VisuaMath Forge</h1>
            <p className="text-xs text-gray-400">
              AI-powered math animations
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
