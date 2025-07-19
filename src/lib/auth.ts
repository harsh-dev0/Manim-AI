import { db } from "@/lib/db"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { nanoid } from "nanoid"
import { NextAuthOptions, getServerSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoClient } from "mongodb"
import { UserVideo } from "@/types/next-auth"

const client = new MongoClient(
  process.env.MONGODB_URI || "mongodb://localhost:27017/manim"
)
const clientPromise = client.connect()

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
        session.user.username = token.username
        session.user.videos = token.videos || []
        session.user.videoCount = token.videoCount || 0
      }

      return session
    },

    async jwt({ token, user }) {
      // Connect to database
      await db.connectToDatabase()

      // Use MongoDB client to find user
      const database = (await clientPromise).db()
      const usersCollection = database.collection("users")
      const videosCollection = database.collection("videos")
      const dbUser = await usersCollection.findOne({ email: token.email })

      if (!dbUser) {
        token.id = user!.id
        return token
      }

      if (!dbUser.username) {
        await usersCollection.updateOne(
          { _id: dbUser._id },
          { $set: { username: nanoid(10) } }
        )
      }

      // Fetch user's videos
      const userVideos = await videosCollection
        .find({ userId: dbUser._id.toString() })
        .sort({ createdAt: -1 })
        .toArray()

      const videos: UserVideo[] = userVideos.map((video) => ({
        id: video.id,
        status: video.status,
        video_url: video.video_url,
        title: video.title,
        description: video.description,
        error: video.error,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
      }))

      // Calculate video count
      const videoCount = videos.length

      // Update videoCount in the users collection if it has changed
      if (dbUser.videoCount !== videoCount) {
        await usersCollection.updateOne(
          { _id: dbUser._id },
          { $set: { videoCount } }
        )
      }

      return {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        picture: dbUser.image,
        username: dbUser.username,
        videos: videos,
        videoCount: videoCount,
      }
    },
    redirect() {
      return "/"
    },
  },
}

export const getAuthSession = () => getServerSession(authOptions)
