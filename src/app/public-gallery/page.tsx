"use client"
import React, { useState, useEffect, useCallback, useRef, Suspense } from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import VideoPlayer from "@/components/VideoPlayer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"

const ADMIN_EMAIL = "hp7058287@gmail.com"
const VIDEOS_PER_PAGE = 12
const INITIAL_LOAD = 3
const SECOND_LOAD = 3

interface Video {
  id: string
  title?: string
  video_url: string
  createdAt: string
}

function PublicGalleryContent() {
  const searchParams = useSearchParams()
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"))
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreInPage, setHasMoreInPage] = useState(true)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)
  const observerTarget = useRef<HTMLDivElement>(null)
  const initialLoadRef = useRef(false)
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  const fetchVideos = useCallback(async (page: number, offset: number = 0, append: boolean = false) => {
    if (fetchingRef.current && !append) return
    
    try {
      fetchingRef.current = true
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const limit = append ? SECOND_LOAD : INITIAL_LOAD
      const response = await fetch(`/api/videos/public?page=${page}&offset=${offset}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch videos")
      }

      const data = await response.json()
      
      if (append) {
        setVideos((prev) => [...prev, ...data.videos])
      } else {
        setVideos(data.videos)
      }
      
      setHasMoreInPage(data.pagination.hasMoreInPage)
      setHasNextPage(data.pagination.hasNextPage)
      setTotalPages(data.pagination.totalPages)
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
    const page = parseInt(searchParams.get("page") || "1")
    setCurrentPage(page)
    setVideos([])
    initialLoadRef.current = true
    fetchVideos(page, 0, false)
  }, [searchParams, fetchVideos])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreInPage && !loadingMore && !fetchingRef.current && videos.length < VIDEOS_PER_PAGE) {
          fetchVideos(currentPage, videos.length, true)
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
  }, [hasMoreInPage, loadingMore, videos.length, currentPage, fetchVideos])

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return
    setCurrentPage(newPage)
    router.push(`/public-gallery?page=${newPage}`)
    setVideos([])
    fetchVideos(newPage, 0, false)
  }

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
      <main className="flex-1 container py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-cyan-400">
            Public Gallery
          </h1>

          {error && (
            <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-red-400 text-sm sm:text-base">
              {error}
            </div>
          )}

          {videos.length === 0 && !loading ? (
            <div className="bg-slate-900/50 text-white border border-cyan-700/30 rounded-xl p-6 sm:p-8 text-center">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">No Videos Available</h2>
              <p className="text-slate-300 text-sm sm:text-base">
                There are no videos in the public gallery yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
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
                        className="absolute top-2 right-2 z-10 h-7 w-7 sm:h-8 sm:w-8 text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        onClick={(e) => handleDelete(video.id, e)}
                        disabled={deletingId === video.id}
                      >
                        {deletingId === video.id ? (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-300/30 border-t-red-400 rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    )}
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                      <CardTitle className="text-base sm:text-lg text-cyan-300 line-clamp-2">
                        {video.title || "Untitled Animation"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
                      <div className="aspect-video rounded-md overflow-hidden bg-slate-950">
                        <VideoPlayer videoUrl={video.video_url} />
                      </div>
                      {video.createdAt && (
                        <div className="mt-2 sm:mt-3 text-xs text-slate-400">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div ref={observerTarget} className="h-10 flex items-center justify-center mt-6">
                {loadingMore && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 text-sm">Loading more videos...</p>
                  </div>
                )}
              </div>

              <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-medium border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </Button>

                {currentPage > 1 && (
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-medium border border-slate-700"
                  >
                    {currentPage - 1}
                  </Button>
                )}

                <Button
                  disabled
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium border border-cyan-400/20 cursor-default"
                >
                  {currentPage}
                </Button>

                {hasNextPage && (
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-medium border border-slate-700"
                  >
                    {currentPage + 1}
                  </Button>
                )}

                <Button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-medium border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </Button>
              </div>

            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function PublicGalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
          <Header />
          <main className="flex-1 container py-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <p className="text-slate-300">Loading...</p>
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <PublicGalleryContent />
    </Suspense>
  )
}

