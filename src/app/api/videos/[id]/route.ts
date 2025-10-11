import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import mongoose from "mongoose"
import VideoModel from "@/models/Video"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: videoId } = await params

    // Connect to database
    await db.connectToDatabase()

    // Ensure Video model is registered
    if (!mongoose.models.Video) {
      await import("@/models/Video")
    }

    // Find the video
    const video = await VideoModel.findOne({
      id: videoId,
      userId: session.user.id,
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error fetching video:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
