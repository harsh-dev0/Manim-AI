"use client"
import { useParams } from "next/navigation"
import RouteProtection from "@/components/RouteProtection"
import { EditVideo } from "@/components/EditVideo"

export default function EditVideoPage() {
  const params = useParams()
  const videoId = params.id as string

  return (
    <RouteProtection authRequired={true} redirectTo="/sign-in">
      <EditVideo videoId={videoId} />
    </RouteProtection>
  )
}
