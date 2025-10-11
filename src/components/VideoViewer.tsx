"use client"
import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Edit, Download, Loader2, Sparkles } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import VideoPlayer from "@/components/VideoPlayer"
import { useToast } from "@/hooks/use-toast"
import { UserVideo } from "@/types/next-auth"
import { generateAnimation, checkGenerationStatus, getErrorMessage } from "@/services"

interface VideoViewerProps {
  videoId: string
}

export function VideoViewer({ videoId }: VideoViewerProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [video, setVideo] = useState<UserVideo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newPrompt, setNewPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [cameFromGallery, setCameFromGallery] = useState(false)

  useEffect(() => {
    const loadVideo = async () => {
      if (!session?.user) return

      // Check if user came from gallery (referrer check) - do this inside loadVideo
      if (typeof window !== 'undefined') {
        const referrer = document.referrer
        const fromGallery = referrer.includes('/gallery')
        setCameFromGallery(fromGallery)
      }

      try {
        // First try to find in session data
        if (session.user.videos) {
          const foundVideo = session.user.videos.find(v => v.id === videoId)
          if (foundVideo) {
            setVideo(foundVideo)
            setIsLoading(false)
            return
          }
        }

        // If not found in session, fetch from database
        const response = await fetch(`/api/videos/${videoId}`)
        if (response.ok) {
          const videoData = await response.json()
          setVideo(videoData)
          setIsLoading(false)
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

  const handleEdit = () => {
    router.push(`/edit/${videoId}`)
  }

  // const handleShare = async () => {
  //   const url = `${window.location.origin}/video/${videoId}`
  //   try {
  //     await navigator.clipboard.writeText(url)
  //     toast({
  //       title: "Link copied!",
  //       description: "Video link has been copied to clipboard.",
  //     })
  //   } catch {
  //     toast({
  //       title: "Error",
  //       description: "Failed to copy link. Please try again.",
  //       variant: "destructive",
  //     })
  //   }
  // }

  const handleDownload = () => {
    if (video?.video_url) {
      const link = document.createElement('a')
      link.href = video.video_url
      link.download = `${video.title || 'animation'}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleGenerateNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPrompt.trim() || !session?.user || isGenerating) return

    setIsGenerating(true)
    try {
      const response = await generateAnimation(newPrompt, session.user.id)
      const jobId = response.id

      const checkInterval = setInterval(async () => {
        const status = await checkGenerationStatus(jobId)
        
        if (status.status === "completed") {
          clearInterval(checkInterval)
          
          let videoUrl = status.video_url || ""
          if (!videoUrl.startsWith("http")) {
            videoUrl = `https://manim-ai-videos.s3.amazonaws.com/videos/${status.id}.mp4`
          }

          toast({
            title: "Animation generated!",
            description: "Your new animation is ready to view.",
          })

          // Redirect to new video page
          router.push(`/video/${status.id}`)
          setIsGenerating(false)
        } else if (status.status === "failed") {
          clearInterval(checkInterval)
          const errorMessage = getErrorMessage(status.error_type)
          toast({
            title: "Generation Failed",
            description: errorMessage,
            variant: "destructive",
          })
          setIsGenerating(false)
        }
      }, 3000)
    } catch (error) {
      console.error("Error generating animation:", error)
      toast({
        title: "Error",
        description: "Failed to generate animation. Please try again.",
        variant: "destructive",
      })
      setIsGenerating(false)
    }
  }

  if (isLoading) {
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

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <Header />
        <main className="flex-1 container flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Video Not Found</h1>
            <p className="text-slate-300 mb-6">The requested video could not be found.</p>
            <Button
              onClick={() => router.push("/gallery")}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Gallery
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />
      
      <main className="flex-1 container py-2">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-3">
            <Button
              variant="ghost"
              onClick={() => router.push(cameFromGallery ? "/gallery" : "/")}
              className="text-slate-300 hover:text-cyan-400"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {cameFromGallery ? "Back to Gallery" : "Back to Home"}
            </Button>
            <div>
              <h1 className="text-lg font-bold text-cyan-400">
                {video.title || "Untitled Animation"}
              </h1>
              <p className="text-xs text-slate-400">
                Created {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : "recently"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main Video Area */}
            <div className="lg:col-span-3">
              {/* Video Player */}
              <div className="aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <VideoPlayer videoUrl={video.video_url!} />
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {/* Video Details */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-cyan-300">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-400">Status:</span>
                    <span className={`ml-2 capitalize font-medium ${
                      video.status === "completed" ? "text-green-400" : 
                      video.status === "processing" ? "text-yellow-400" : 
                      "text-red-400"
                    }`}>
                      {video.status}
                    </span>
                  </div>
                  {video.description && (
                    <div>
                      <span className="text-sm text-slate-400">Description:</span>
                      <p className="text-slate-300 text-sm mt-1">{video.description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-slate-400">Video ID:</span>
                    <p className="text-slate-300 font-mono text-xs">{video.id}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-cyan-300">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handleEdit}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Animation
                  </Button>
                  {/*<Button
                    variant="outline"
                    onClick={handleShare}
                    className="w-full border-slate-600 text-black hover:text-white hover:bg-slate-700 hover:border-slate-500"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share Video
                  </Button>*/}
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="w-full border-slate-600 text-black hover:text-white hover:bg-slate-700 hover:border-slate-500"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download MP4
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Full Width Generate Section */}
          <div className="mt-4 space-y-3">
            <form onSubmit={handleGenerateNew} className="space-y-3">
              <Textarea
                placeholder="Describe your new mathematical animation (e.g., 'Visualize the Fourier transform', 'Show Pythagorean theorem proof'...)"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className="w-full bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] rounded-lg p-4"
                disabled={isGenerating}
              />
              <Button
                type="submit"
                disabled={!newPrompt.trim() || isGenerating}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 py-6"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Animation
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
