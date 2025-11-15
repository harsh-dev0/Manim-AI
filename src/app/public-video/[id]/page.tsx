"use client"
import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import VideoPlayer from "@/components/VideoPlayer"
import { ArrowLeft, Download, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Video {
  id: string
  title?: string
  video_url: string
  createdAt?: string
}

export default function PublicVideoPage() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.id as string
  
  const [video, setVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const loadVideo = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/videos/public/${videoId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Video not found")
          } else {
            setError("Failed to load video")
          }
          setIsLoading(false)
          return
        }

        const videoData = await response.json()
        setVideo(videoData)
        setError(null)
      } catch (err) {
        console.error("Error loading video:", err)
        setError("Failed to load video. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    if (videoId) {
      loadVideo()
    }
  }, [videoId])

  const handleDownload = () => {
    if (video?.video_url) {
      const link = document.createElement('a')
      link.href = video.video_url
      link.download = `${video.title || 'animation'}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast({
        title: "Download started",
        description: "Your video download has begun.",
      })
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/public-video/${videoId}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: video?.title || "Manim AI Animation",
          text: `Check out this animation: ${video?.title || "Untitled Animation"}`,
          url: url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast({
          title: "Link copied!",
          description: "Video link has been copied to clipboard.",
        })
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url)
          toast({
            title: "Link copied!",
            description: "Video link has been copied to clipboard.",
          })
        } catch {
          toast({
            title: "Error",
            description: "Failed to share link. Please try again.",
            variant: "destructive",
          })
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <Header />
        <main className="flex-1 container py-4 sm:py-8 px-4 sm:px-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <p className="text-slate-300 text-sm sm:text-base">Loading video...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <Header />
        <main className="flex-1 container py-4 sm:py-8 px-4 sm:px-6 flex items-center justify-center">
          <div className="bg-slate-900/50 text-white border border-cyan-700/30 rounded-xl p-6 sm:p-8 text-center max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-cyan-400">
              {error || "Video Not Found"}
            </h2>
            <p className="text-slate-300 mb-4 sm:mb-6 text-sm sm:text-base">
              {error || "The requested video could not be found."}
            </p>
            <button
              onClick={() => router.push("/public-gallery")}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-2 px-4 shadow-lg border border-cyan-400/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Gallery
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />
      <main className="flex-1 container py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/public-gallery")}
            className="inline-flex items-center justify-center gap-2 mb-4 sm:mb-6 text-slate-300 hover:text-white transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gallery
          </button>

          <div className="bg-slate-900/50 border border-cyan-700/30 rounded-xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-cyan-300 flex-1 break-words">
                {video.title || "Untitled Animation"}
              </h1>
              <div className="flex flex-col sm:flex-row gap-2 sm:ml-4 w-full sm:w-auto">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-2 px-3 sm:px-4 shadow-lg border border-cyan-400/20 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-2 px-3 sm:px-4 shadow-lg border border-cyan-400/20 w-full sm:w-auto"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
            
            <div className="aspect-video rounded-md overflow-hidden bg-slate-950 mb-3 sm:mb-4">
              <VideoPlayer videoUrl={video.video_url} />
            </div>

            {video.createdAt && (
              <p className="text-xs sm:text-sm text-slate-400">
                Created: {new Date(video.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

