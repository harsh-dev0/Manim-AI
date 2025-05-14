import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Code, X, Play, User, Bot } from "lucide-react"
import CodePreview from "./CodePreview"
import ShimmerEffect from "./ShimmerEffect"

interface ChatMessageProps {
  message: {
    id: string
    content: string
    type: "user" | "ai"
    timestamp: Date
    video?: string
    code?: string
    isError?: boolean
    title?: string
  }
  onPreviewClick?: (videoUrl: string) => void
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onPreviewClick,
}) => {
  const [showCode, setShowCode] = useState(false)
  const toggleCodeView = () => setShowCode(!showCode)

  const handlePreviewClick = () => {
    if (message.video && onPreviewClick) {
      onPreviewClick(message.video)
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2",
        message.type === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.type !== "user" && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
      )}

      <div
        className={cn(
          "rounded-xl p-4 max-w-[80%] space-y-3 shadow-sm",
          message.type === "user"
            ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border border-blue-500/30"
            : message.isError
            ? "bg-red-900/40 border border-red-800/50 text-white backdrop-blur-sm"
            : "bg-slate-800/80 border border-slate-700/50 text-white backdrop-blur-sm"
        )}
      >
        <div className="leading-relaxed">{message.content}</div>

        {message.title && message.type === "ai" && (
          <div className="text-sm font-medium text-cyan-300 mt-1 border-t border-slate-700/50 pt-2">
            {message.title}
          </div>
        )}

        {message.video && onPreviewClick && (
          <div className="mt-3">
            <div
              className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 cursor-pointer hover:bg-slate-800 transition-colors group"
              onClick={handlePreviewClick}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 flex items-center justify-center group-hover:from-cyan-500 group-hover:to-blue-500 transition-colors">
                  <Play size={16} className="text-white" />
                </div>
                <span className="text-sm font-medium">
                  Preview Animation
                </span>
              </div>
            </div>

            {message.code && (
              <div className="mt-2 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs flex items-center gap-1 text-slate-300 hover:text-white hover:bg-slate-800"
                  onClick={toggleCodeView}
                >
                  {showCode ? (
                    <>
                      <X size={14} /> Hide Code
                    </>
                  ) : (
                    <>
                      <Code size={14} /> View Code
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {showCode && message.code && (
          <div className="mt-3 border border-slate-700/50 rounded-lg overflow-hidden">
            <CodePreview code={message.code} className="max-h-[300px]" />
          </div>
        )}

        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {message.type === "user" && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 mt-1">
          <User size={16} className="text-white" />
        </div>
      )}
    </div>
  )
}

export default ChatMessage
