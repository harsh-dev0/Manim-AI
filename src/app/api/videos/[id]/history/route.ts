import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import mongoose from "mongoose"
import VideoModel from "@/models/Video"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const videoId = params.id

    // Connect to database
    await db.connectToDatabase()

    // Ensure Video model is registered
    if (!mongoose.models.Video) {
      await import("@/models/Video")
    }

    // Get the main video to verify ownership
    const mainVideo = await VideoModel.findOne({
      id: videoId,
      userId: session.user.id,
    })

    if (!mainVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    // Get all versions of this video (including the main one and its children)
    const history = await VideoModel.find({
      $or: [
        { id: videoId },
        { parentVideoId: videoId }
      ],
      userId: session.user.id,
    })
    .sort({ createdAt: -1 })
    .select('id title video_url createdAt isCurrent editPrompt parentVideoId')

    // Format the history
    const formattedHistory = history.map((item, index) => ({
      id: item.id,
      prompt: item.editPrompt || item.title || `Version ${history.length - index}`,
      video_url: item.video_url,
      created_at: item.createdAt.toISOString(),
      is_current: item.isCurrent || index === 0,
    }))

    return NextResponse.json(formattedHistory)
  } catch (error) {
    console.error("Error fetching video history:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
