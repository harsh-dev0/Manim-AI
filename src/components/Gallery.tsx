"use client"
import React, { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  LogIn,
  MoreVertical,
  Trash2,
  Edit,
  FileText,
  X,
  Check,
} from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import VideoPlayer from "@/components/VideoPlayer"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { UserVideo } from "@/types/next-auth"

interface EditDialogState {
  isOpen: boolean
  videoId: string | null
  title: string
  description: string
  mode: "title" | "description" | null
}

export function Gallery() {
  const { data: session, update } = useSession()
  console.log(session)

  const router = useRouter()
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editDialog, setEditDialog] = useState<EditDialogState>({
    isOpen: false,
    videoId: null,
    title: "",
    description: "",
    mode: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

  const handleSignIn = () => {
    router.push("/sign-in")
  }

  const handleDeleteVideo = useCallback(
    async (videoId: string) => {
      if (!session?.user) return

      try {
        setDeletingId(videoId)
        setOpenDropdownId(null) // Close dropdown

        const response = await fetch(`/api/videos?id=${videoId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error("Failed to delete video")
        }

        // Update the session to reflect the deleted video
        if (session.user.videos) {
          const updatedVideos = session.user.videos.filter(
            (video) => video.id !== videoId
          )
          session.user.videos = updatedVideos
          await update({ videos: updatedVideos })
        }

        toast({
          title: "Video deleted",
          description: "The video has been removed from your gallery",
        })

        router.refresh()
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
    },
    [session, update, toast, router]
  )

  const openEditTitleDialog = useCallback((video: UserVideo) => {
    setOpenDropdownId(null) // Close dropdown
    setEditDialog({
      isOpen: true,
      videoId: video.id,
      title: video.title || "",
      description: video.description || "",
      mode: "title",
    })
  }, [])

  const openEditDescriptionDialog = useCallback((video: UserVideo) => {
    setOpenDropdownId(null) // Close dropdown
    setEditDialog({
      isOpen: true,
      videoId: video.id,
      title: video.title || "",
      description: video.description || "",
      mode: "description",
    })
  }, [])

  const closeEditDialog = useCallback(() => {
    setEditDialog({
      isOpen: false,
      videoId: null,
      title: "",
      description: "",
      mode: null,
    })
  }, [])

  const handleSaveChanges = useCallback(async () => {
    if (!editDialog.videoId || !session?.user) return

    try {
      setIsSubmitting(true)

      const payload: { id: string; title?: string; description?: string } =
        {
          id: editDialog.videoId,
        }

      if (editDialog.mode === "title") {
        payload.title = editDialog.title
      } else if (editDialog.mode === "description") {
        payload.description = editDialog.description
      }

      const response = await fetch("/api/videos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to update video")
      }

      const updatedVideo = await response.json()

      // Update the session to reflect the changes
      if (session.user.videos) {
        const updatedVideos = session.user.videos.map((video) =>
          video.id === editDialog.videoId
            ? { ...video, ...updatedVideo }
            : video
        )
        session.user.videos = updatedVideos
        await update({ videos: updatedVideos })
      }

      toast({
        title: "Changes saved",
        description:
          editDialog.mode === "title"
            ? "Video title has been updated"
            : "Video description has been updated",
      })

      closeEditDialog()
      router.refresh()
    } catch (error) {
      console.error("Error updating video:", error)
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [editDialog, session, update, toast, closeEditDialog, router])

  if (!session?.user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
        <Header />
        <main className="flex-1 container py-8 flex flex-col items-center justify-center">
          <div className="bg-slate-900/50 text-white border border-cyan-700/30 rounded-xl p-8 text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">
              Sign In Required
            </h2>
            <p className="text-slate-300 mb-6">
              Please sign in to view your animation gallery
            </p>
            <Button
              onClick={handleSignIn}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-2 px-4 rounded-xl font-medium text-base shadow-lg border border-cyan-400/20"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const userVideos = session.user.videos || []

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-cyan-400">
            Your Animation Gallery
            <span className="text-2xl ml-2 text-cyan-300/70">
              ({session.user.videoCount || userVideos.length})
            </span>
          </h1>

          {userVideos.length === 0 ? (
            <div className="bg-slate-900/50 text-white border border-cyan-700/30 rounded-xl p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">
                No Animations Yet
              </h2>
              <p className="text-slate-300 mb-6">
                Generate your first animation to start building your
                gallery
              </p>
              <Button
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-2 px-4 rounded-xl font-medium text-base shadow-lg border border-cyan-400/20"
              >
                Create Animation
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userVideos.map((video: UserVideo) => (
                <Card
                  key={video.id}
                  className="bg-slate-900/50 border-cyan-700/30 overflow-hidden"
                >
                  <CardHeader className="pb-3 pr-14 relative">
                    <CardTitle className="text-lg text-cyan-300 mb-2 leading-snug">
                      {video.title || "Untitled Animation"}
                    </CardTitle>
                    <div className="min-h-[3rem]">
                      <CardDescription className="text-slate-400 text-sm leading-relaxed">
                        {video.description &&
                        video.description.trim() !== ""
                          ? video.description
                          : "No description added yet"}
                      </CardDescription>
                    </div>
                    <div className="absolute right-4 top-4 z-10">
                      <DropdownMenu
                        open={openDropdownId === video.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setOpenDropdownId(video.id)
                          } else {
                            setOpenDropdownId(null)
                          }
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-slate-900/95 border-slate-800 backdrop-blur-sm"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <DropdownMenuItem
                            className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openEditTitleDialog(video)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Title
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openEditDescriptionDialog(video)
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {video.description &&
                            video.description.trim() !== ""
                              ? "Edit Description"
                              : "Add Description"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-800" />
                          <DropdownMenuItem
                            disabled={deletingId === video.id}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/50 focus:bg-red-950/50"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteVideo(video.id)
                            }}
                          >
                            {deletingId === video.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-400 rounded-full animate-spin mr-2"></div>
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {video.video_url ? (
                      <div className="aspect-video rounded-md overflow-hidden bg-slate-950 mb-3">
                        <VideoPlayer videoUrl={video.video_url} />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-md flex items-center justify-center bg-slate-950 text-slate-500 mb-3">
                        {video.status === "processing"
                          ? "Processing..."
                          : "No video available"}
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span className="capitalize font-medium">
                        Status:{" "}
                        <span className="text-cyan-400">
                          {video.status}
                        </span>
                      </span>
                      {video.createdAt && (
                        <span>
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={editDialog.isOpen}
        onOpenChange={(open) => !open && closeEditDialog()}
      >
        <DialogContent className="bg-slate-900 text-white border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">
              {editDialog.mode === "title"
                ? "Edit Title"
                : "Edit Description"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editDialog.mode === "title"
                ? "Update the title of your animation."
                : "Add or update the description for your animation."}
            </DialogDescription>
          </DialogHeader>

          {editDialog.mode === "title" ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-300">
                  Title
                </Label>
                <Input
                  id="title"
                  placeholder="Enter a title for your animation"
                  value={editDialog.title}
                  onChange={(e) =>
                    setEditDialog({ ...editDialog, title: e.target.value })
                  }
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your animation..."
                  value={editDialog.description}
                  onChange={(e) =>
                    setEditDialog({
                      ...editDialog,
                      description: e.target.value,
                    })
                  }
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px] resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeEditDialog}
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
