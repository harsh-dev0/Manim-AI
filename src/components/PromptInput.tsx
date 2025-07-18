import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SendIcon, Sparkles, LogIn } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface PromptInputProps {
  onSubmit: (prompt: string, userId?: string) => void
  isLoading: boolean
  compact?: boolean
}

const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  isLoading,
  compact = false,
}) => {
  const [prompt, setPrompt] = useState("")
  const { data: session } = useSession()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim() && !isLoading) {
      if (session?.user) {
        onSubmit(prompt, session.user.id)
        setPrompt("") // Clear input after submission
      } else {
        router.push("/sign-in")
      }
    }
  }

  const handleSignIn = () => {
    router.push("/sign-in")
  }

  if (!session?.user) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <div className="bg-slate-900/50 text-white border border-cyan-700/30 rounded-xl p-4 sm:p-6 text-center">
          <p className="text-slate-300 mb-4">
            Please sign in to generate math animations
          </p>
          <Button
            onClick={handleSignIn}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-2 px-4 rounded-xl font-medium text-base shadow-lg border border-cyan-400/20"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        </div>
      </div>
    )
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
            if (session?.user) {
              onSubmit(prompt, session.user.id)
              setPrompt("")
            } else {
              router.push("/sign-in")
            }
          }
        }}
      >
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Ask for another math animation..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-slate-900/50 text-white border-cyan-700/30 focus:ring-cyan-500 placeholder-slate-400 p-3 rounded-xl h-12 box-border text-sm sm:text-base min-w-0"
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
          if (session?.user) {
            onSubmit(prompt, session.user.id)
            setPrompt("")
          } else {
            router.push("/sign-in")
          }
        }
      }}
    >
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Describe the mathematical animation you want to create... (e.g., 'Show the graph of quadratic equation')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={cn(
              "sm:w-[650px] rounded-xl border p-4 sm:p-6 pr-10 sm:pr-12 bg-slate-900/50 text-white border-cyan-700/30 box-border",
              "focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-slate-400 shadow-inner",
              "min-h-[100px] sm:min-h-[120px] resize-none text-sm sm:text-base" // Responsive min-height and text size
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
