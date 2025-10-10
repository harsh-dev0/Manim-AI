"use client"
import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Send, Loader2 } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import VideoPlayer from "@/components/VideoPlayer"
import { useToast } from "@/hooks/use-toast"
import { editAnimation, checkGenerationStatus, getErrorMessage } from "@/services"
import { UserVideo } from "@/types/next-auth"

interface EditVideoProps {
  videoId: string
}

interface EditHistory {
  id: string
  prompt: string
  video_url: string
  created_at: string
  is_current: boolean
}

export function EditVideo({ videoId }: EditVideoProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentVideo, setCurrentVideo] = useState<UserVideo | null>(null)
  const [editPrompt, setEditPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editHistory, setEditHistory] = useState<EditHistory[]>([])

  useEffect(() => {
    const loadVideo = async () => {
      if (!session?.user) return

      try {
        // First try to find in session data
        if (session.user.videos) {
          const foundVideo = session.user.videos.find(v => v.id === videoId)
          if (foundVideo) {
            setCurrentVideo(foundVideo)
            await loadEditHistory(videoId)
            return
          }
        }

        // If not found in session, fetch from database
        const response = await fetch(`/api/videos/${videoId}`)
        if (response.ok) {
          const videoData = await response.json()
          setCurrentVideo(videoData)
          await loadEditHistory(videoId)
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

  const loadEditHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/videos/${id}/history`)
      if (response.ok) {
        const history = await response.json()
        setEditHistory(history)
      }
    } catch (error) {
      console.error("Error loading edit history:", error)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPrompt.trim() || !currentVideo || !session?.user) return

    setIsLoading(true)
    try {
      const response = await editAnimation(
        currentVideo.code || "",
        editPrompt,
        currentVideo.video_url,
        currentVideo.id,
        session.user.id
      )

      const jobId = response.id
      const checkInterval = setInterval(async () => {
        const status = await checkGenerationStatus(jobId, session.user.id)
        
        if (status.status === "completed") {
          clearInterval(checkInterval)
          
          let videoUrl = status.video_url || ""
          if (!videoUrl.startsWith("http")) {
            videoUrl = `https://manim-ai-videos.s3.amazonaws.com/videos/${status.id}.mp4`
          }

          // Update the current video with new URL and ID
          const updatedVideo = {
            ...currentVideo,
            id: status.id,
            video_url: videoUrl,
            code: status.code || currentVideo.code
          }
          setCurrentVideo(updatedVideo)
          
          // Add to history (new video becomes current, old becomes previous)
          const newHistoryItem: EditHistory = {
            id: status.id,
            prompt: editPrompt,
            video_url: videoUrl,
            created_at: new Date().toISOString(),
            is_current: true
          }
          
          // Add previous version to history if it exists
          const previousHistoryItem: EditHistory = {
            id: currentVideo.id,
            prompt: "Original version",
            video_url: currentVideo.video_url,
            created_at: currentVideo.createdAt || new Date().toISOString(),
            is_current: false
          }
          
          setEditHistory(prev => [newHistoryItem, previousHistoryItem, ...prev.filter(item => item.id !== currentVideo.id)])
          
          setEditPrompt("")
          
          toast({
            title: "Edit applied!",
            description: "Your animation has been updated successfully.",
          })
          
          // Redirect to video page to show the updated video (use new video ID)
          router.push(`/video/${status.id}`)
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
      toast({
        title: "Error",
        description: "Failed to edit animation. Please try again.",
        variant: "destructive",
      })
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/gallery")}
                className="text-slate-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Gallery
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-cyan-400">
                  Edit Animation
                </h1>
                <p className="text-slate-400">{currentVideo.title || "Untitled Animation"}</p>
              </div>
            </div>
          </div>

          {/* Video Comparison Section */}
          {editHistory.length > 0 && editHistory.some(h => !h.is_current) ? (
            // Side-by-side layout when there's a previous version
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
              {/* Current Video */}
              <div className="space-y-2">
                <p className="text-xs text-cyan-400 font-medium">Current</p>
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                  <VideoPlayer videoUrl={currentVideo.video_url} />
                </div>
              </div>

              {/* Previous Video */}
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-medium">Previous</p>
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                  <VideoPlayer videoUrl={editHistory.find(h => !h.is_current)?.video_url || currentVideo.video_url} />
                </div>
              </div>
            </div>
          ) : (
            // Centered layout when no previous version
            <div className="max-w-2xl mx-auto mb-3">
              <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <VideoPlayer videoUrl={currentVideo.video_url} />
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
    </div>
  )
}
