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
  code?: string
  previous_video_url?: string  
  previous_video_id?: string    
  error?: string
  error_type?: string
}

export interface EditRequest {
  code: string
  prompt: string
  previous_video_url?: string   
  previous_video_id?: string    
  userId?: string
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

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

    const jobIds = JSON.parse(
      localStorage.getItem("visuamath_job_ids") || "[]"
    )
    jobIds.push(response.data.id)
    localStorage.setItem("visuamath_job_ids", JSON.stringify(jobIds))

    // Only save to database if generation is successful
    if (userId && response.data.id && response.data.status === "completed" && response.data.video_url) {
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

    if (response.data.code) {
      console.log("Code received for job:", jobId)
    }
    
    if (response.data.previous_video_url) {
      console.log("This is an edited video. Previous URL:", response.data.previous_video_url)
    }

    if (response.data.error_type) {
      console.log(`Error type: ${response.data.error_type}`)
    }

    // Only save to database if generation is completed and has video_url
    if (userId && response.data.status === "completed" && response.data.video_url) {
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
      error_type: "NETWORK_ERROR"
    }
  }
}

export const editAnimation = async (
  code: string,
  prompt: string,
  previousVideoUrl?: string,
  previousVideoId?: string,
  userId?: string
): Promise<GenerationResponse> => {
  try {
    console.log("Sending edit request with prompt:", prompt)
    console.log("Previous video URL:", previousVideoUrl)
    console.log("Previous video ID:", previousVideoId)
    
    const response = await apiClient.post<GenerationResponse>(
      "/edit",
      { 
        code, 
        prompt, 
        previous_video_url: previousVideoUrl,
        previous_video_id: previousVideoId,
        userId 
      }
    )
    console.log("Edit response received:", response.data)

    const jobIds = JSON.parse(
      localStorage.getItem("visuamath_job_ids") || "[]"
    )
    jobIds.push(response.data.id)
    localStorage.setItem("visuamath_job_ids", JSON.stringify(jobIds))

    // Only save to database if edit is successful
    if (userId && response.data.id && response.data.status === "completed" && response.data.video_url) {
      try {
        await saveVideoToDatabase(response.data, userId, previousVideoId, prompt)
      } catch (dbError) {
        console.error("Error saving edited video to database:", dbError)
      }
    }

    return response.data
  } catch (error) {
    console.error("Error editing animation:", error)
    if (axios.isAxiosError(error)) {
      console.error("API error details:", error.response?.data)
    }
    throw error
  }
}

async function saveVideoToDatabase(
  video: GenerationResponse,
  userId: string,
  parentVideoId?: string,
  editPrompt?: string
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
        parentVideoId,
        editPrompt,
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

export const getStoredJobIds = (): string[] => {
  return JSON.parse(localStorage.getItem("visuamath_job_ids") || "[]")
}

export const getErrorMessage = (errorType?: string): string => {
  switch (errorType) {
    case "TIMEOUT_ERROR":
      return "Video rendering took too long. The animation might be too complex. Try simplifying your request."
    case "MEMORY_ERROR":
      return "Video rendering failed due to insufficient memory. Try creating a shorter or simpler animation."
    case "LATEX_ERROR":
      return "LaTeX rendering failed. There might be an issue with mathematical expressions in your animation."
    case "API_ERROR":
      return "AI service is temporarily unavailable. Please try again in a moment."
    case "CODE_ERROR":
      return "Generated code has errors. Please try rephrasing your request."
    case "DEPENDENCY_ERROR":
      return "Missing required dependencies for rendering. Please contact support."
    case "GENERATION_ERROR":
      return "Failed to generate animation code. Please try a different prompt."
    case "RENDER_ERROR":
      return "Video rendering failed. The animation might be too complex or contain unsupported features."
    case "NETWORK_ERROR":
      return "Network error occurred. Please check your connection and try again."
    case "UNKNOWN_ERROR":
    default:
      return "An unexpected error occurred. Please try again or contact support."
  }
}

export const canRetry = (errorType?: string): boolean => {
  return errorType === "API_ERROR" || 
         errorType === "TIMEOUT_ERROR" || 
         errorType === "NETWORK_ERROR" ||
         errorType === "UNKNOWN_ERROR"
}