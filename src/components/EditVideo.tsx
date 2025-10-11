"use client"
import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, Send, Undo2 } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import VideoPlayer from "@/components/VideoPlayer"
import { useToast } from "@/hooks/use-toast"
import { editAnimation, checkGenerationStatus, getErrorMessage } from "@/services"
import { EditLoadingModal } from "@/components/EditLoadingModal"
import { UserVideo } from "@/types/next-auth"

interface EditVideoProps {
  videoId: string
}

export function EditVideo({ videoId }: EditVideoProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentVideo, setCurrentVideo] = useState<UserVideo | null>(null)
  const [editPrompt, setEditPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadVideo = async () => {
      if (!session?.user) return

      try {
        // First try to find in session data
        if (session.user.videos) {
          const foundVideo = session.user.videos.find(v => v.id === videoId)
          if (foundVideo) {
            setCurrentVideo(foundVideo)
            return
          }
        }

        // If not found in session, fetch from database
        const response = await fetch(`/api/videos/${videoId}`)
        if (response.ok) {
          const videoData = await response.json()
          setCurrentVideo(videoData)
        } else if (response.status === 404) {
          toast({
            title: "Video not found",
            description: "The requested video could not be found.",
            variant: "destructive"
          })
          router.push("/gallery")
        } else {
          throw new Error("Failed to fetch video")
        }
      } catch (error) {
        console.error("Error loading video:", error)
        toast({
          title: "Error",
          description: "Failed to load video. Please try again.",
          variant: "destructive"
        })
        router.push("/gallery")
      }
    }

    loadVideo()
  }, [session, videoId, router, toast])

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPrompt.trim() || !currentVideo || !session?.user) return

    setIsLoading(true)
    try {
      const response = await editAnimation(
        videoId,
        currentVideo.code || "",
        editPrompt,
        currentVideo.video_url,
        session.user.id
      )

      const jobId = response.job_id || response.id
      const checkInterval = setInterval(async () => {
        const status = await checkGenerationStatus(jobId)
        
        if (status.status === "completed") {
          clearInterval(checkInterval)
          
          let videoUrl = status.video_url || ""
          if (!videoUrl.startsWith("http")) {
            videoUrl = `https://manim-ai-videos.s3.amazonaws.com/videos/${videoId}.mp4`
          }

          // Update video in database directly using PATCH (not POST to avoid adding to gallery)
          try {
            await fetch("/api/videos", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: videoId,
                video_url: videoUrl,
                previous_video_url: currentVideo.video_url,
                code: status.code || currentVideo.code,
              }),
            })
          } catch (error) {
            console.error("Error updating video:", error)
          }

          const updatedVideo = {
            ...currentVideo,
            video_url: videoUrl,
            previous_video_url: currentVideo.video_url,
            code: status.code || currentVideo.code
          }
          setCurrentVideo(updatedVideo)
          
          setEditPrompt("")
          
          toast({
            title: "Edit applied! ✨",
            description: "Your animation has been updated successfully.",
          })
          
          setIsLoading(false)
        } else if (status.status === "failed") {
          clearInterval(checkInterval)
          const errorMessage = getErrorMessage(status.error_type)
          toast({
            title: "Edit Failed",
            description: errorMessage,
            variant: "destructive",
          })
          setIsLoading(false)
        }
      }, 3000)
    } catch (error) {
      console.error("Error editing video:", error)
      
      let errorTitle = "Error"
      let errorDescription = "Failed to edit animation. Please try again."
      
      if (error instanceof Error) {
        if (error.message.includes("Network Error") || error.message.includes("ERR_CONNECTION_REFUSED")) {
          errorTitle = "Backend is Down"
          errorDescription = "Cannot connect to the backend server. Please try again later or contact support."
        } else if (error.message.includes("timeout")) {
          errorTitle = "Request Timeout"
          errorDescription = "The request took too long. Please try again."
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleRevert = async () => {
    if (!currentVideo?.previous_video_url || !session?.user) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: videoId,
          video_url: currentVideo.previous_video_url,
          previous_video_url: null,
        }),
      })

      if (!response.ok) throw new Error("Failed to revert")

      const updatedVideo = {
        ...currentVideo,
        video_url: currentVideo.previous_video_url,
        previous_video_url: undefined,
      }
      setCurrentVideo(updatedVideo)

      toast({
        title: "Reverted successfully!",
        description: "Video has been restored to previous version.",
      })
    } catch (error) {
      console.error("Error reverting:", error)
      toast({
        title: "Error",
        description: "Failed to revert changes.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }


  if (!currentVideo) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <Header />
        <main className="flex-1 container flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-slate-300">Loading video...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />
      
      <main className="flex-1 container py-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/gallery")}
                className="text-slate-300 hover:text-white hover:bg-slate-800 w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Gallery
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-cyan-400">
                  Edit Animation
                </h1>
                <p className="text-sm sm:text-base text-slate-400">{currentVideo.title || "Untitled Animation"}</p>
              </div>
            </div>
          </div>

          {/* Video Comparison Section */}
          {currentVideo.previous_video_url ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Current Video */}
              <div className="space-y-2">
                <p className="text-sm text-cyan-400 font-semibold">Current Version</p>
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 border-2 border-cyan-700/50">
                  <VideoPlayer videoUrl={currentVideo.video_url || null} />
                </div>
              </div>

              {/* Previous Video */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400 font-semibold">Previous Version</p>
                  <Button
                    onClick={handleRevert}
                    disabled={isLoading}
                    size="sm"
                    variant="outline"
                    className="text-xs border-slate-600 text-black hover:bg-slate-700 hover:text-white hover:border-slate-500"
                  >
                    <Undo2 className="w-3 h-3 mr-1" />
                    Revert Back
                  </Button>
                </div>
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                  <VideoPlayer videoUrl={currentVideo.previous_video_url} />
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto mb-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <VideoPlayer videoUrl={currentVideo.video_url || null} />
              </div>
            </div>
          )}

          {/* Edit Form - Full width below videos */}
          <div className="space-y-3">
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <Textarea
                placeholder="Describe how you want to modify the animation (e.g., 'Make the graph red', 'Add a title', 'Change the speed'...)"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="w-full bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] rounded-lg p-4"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!editPrompt.trim() || isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 py-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Applying Edit...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Apply Edit
                  </>
                )}
              </Button>
            </form>
          </div>

        </div>
      </main>

      <Footer />
      <EditLoadingModal isOpen={isLoading} />
    </div>
  )
}
