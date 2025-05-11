import React from "react"
import { cn } from "@/lib/utils"

interface ShimmerEffectProps {
  className?: string
}

const ShimmerEffect: React.FC<ShimmerEffectProps> = ({ className }) => {
  return (
    <div
      className={cn("animate-pulse bg-gray-800/70 rounded-md", className)}
    />
  )
}

export default ShimmerEffect
