import React from "react"
import { cn } from "@/lib/utils"

interface CodePreviewProps {
  code: string | null
  className?: string
}

const CodePreview: React.FC<CodePreviewProps> = ({ code, className }) => {
  if (!code) {
    return null
  }

  return (
    <div
      className={cn(
        "w-full rounded-lg bg-slate-900/80 text-white p-4 overflow-auto border border-slate-800",
        className
      )}
    >
      <pre className="whitespace-pre-wrap text-sm font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default CodePreview
