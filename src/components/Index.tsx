"use client"
import React, { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { checkGenerationStatus, generateAnimation } from "@/services"
import VideoPlayer from "@/components/VideoPlayer"
import PromptInput from "@/components/PromptInput"

const Index = () => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<string | null>(null)
  const [, setAnimationTitle] = useState<string | null>(null)

  const handleGenerateAnimation = async (prompt: string) => {
    setIsLoading(true)

    try {
      const response = await generateAnimation(prompt)
      const jobId = response.id

      const checkInterval = setInterval(async () => {
        const status = await checkGenerationStatus(jobId)

        if (status.status === "completed") {
          clearInterval(checkInterval)

          let videoUrl = status.video_url || ''
          if (!videoUrl.startsWith('http')) {
            videoUrl = `https://manim-ai-videos.s3.amazonaws.com/videos/${status.id}.mp4`
          }

          setCurrentVideo(videoUrl)
          setAnimationTitle(status.title!)

          toast({
            title: "Animation generated!",
            description: "Your mathematical animation is ready to view.",
          })

          setIsLoading(false)
        } else if (status.status === "failed") {
          clearInterval(checkInterval)

          toast({
            title: "Error",
            description: "Failed to generate animation. Please try again.",
            variant: "destructive",
          })

          setIsLoading(false)
        }
      }, 3000) // Check every 3 seconds
    } catch (error) {
      console.error("Error:", error)

      toast({
        title: "Error",
        description: "Failed to generate animation. Please try again.",
        variant: "destructive",
      })

      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <header className="border-b border-cyan-800/30 py-4 sm:py-6 px-4 sm:px-8 bg-slate-950/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between">
          <div className="flex items-center space-x-2">
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
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </header>

      <main className="flex-1 container h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] overflow-auto sm:overflow-hidden py-2 sm:py-4 flex flex-col">
        {!currentVideo && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto animate-fade-in">
            <div className="mb-6 flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-3 sm:mb-4">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
                  <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Manim AI
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-center text-slate-300 mb-3 sm:mb-4 px-2">
                Generate algorithmic animations and visualizations for mathematics
              </p>
            </div>
            <div className="w-full bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-slate-800 shadow-xl mx-2 sm:mx-0">
              <PromptInput
                onSubmit={handleGenerateAnimation}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 animate-fade-in">
              {/* Spinner Ring with Icon */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-400/30 border-t-cyan-500 animate-spin" />
                <div className="absolute inset-2 bg-slate-950 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
                    <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
                  </svg>
                </div>
              </div>

              {/* Status Message */}
              <div className="text-center">
                <p className="text-base sm:text-lg text-cyan-300 font-semibold animate-pulse text-center px-4">
                  Preparing your animation...
                </p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 text-center px-4">
                  This may take a few seconds. Feel free to stretch.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Result state with video only
          <div className="animate-fade-in h-full flex flex-col">
            {/* Main content area */}
            <div className="flex-1 min-h-0 px-2 sm:px-4 mb-4 sm:mb-6">
              <div className="h-full flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 max-w-6xl mx-auto">
                {/* Video container - full width on mobile, 1/2 on larger screens */}
                <div className="w-full sm:w-1/2 h-auto sm:h-full">
                  <div className="h-full flex items-center">
                    <div className="w-full bg-slate-900/30 rounded-xl p-2 sm:p-4 border border-cyan-800/30 shadow-lg">
                      <VideoPlayer videoUrl={currentVideo} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width prompt input */}
            <div className="px-2 sm:px-4 mt-auto">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-cyan-800/30 shadow-xl max-w-6xl mx-auto">
                <div className="p-3 sm:p-6">
                  <PromptInput
                    onSubmit={handleGenerateAnimation}
                    isLoading={isLoading}
                    compact={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

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
    </div>
  )
}

export default Index
