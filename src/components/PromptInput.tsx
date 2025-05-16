import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SendIcon, Sparkles } from "lucide-react"

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  isLoading: boolean
  compact?: boolean
}

const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  isLoading,
  compact = false,
}) => {
  const [prompt, setPrompt] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt)
      setPrompt("") // Clear input after submission
    }
  }

  if (compact) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 w-full"
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.shiftKey &&
            prompt.trim() &&
            !isLoading
          ) {
            e.preventDefault()
            onSubmit(prompt)
            setPrompt("")
          }
        }}
      >
        <div className="flex-1">
          <Input
            placeholder="Ask for another math animation..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-slate-900/50 text-white border-cyan-700/30 focus:ring-cyan-500 placeholder-slate-400 p-3 rounded-xl h-12 box-border text-sm sm:text-base"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 h-12 rounded-xl shadow-lg border border-cyan-400/20 min-w-[60px] flex-shrink-0 box-border"
          disabled={!prompt.trim() || isLoading}
        >
          {isLoading ? (
            <div className="border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin w-4 h-4"></div>
          ) : (
            <SendIcon size={18} />
          )}
        </Button>
      </form>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center w-full"
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          e.ctrlKey &&
          prompt.trim() &&
          !isLoading
        ) {
          e.preventDefault()
          onSubmit(prompt)
          setPrompt("")
        }
      }}
    >
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Describe the mathematical animation you want to create... (e.g., 'Show the derivative of exponential function')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={cn(
              "w-full max-w-[650px] rounded-xl border p-4 sm:p-6 pr-10 sm:pr-12 bg-slate-900/50 text-white border-cyan-700/30 box-border",
              "focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-slate-400 shadow-inner",
              "h-[100px] sm:h-[120px] resize-none text-sm sm:text-base" // Responsive height and text size
            )}
            disabled={isLoading}
          />
          <div className="absolute right-4 sm:right-6 bottom-4 sm:bottom-6 text-cyan-400/50">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-4 sm:py-6 rounded-xl font-medium text-base sm:text-lg shadow-lg border border-cyan-400/20"
          disabled={!prompt.trim() || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <span>Generating...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Generate Animation</span>
            </div>
          )}
        </Button>
      </div>
    </form>
  )
}

export default PromptInput
