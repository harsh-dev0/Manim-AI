import React from "react"

interface VideoPlayerProps {
  videoUrl: string | null
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center w-full h-[400px] rounded-lg bg-slate-900/50 border border-slate-800">
        <p className="text-slate-400">Your animation will appear here</p>
      </div>
    )
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-slate-800 aspect-video bg-slate-900/30">
      <video
        src={videoUrl}
        controls
        className="w-full h-full"
        autoPlay
        loop
      />
    </div>
  )
}

export default VideoPlayer
