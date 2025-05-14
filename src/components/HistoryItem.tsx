import React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface HistoryEntry {
  id: string
  prompt: string
  timestamp: Date
}

interface HistoryItemProps {
  entry: HistoryEntry
  isActive: boolean
  onClick: (id: string) => void
}

const HistoryItem: React.FC<HistoryItemProps> = ({
  entry,
  isActive,
  onClick,
}) => {
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
  }).format(entry.timestamp)

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start text-left font-normal py-3 px-4 h-auto",
        isActive
          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
          : "hover:bg-slate-800 text-slate-200 bg-slate-900/80"
      )}
      onClick={() => onClick(entry.id)}
    >
      <div className="flex flex-col items-start gap-1">
        <p className="line-clamp-2 text-sm font-medium">{entry.prompt}</p>
        <span className="text-xs text-slate-400">{formattedTime}</span>
      </div>
    </Button>
  )
}

export default HistoryItem
