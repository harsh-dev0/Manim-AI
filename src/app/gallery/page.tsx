"use client"
import React, { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import VideoPlayer from "@/components/VideoPlayer"
import PromptInput from "@/components/PromptInput"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  Grid,
  List,
  Play,
  Calendar,
  // Eye,
  // Heart,
  // Share2,
  // Download
} from "lucide-react"
import { generateAnimation, checkGenerationStatus } from "@/services"

interface GalleryItem {
  id: string
  title: string
  // description: string
  videoUrl: string
  thumbnail: string
  createdAt: string
  duration: string
  // views: number
  // likes: number
  // tags: string[]
}

// Mock data for gallery items
const mockGalleryItems: GalleryItem[] = [
  {
    id: "1",
    title: "Quadratic Function Animation",
    // description: "Beautiful visualization of quadratic functions and their properties",
    videoUrl: "https://example.com/video1.mp4",
    thumbnail: "/api/placeholder/400/225",
    createdAt: "2024-01-15",
    duration: "2:30",
    // views: 1250,
    // likes: 89,
    // tags: ["algebra", "functions", "parabola"]
  },
  {
    id: "2",
    title: "Sine Wave Transformation",
    // description: "Interactive demonstration of sine wave transformations",
    videoUrl: "https://example.com/video2.mp4",
    thumbnail: "/api/placeholder/400/225",
    createdAt: "2024-01-14",
    duration: "3:15",
    // views: 890,
    // likes: 67,
    // tags: ["trigonometry", "waves", "transformation"]
  },
  {
    id: "3",
    title: "Matrix Multiplication",
    // description: "Step-by-step visualization of matrix multiplication process",
    videoUrl: "https://example.com/video3.mp4",
    thumbnail: "/api/placeholder/400/225",
    createdAt: "2024-01-13",
    duration: "4:20",
    // views: 2100,
    // likes: 156,
    // tags: ["linear algebra", "matrices", "multiplication"]
  },
  {
    id: "4",
    title: "Calculus Derivatives",
    // description: "Understanding derivatives through animated examples",
    videoUrl: "https://example.com/video4.mp4",
    thumbnail: "/api/placeholder/400/225",
    createdAt: "2024-01-12",
    duration: "5:45",
    // views: 1780,
    // likes: 123,
    // tags: ["calculus", "derivatives", "limits"]
  },
  {
    id: "5",
    title: "Geometric Transformations",
    // description: "Rotation, reflection, and translation animations",
    videoUrl: "https://example.com/video5.mp4",
    thumbnail: "/api/placeholder/400/225",
    createdAt: "2024-01-11",
    duration: "3:50",
    // views: 1456,
    // likes: 98,
    // tags: ["geometry", "transformations", "rotation"]
  },
  {
    id: "6",
    title: "Fibonacci Sequence",
    // description: "Visual representation of the Fibonacci sequence and golden ratio",
    videoUrl: "https://example.com/video6.mp4",
    thumbnail: "/api/placeholder/400/225",
    createdAt: "2024-01-10",
    duration: "4:10",
    // views: 3200,
    // likes: 234,
    // tags: ["sequences", "fibonacci", "golden ratio"]
  },
]

