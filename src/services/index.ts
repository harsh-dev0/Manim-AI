import axios from "axios"

const API_BASE_URL = "https://manimbe.onrender.com/"

export interface GenerationRequest {
  prompt: string
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
  prompt: string
): Promise<GenerationResponse> => {
  try {
    const response = await apiClient.post<GenerationResponse>(
      "/generate",
      { prompt }
    )
    // Store job ID in localStorage for recovery if needed
    const jobIds = JSON.parse(
      localStorage.getItem("visuamath_job_ids") || "[]"
    )
    jobIds.push(response.data.id)
    localStorage.setItem("visuamath_job_ids", JSON.stringify(jobIds))

    return response.data
  } catch (error) {
    console.error("Error generating animation:", error)
    throw error
  }
}

export const checkGenerationStatus = async (
  jobId: string
): Promise<GenerationResponse> => {
  try {
    console.log(`Checking status for job: ${jobId}`)
    const response = await apiClient.get<GenerationResponse>(
      `/status/${jobId}`
    )
    return response.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to check status";
    return {
      id: jobId,
      status: "error",
      error: errorMessage
    }
  }
}

// export const downloadVideo = (jobId: string): string => {
//   // Use local URL for development
//   return `http://127.0.0.1:8000/media/${jobId}.mp4`
// }

// Helper function to recover job IDs if needed
export const getStoredJobIds = (): string[] => {
  return JSON.parse(localStorage.getItem("visuamath_job_ids") || "[]")
}
