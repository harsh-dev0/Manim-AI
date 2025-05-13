import axios from "axios"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface GenerationRequest {
  prompt: string
}

export interface GenerationResponse {
  id: string
  status: string
  video_url?: string
  code?: string
  title?: string
  error?: string
}

// API client
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
    const response = await apiClient.get<GenerationResponse>(
      `/status/${jobId}`
    )
    return response.data
  } catch (error) {
    console.error("Error checking generation status:", error)
    throw error
  }
}

export const downloadVideo = (jobId: string): string => {
  return `${API_BASE_URL}/download/${jobId}`
}
