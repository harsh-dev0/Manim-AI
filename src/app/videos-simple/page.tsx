"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import VideoPlayer from "@/components/VideoPlayer"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Video {
  id: string
  title?: string
  video_url: string
}

const ADMIN_EMAIL = "hp7058287@gmail.com"

export default function VideosSimplePage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fetchingRef = useRef(false)
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  const handleVideoClick = (videoId: string) => {
    router.push(`/public-video/${videoId}`)
  }

  const fetchVideos = useCallback(async () => {
    if (fetchingRef.current) return
    
    try {
      fetchingRef.current = true
      setLoading(true)

      const response = await fetch(`/api/videos/public?all=true`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch videos")
      }

      const data = await response.json()
      
      setVideos(data.videos)
      setLoading(false)
    } catch (err) {
      console.error("Error fetching videos:", err)
      setLoading(false)
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const handleDelete = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!isAdmin) return

    try {
      setDeletingId(videoId)

      const response = await fetch(`/api/videos/public?id=${videoId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete video")
      }

      setVideos((prev) => prev.filter((video) => video.id !== videoId))
      
      toast({
        title: "Video deleted",
        description: "The video has been removed from the public gallery",
      })
    } catch (error) {
      console.error("Error deleting video:", error)
      toast({
        title: "Error",
        description: "Failed to delete the video. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <Header />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <p className="text-slate-300">Loading videos...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-cyan-400">
            All Videos
          </h1>

          {videos.length === 0 ? (
            <div className="bg-slate-900/50 text-white border border-cyan-700/30 rounded-xl p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">No Videos Available</h2>
              <p className="text-slate-300">
                There are no videos available yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className="bg-slate-900/50 border border-cyan-700/30 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-colors relative cursor-pointer"
                    onClick={() => handleVideoClick(video.id)}
                  >
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 z-10 h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        onClick={(e) => handleDelete(video.id, e)}
                        disabled={deletingId === video.id}
                      >
                        {deletingId === video.id ? (
                          <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-400 rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-cyan-300 mb-2 line-clamp-2">
                        {video.title || "Untitled Animation"}
                      </h3>
                      <p className="text-xs text-slate-400 mb-3">ID: {video.id}</p>
                      <div className="aspect-video rounded-md overflow-hidden bg-slate-950">
                        <VideoPlayer videoUrl={video.video_url} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

