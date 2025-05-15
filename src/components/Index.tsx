"use client"
import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { checkGenerationStatus, generateAnimation } from "@/services"
import VideoPlayer from "@/components/VideoPlayer"
import PromptInput from "@/components/PromptInput"

const Index = () => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<string | null>(null)
  const [animationTitle, setAnimationTitle] = useState<string | null>(null)
  const [generationStep, setGenerationStep] = useState<string | null>(null)

  const handleGenerateAnimation = async (prompt: string) => {
    setIsLoading(true)

    try {
      // Call the API to start generation
      const response = await generateAnimation(prompt)
      const jobId = response.id

      // Poll for status
      const checkInterval = setInterval(async () => {
        const status = await checkGenerationStatus(jobId)

        if (status.status === "completed") {
          clearInterval(checkInterval)

          // Generate a video URL by prepending the API base URL
          const videoUrl = `http://localhost:8000${status.video_url}`

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
      {/* Header */}
      <header className="border-b border-cyan-800/30 py-6 px-8 bg-slate-950/80 backdrop-blur-sm">
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
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              Manim AI
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 container h-[calc(100vh-140px)] overflow-hidden py-4 flex flex-col">
        {!currentVideo && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto animate-fade-in">
            <div className="mb-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
                  <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Manim AI
              </h1>
              <p className="text-lg text-center text-slate-300 mb-4">
                Generate algorithmic animations and visual Animations for
                mathematics
              </p>
            </div>
            <div className="w-full bg-slate-900/50 backdrop-blur-sm p-6 rounded-xl border border-slate-800 shadow-xl">
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
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-cyan-400/30 border-t-cyan-500 animate-spin" />
                <div className="absolute inset-2 bg-slate-950 rounded-full flex items-center justify-center">
                  <svg
                    width="28"
                    height="28"
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
                <p className="text-lg text-cyan-300 font-semibold animate-pulse">
                  {generationStep || "Preparing your animation..."}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  This may take a few seconds. Feel free to stretch.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Result state with video only
          <div className="animate-fade-in h-full flex flex-col">
            {/* Main content area */}
            <div className="flex-1 min-h-0 px-4 mb-6">
              <div className="h-full flex items-center justify-center gap-6 max-w-6xl mx-auto">
                {/* Video container */}
                <div className="w-1/2 h-full">
                  <div className="h-full flex items-center">
                    <div className="w-full bg-slate-900/30 rounded-xl p-4 border border-cyan-800/30 shadow-lg">
                      <VideoPlayer videoUrl={currentVideo} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width prompt input */}
            <div className="px-4 mt-auto">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-cyan-800/30 shadow-xl max-w-6xl mx-auto">
                <div className="p-6">
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
