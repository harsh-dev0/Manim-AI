import React from "react"
import HistoryItem, { HistoryEntry } from "./HistoryItem"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HistoryListProps {
  history: HistoryEntry[]
  activeId: string | null
  onSelectItem: (id: string) => void
}

const HistoryList: React.FC<HistoryListProps> = ({
  history,
  activeId,
  onSelectItem,
}) => {
  if (history.length === 0) {
    return (
      <div className="text-center p-4 text-slate-400 bg-slate-900/50 rounded-lg border border-slate-800">
        No history yet
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px] w-full pr-4 bg-slate-900/50 rounded-lg border border-slate-800">
      <div className="space-y-1">
        {history.map((entry) => (
          <HistoryItem
            key={entry.id}
            entry={entry}
            isActive={activeId === entry.id}
            onClick={onSelectItem}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

export default HistoryList
