import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import mongoose from "mongoose"
import VideoModel from "@/models/Video"
import { getAuthSession } from "@/lib/auth"

const ADMIN_EMAIL = "hp7058287@gmail.com"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fetchAll = searchParams.get("all") === "true"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "1000")
    const skip = (page - 1) * limit

    await db.connectToDatabase()

    if (!mongoose.models.Video) {
      await import("@/models/Video")
    }

    const query = VideoModel.find({
      status: "completed",
      video_url: { $exists: true, $ne: null },
    })
      .select("id title video_url createdAt")
      .sort({ createdAt: -1 })

    if (fetchAll) {
      const totalVideos = await VideoModel.countDocuments({
        status: "completed",
        video_url: { $exists: true, $ne: null },
      })
      
      const allVideos = await VideoModel.find({
        status: "completed",
        video_url: { $exists: true, $ne: null },
      })
        .select("id title video_url createdAt")
        .sort({ createdAt: -1 })
        .lean()
        .exec()

      return NextResponse.json({
        videos: allVideos,
        pagination: {
          page: 1,
          limit: allVideos.length,
          total: totalVideos,
          totalPages: 1,
          hasMore: false,
        },
      })
    }

    const videos = await query.skip(skip).limit(limit).exec()

    const totalVideos = await VideoModel.countDocuments({
      status: "completed",
      video_url: { $exists: true, $ne: null },
    })

    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total: totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
        hasMore: skip + videos.length < totalVideos,
      },
    })
  } catch (error) {
    console.error("Error fetching public videos:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    if (session.user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const videoId = searchParams.get("id")

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      )
    }

    await db.connectToDatabase()

    if (!mongoose.models.Video) {
      await import("@/models/Video")
    }

    const video = await VideoModel.findOne({ id: videoId })

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      )
    }

    await VideoModel.deleteOne({ id: videoId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting video:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

