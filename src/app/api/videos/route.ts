import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { db } from "@/lib/db"
import mongoose from "mongoose"
import VideoModel from "@/models/Video"

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { id, status, video_url, title, error, userId, description } =
      body

    // Validate required fields
    if (!id || !status || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Ensure the userId matches the authenticated user
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Connect to database
    await db.connectToDatabase()

    // Ensure Video model is registered
    if (!mongoose.models.Video) {
      // Import the model dynamically
      await import("@/models/Video")
    }

    // Check if video already exists
    const existingVideo = await VideoModel.findOne({ id })

    if (existingVideo) {
      // Update existing video
      existingVideo.status = status
      if (video_url) existingVideo.video_url = video_url
      if (title) existingVideo.title = title
      if (error !== undefined) existingVideo.error = error
      if (description !== undefined)
        existingVideo.description = description

      await existingVideo.save()

      return NextResponse.json(existingVideo)
    } else {
      // Create new video
      const newVideo = new VideoModel({
        id,
        userId,
        status,
        video_url,
        title,
        error,
        description,
      })

      await newVideo.save()

      return NextResponse.json(newVideo)
    }
  } catch (error) {
    console.error("Error in videos API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession()

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { id, title, description } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      )
    }

    // Connect to database
    await db.connectToDatabase()

    // Ensure Video model is registered
    if (!mongoose.models.Video) {
      await import("@/models/Video")
    }

    // Find the video
    const video = await VideoModel.findOne({ id })

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      )
    }

    // Check if the video belongs to the authenticated user
    if (video.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update the video
    if (title !== undefined) video.title = title
    if (description !== undefined) video.description = description

    await video.save()

    return NextResponse.json(video)
  } catch (error) {
    console.error("Error updating video:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getAuthSession()

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Connect to database
    await db.connectToDatabase()

    // Get videos for the authenticated user
    const videos = await VideoModel.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .exec()

    return NextResponse.json(videos)
  } catch (error) {
    console.error("Error fetching videos:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession()

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get video ID from the URL
    const { searchParams } = new URL(req.url)
    const videoId = searchParams.get("id")

    if (!videoId) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      )
    }

    // Connect to database
    await db.connectToDatabase()

    // Ensure Video model is registered
    if (!mongoose.models.Video) {
      await import("@/models/Video")
    }

    // Find the video
    const video = await VideoModel.findOne({ id: videoId })

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      )
    }

    // Check if the video belongs to the authenticated user
    if (video.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the video
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
