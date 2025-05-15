import React, { useState, useEffect } from "react"

interface VideoPlayerProps {
  videoUrl: string | null
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (videoUrl) {
      setIsLoading(true)
      setError(false)
    }
  }, [videoUrl])

  const handleVideoLoaded = () => {
    setIsLoading(false)
  }

  const handleVideoError = () => {
    setIsLoading(false)
    setError(true)
  }

  if (!videoUrl) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[400px] rounded-lg bg-slate-900/30 border border-slate-800 p-0">
        <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-4 opacity-50">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
            <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
          </svg>
        </div>
        <p className="text-cyan-300 text-center">Your animation will appear here</p>
        <p className="text-sm text-slate-400 mt-2 text-center">Generate an animation to see the visualization</p>
      </div>
    )
  }

  return (
    <div className="w-full mx-auto rounded-lg overflow-hidden border border-slate-800 bg-slate-900/30 p-0 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-cyan-300">Loading video...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-red-400 font-medium">Failed to load video</p>
            <p className="text-sm text-slate-300/70 mt-2">Please try again or check your connection</p>
          </div>
        </div>
      )}
      
      <div className="aspect-video bg-black/30 rounded-lg overflow-hidden shadow-lg">
        <video
          src={videoUrl}
          controls
          className="w-full h-full"
          autoPlay
          loop
          onLoadedData={handleVideoLoaded}
          onError={handleVideoError}
        />
      </div>
    </div>
  )
}

export default VideoPlayer
