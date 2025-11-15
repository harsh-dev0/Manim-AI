"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import VideoPlayer from "@/components/VideoPlayer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"

const ADMIN_EMAIL = "hp7058287@gmail.com"
const VIDEOS_PER_LOAD = 18

interface Video {
  id: string
  title?: string
  video_url: string
  createdAt: string
}

export default function PublicGalleryPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalVideos, setTotalVideos] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  const fetchVideos = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (fetchingRef.current) return
    
    try {
      fetchingRef.current = true
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const response = await fetch(`/api/videos/public?offset=${offset}&limit=${VIDEOS_PER_LOAD}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch videos")
      }

      const data = await response.json()
      
      if (append) {
        setVideos((prev) => [...prev, ...data.videos])
      } else {
        setVideos(data.videos)
      }
      
      setTotalVideos(data.pagination.total)
      setHasMore(data.pagination.hasMore)
      setError(null)
    } catch (err) {
      console.error("Error fetching videos:", err)
      setError("Failed to load videos. Please try again later.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchVideos(0, false)
  }, [fetchVideos])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !fetchingRef.current) {
          fetchVideos(videos.length, true)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, videos.length, fetchVideos])

  const handleVideoClick = (videoId: string) => {
    router.push(`/public-video/${videoId}`)
  }

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
      setTotalVideos((prev) => prev - 1)
      
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
            Public Gallery
          </h1>

          {error && (
            <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 mb-6 text-red-400">
              {error}
            </div>
          )}

          {videos.length === 0 && !loading ? (
            <div className="bg-slate-900/50 text-white border border-cyan-700/30 rounded-xl p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">No Videos Available</h2>
              <p className="text-slate-300">
                There are no videos in the public gallery yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video) => (
                  <Card
                    key={video.id}
                    className="bg-slate-900/50 border-cyan-700/30 overflow-hidden cursor-pointer hover:border-cyan-500/50 transition-colors relative"
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
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-cyan-300 line-clamp-2">
                        {video.title || "Untitled Animation"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="aspect-video rounded-md overflow-hidden bg-slate-950">
                        <VideoPlayer videoUrl={video.video_url} />
                      </div>
                      {video.createdAt && (
                        <div className="mt-3 text-xs text-slate-400">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {totalVideos > 0 && (
                <div className="mt-6 text-center text-slate-400">
                  <p>
                    Showing {videos.length} of {totalVideos} videos
                  </p>
                </div>
              )}

              <div ref={observerTarget} className="h-10 flex items-center justify-center mt-6">
                {loadingMore && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm">Loading more videos...</p>
                  </div>
                )}
                {!hasMore && videos.length > 0 && (
                  <p className="text-slate-400 text-sm">No more videos to load</p>
                )}
              </div>

            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

