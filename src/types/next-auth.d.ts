import { DefaultSession, DefaultUser } from "next-auth"

export interface UserVideo {
  id: string
  status: string
  video_url?: string
  title?: string
  description?: string
  error?: string | null
  createdAt?: Date
  updatedAt?: Date
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      username?: string | null
      videos?: UserVideo[]
      videoCount?: number
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    username?: string | null
    videos?: UserVideo[]
    videoCount?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username?: string | null
    videos?: UserVideo[]
    videoCount?: number
  }
}
