import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!

export interface GenerationRequest {
  prompt: string
  userId?: string
}

export interface GenerationResponse {
  id: string
  status: string
  video_url?: string
  title?: string
  error?: string
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// API functions
export const generateAnimation = async (
  prompt: string,
  userId?: string
): Promise<GenerationResponse> => {
  try {
    console.log("Sending generation request with prompt:", prompt)
    const response = await apiClient.post<GenerationResponse>(
      "/generate",
      { prompt, userId }
    )
    console.log("Generation response received:", response.data)

    // Store job ID in localStorage for recovery if needed
    const jobIds = JSON.parse(
      localStorage.getItem("visuamath_job_ids") || "[]"
    )
    jobIds.push(response.data.id)
    localStorage.setItem("visuamath_job_ids", JSON.stringify(jobIds))

    // If user is logged in, save video to database
    if (userId && response.data.id) {
      try {
        await saveVideoToDatabase(response.data, userId)
      } catch (dbError) {
        console.error("Error saving video to database:", dbError)
      }
    }

    return response.data
  } catch (error) {
    console.error("Error generating animation:", error)
    if (axios.isAxiosError(error)) {
      console.error("API error details:", error.response?.data)
    }
    throw error
  }
}

export const checkGenerationStatus = async (
  jobId: string,
  userId?: string
): Promise<GenerationResponse> => {
  try {
    console.log(`Checking status for job: ${jobId}`)
    const response = await apiClient.get<GenerationResponse>(
      `/status/${jobId}`
    )
    console.log(`Status response for job ${jobId}:`, response.data)

    // If status is completed and user is logged in, update the video in database
    if (userId && response.data.status === "completed") {
      try {
        await saveVideoToDatabase(response.data, userId)
      } catch (dbError) {
        console.error("Error updating video in database:", dbError)
      }
    }

    return response.data
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to check status"
    console.error(`Error checking status for job ${jobId}:`, error)
    if (axios.isAxiosError(error)) {
      console.error("API error details:", error.response?.data)
    }
    return {
      id: jobId,
      status: "error",
      error: errorMessage,
    }
  }
}

// Helper function to save/update video in database
async function saveVideoToDatabase(
  video: GenerationResponse,
  userId: string
) {
  try {
    const response = await fetch("/api/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...video,
        userId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to save video: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error saving video to database:", error)
    throw error
  }
}

// Helper function to recover job IDs if needed
export const getStoredJobIds = (): string[] => {
  return JSON.parse(localStorage.getItem("visuamath_job_ids") || "[]")
}
