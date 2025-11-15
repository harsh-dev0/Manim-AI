import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import mongoose from "mongoose"
import VideoModel from "@/models/Video"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params

    await db.connectToDatabase()

    if (!mongoose.models.Video) {
      await import("@/models/Video")
    }

    const video = await VideoModel.findOne({
      id: videoId,
      status: "completed",
      video_url: { $exists: true, $ne: null },
    })
      .select("id title video_url createdAt")
      .lean()
      .exec()

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error fetching public video:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

