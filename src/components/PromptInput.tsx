import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SendIcon } from "lucide-react"

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
      >
        <Input
          placeholder="Ask for another math animation..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="bg-gray-800 text-white border-gray-700 focus:ring-purple-600"
          disabled={isLoading}
        />
        <Button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white"
          disabled={!prompt.trim() || isLoading}
        >
          {isLoading ? "..." : <SendIcon size={18} />}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-3">
        <Textarea
          placeholder="Describe the mathematical animation you want to create... (e.g., 'Show binary search on a sorted array')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className={cn(
            "min-h-[100px] w-full resize-none rounded-lg border p-4 bg-gray-900 text-white border-gray-800",
            "focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          )}
          disabled={isLoading}
        />
        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          disabled={!prompt.trim() || isLoading}
        >
          {isLoading ? "Generating..." : "Generate Animation"}
        </Button>
      </div>
    </form>
  )
}

export default PromptInput