const Gallery = () => {
  const { toast } = useToast()
  const [galleryItems, setGalleryItems] =
    useState<GalleryItem[]>(mockGalleryItems)
  const [filteredItems, setFilteredItems] =
    useState<GalleryItem[]>(mockGalleryItems)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(
    null
  )
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isLoading, setIsLoading] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<string | null>(null)

  // Filter items based on search term
  useEffect(() => {
    const filtered = galleryItems.filter(
      (item) => item.title.toLowerCase().includes(searchTerm.toLowerCase())
      // || item.description.toLowerCase().includes(searchTerm.toLowerCase())
      // || item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredItems(filtered)
  }, [searchTerm, galleryItems])

  const handleGenerateAnimation = async (prompt: string) => {
    setIsLoading(true)

    try {
      const response = await generateAnimation(prompt)
      const jobId = response.id

      const checkInterval = setInterval(async () => {
        const status = await checkGenerationStatus(jobId)

        if (status.status === "completed") {
          clearInterval(checkInterval)

          let videoUrl = status.video_url || ""
          if (!videoUrl.startsWith("http")) {
            videoUrl = `https://manim-ai-videos.s3.amazonaws.com/videos/${status.id}.mp4`
          }

          setCurrentVideo(videoUrl)

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
      }, 3000)
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

  const handlePlayVideo = (item: GalleryItem) => {
    setSelectedItem(item)
    setCurrentVideo(item.videoUrl)
  }

  // {/* Like feature - commented out for now */}
  // const handleLike = (itemId: string) => {
  //   setGalleryItems(items =>
  //     items.map(item =>
  //       item.id === itemId ? { ...item, likes: item.likes + 1 } : item
  //     )
  //   )
  // }

  // {/* Share feature - commented out for now */}
  // const handleShare = (item: GalleryItem) => {
  //   if (navigator.share) {
  //     navigator.share({
  //       title: item.title,
  //       text: item.description,
  //       url: window.location.href
  //     })
  //   } else {
  //     navigator.clipboard.writeText(window.location.href)
  //     toast({
  //       title: "Link copied!",
  //       description: "Gallery link has been copied to clipboard.",
  //     })
  //   }
  // }

  const GalleryCard = ({ item }: { item: GalleryItem }) => (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 bg-slate-900/50 border-slate-800 hover:border-cyan-500/30">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-xl">
          <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-slate-400 text-sm">Video Thumbnail</div>
          </div>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              onClick={() => handlePlayVideo(item)}
              className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-3"
            >
              <Play className="w-6 h-6" />
            </Button>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {item.duration}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-white text-lg mb-2 line-clamp-2">
          {item.title}
        </CardTitle>

        {/* Description - commented out for now */}
        {/* <p className="text-slate-400 text-sm mb-3 line-clamp-2">
          {item.description}
        </p> */}

        {/* Tags - commented out for now */}
        {/* <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div> */}

        <div className="flex items-center justify-between text-slate-400 text-sm">
          {/* Views and Likes - commented out for now */}
          {/* <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{item.views.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{item.likes}</span>
            </div>
          </div> */}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Like and Share buttons - commented out for now */}
        {/* <div className="flex items-center gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLike(item.id)}
            className="flex-1 bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500"
          >
            <Heart className="w-4 h-4 mr-1" />
            Like
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare(item)}
            className="flex-1 bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </div> */}
      </CardContent>
    </Card>
  )

  const GalleryListItem = ({ item }: { item: GalleryItem }) => (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 bg-slate-900/50 border-slate-800 hover:border-cyan-500/30">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-32 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center">
              <div className="text-slate-400 text-xs">Thumbnail</div>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <Button
                onClick={() => handlePlayVideo(item)}
                className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-2"
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
              {item.duration}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white text-lg font-medium mb-1 line-clamp-1">
              {item.title}
            </h3>

            {/* Description - commented out for now */}
            {/* <p className="text-slate-400 text-sm mb-2 line-clamp-2">
              {item.description}
            </p> */}

            {/* Tags - commented out for now */}
            {/* <div className="flex flex-wrap gap-1 mb-2">
              {item.tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="bg-cyan-500/20 text-cyan-400 text-xs px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div> */}

            <div className="flex items-center justify-between text-slate-400 text-sm">
              {/* Views and Likes - commented out for now */}
              {/* <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{item.views.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span>{item.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div> */}

              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Like and Share buttons - commented out for now */}
              {/* <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLike(item.id)}
                  className="bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500"
                >
                  <Heart className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(item)}
                  className="bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div> */}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />

      <main className="flex-1 container py-6 px-4 sm:px-8">
        {/* Video Player Modal */}
        {currentVideo && (
          <div className="mb-6">
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-cyan-800/30 shadow-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedItem?.title || "Generated Animation"}
                  </h2>
                  {/* Description - commented out for now */}
                  {/* {selectedItem && (
                    <p className="text-slate-400 text-sm">
                      {selectedItem.description}
                    </p>
                  )} */}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentVideo(null)
                    setSelectedItem(null)
                  }}
                  className="bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-cyan-500"
                >
                  Close
                </Button>
              </div>
              <VideoPlayer videoUrl={currentVideo} />
            </div>
          </div>
        )}

        {/* Search and Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search animations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder-slate-400 focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setViewMode("grid")}
                className={`bg-transparent border-slate-700 ${
                  viewMode === "grid"
                    ? "text-cyan-400 border-cyan-500"
                    : "text-slate-400 hover:text-white hover:border-cyan-500"
                }`}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMode("list")}
                className={`bg-transparent border-slate-700 ${
                  viewMode === "list"
                    ? "text-cyan-400 border-cyan-500"
                    : "text-slate-400 hover:text-white hover:border-cyan-500"
                }`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Gallery Content */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">
              Animation Gallery
            </h2>
            <div className="text-slate-400 text-sm">
              {filteredItems.length} animations found
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 opacity-50">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No animations found
              </h3>
              <p className="text-slate-400">
                Try adjusting your search terms or browse all animations
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {filteredItems.map((item) =>
                viewMode === "grid" ? (
                  <GalleryCard key={item.id} item={item} />
                ) : (
                  <GalleryListItem key={item.id} item={item} />
                )
              )}
            </div>
          )}
        </div>

        {/* Create New Animation */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-cyan-800/30 shadow-xl p-4 sm:p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            Create New Animation
          </h3>
          <PromptInput
            onSubmit={handleGenerateAnimation}
            isLoading={isLoading}
            compact={true}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Gallery
