import mongoose, { Schema, Document } from "mongoose"

export interface IVideo extends Document {
  id: string
  userId: string
  status: string
  video_url?: string
  title?: string
  description?: string
  error?: string
  createdAt: Date
  updatedAt: Date
}

const VideoSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    video_url: { type: String },
    title: { type: String },
    description: { type: String },
    error: { type: String },
  },
  { timestamps: true }
)

export default mongoose.models.Video ||
  mongoose.model<IVideo>("Video", VideoSchema)
