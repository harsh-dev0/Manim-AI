"use client"
import { useParams } from "next/navigation"
import { VideoViewer } from "@/components/VideoViewer"
import RouteProtection from "@/components/RouteProtection"

export default function VideoPage() {
  const params = useParams()
  const videoId = params.id as string

  return (
    <RouteProtection authRequired={true} redirectTo="/sign-in">
      <VideoViewer videoId={videoId} />
    </RouteProtection>
  )
}
