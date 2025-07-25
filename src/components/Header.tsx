"use client"
import React from "react"
import Link from "next/link"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, ImageIcon, Loader2 } from "lucide-react"
import Image from "next/image"

const Header = () => {
  const { data: session, status } = useSession()
  const isLoading = status === "loading"

  return (
    <header className="border-b border-cyan-800/30 py-4 sm:py-6 px-4 sm:px-8 bg-slate-950/80 backdrop-blur-sm">
      <div className="container flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
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
            <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              Manim AI
            </h1>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {session?.user && (
            <Link
              href="/gallery"
              className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center"
            >
              <ImageIcon className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">Gallery</span>
            </Link>
          )}

          <div className="flex items-center space-x-2">
            {isLoading ? (
              <div className="flex items-center space-x-2 bg-slate-900/60 rounded-lg px-3 py-1.5 border border-cyan-800/20">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs text-cyan-300 hidden sm:inline">
                  Checking auth...
                </span>
              </div>
            ) : session?.user ? (
              <div className="flex items-center space-x-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border border-cyan-500/30"
                  />
                )}
                <div className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Sign Out
                  </Button>
                </div>
                <div className="sm:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 p-2"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signIn()}
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                  >
                    <LogIn className="w-4 h-4 mr-1" />
                    Sign In
                  </Button>
                </div>
                <div className="sm:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signIn()}
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 p-2"
                  >
                    <LogIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <a
            href="https://github.com/harsh-dev0/Manim-AI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="opacity-80 hover:opacity-100 transition-opacity"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}

export default Header
