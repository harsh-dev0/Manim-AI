import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Code, X, Play } from "lucide-react"
import CodePreview from "./CodePreview"

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
        "flex",
        message.type === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-lg p-3 max-w-[80%] space-y-3",
          message.type === "user"
            ? "bg-purple-700 text-white"
            : message.isError
            ? "bg-red-900/40 border border-red-800 text-white"
            : "bg-gray-800 text-white"
        )}
      >
        <div>{message.content}</div>

        {message.title && message.type === "ai" && (
          <div className="text-sm font-medium text-purple-400 mt-1">
            {message.title}
          </div>
        )}

        {message.video && onPreviewClick && (
          <div className="mt-2">
            <div
              className="bg-gray-900 border border-gray-700 rounded p-2 cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={handlePreviewClick}
            >
              <div className="flex items-center gap-2">
                <Play size={16} className="text-purple-400" />
                <span className="text-sm">Click to preview animation</span>
              </div>
            </div>

            {message.code && (
              <div className="mt-2 flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs flex items-center gap-1 text-gray-300 hover:text-white"
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
          <div className="mt-2">
            <CodePreview code={message.code} className="max-h-[200px]" />
          </div>
        )}

        <div className="text-xs opacity-50 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage
