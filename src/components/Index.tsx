"use client"
import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { checkGenerationStatus, generateAnimation } from "@/services"
import VideoPlayer from "@/components/VideoPlayer"
import PromptInput from "@/components/PromptInput"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import FundingWarning from "@/components/FundingWarning"
import { useSession } from "next-auth/react"

const Index = () => {
  const { toast } = useToast()
  // We still need useSession for the PromptInput component to work properly
  const { status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<string | null>(null)
  const [, setAnimationTitle] = useState<string | null>(null)
  const [showInitialView, setShowInitialView] = useState(true)

  // Don't automatically load videos on page refresh
  // Instead, we'll keep the initial view until user generates a new animation
  useEffect(() => {
    // Clear any existing video on refresh/initial load
    setCurrentVideo(null)
    setShowInitialView(true)
  }, [])

  const handleGenerateAnimation = async (
    prompt: string,
    userId?: string
  ) => {
    setIsLoading(true)
    setShowInitialView(false)

    try {
      const response = await generateAnimation(prompt, userId)
      const jobId = response.id

      const checkInterval = setInterval(async () => {
        const status = await checkGenerationStatus(jobId, userId)

        if (status.status === "completed") {
          clearInterval(checkInterval)

          let videoUrl = status.video_url || ""
          if (!videoUrl.startsWith("http")) {
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

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <Header />
        <main className="flex-1 container flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <p className="text-slate-300">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />

      <main className="flex-1 container h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] overflow-auto sm:overflow-hidden py-2 sm:py-4 flex flex-col">
        {(!currentVideo && !isLoading) || showInitialView ? (
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
                Generate algorithmic animations and visualizations for
                mathematics
              </p>
            </div>
            <FundingWarning />
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

      <Footer />
    </div>
  )
}

export default Index
