"use client"
import { Gallery } from "@/components/Gallery"
import RouteProtection from "@/components/RouteProtection"

export default function GalleryPage() {
  return (
    <RouteProtection authRequired={true} redirectTo="/sign-in">
      <Gallery />
    </RouteProtection>
  )
}
