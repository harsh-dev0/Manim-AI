import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SendIcon, Sparkles, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
// import { useRouter } from "next/navigation"
import SuggestionBar from "@/components/SuggestionBar"

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
  // COMMENTED OUT - NO AUTH REQUIRED
  // const { data: session, status } = useSession()
  // const router = useRouter()
  const { status } = useSession()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim() && !isLoading) {
      // COMMENTED OUT - NO AUTH REQUIRED FOR NOW
      // if (session?.user) {
      //   onSubmit(prompt, session.user.id)
      //   setPrompt("")
      // } else {
      //   router.push("/sign-in")
      // }
      onSubmit(prompt, "anonymous")
      setPrompt("")
    }
  }

  // const handleSignIn = () => {
  //   router.push("/sign-in")
  // }

  if (status === "loading") {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <div className="bg-slate-900/50 text-white border border-cyan-700/30 rounded-xl p-4 sm:p-6 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <p className="text-slate-300">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  // COMMENTED OUT - NO AUTH CHECK REQUIRED
  // if (!session?.user) {
  //   return (
  //     <div className="w-full max-w-2xl mx-auto space-y-4">
  //       <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border-2 border-red-500/30 rounded-xl p-4 sm:p-6 text-center">
  //         <div className="flex items-center justify-center space-x-2 mb-4">
  //           <span className="text-2xl">💸</span>
  //           <h3 className="text-xl font-bold text-red-300">BROKE ALERT!</h3>
  //           <span className="text-2xl">💸</span>
  //         </div>
  //         <p className="text-slate-300 mb-4">
  //           Sorry, but I&apos;m running on ramen budget and can&apos;t afford to keep the servers running for new users right now! 😅
  //         </p>
  //         <p className="text-sm text-slate-400 italic mb-4">
  //           Sign-up is temporarily disabled until I figure out how to pay for this thing! 🤷‍♂️
  //         </p>
  //         <div className="bg-slate-900/60 rounded-lg p-3 border border-red-400/20">
  //           <p className="text-sm text-slate-500">
  //             💡 <span className="text-yellow-300">Tip:</span> If you&apos;re already signed in, try refreshing the page!
  //           </p>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

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
            // COMMENTED OUT - NO AUTH REQUIRED
            // if (session?.user) {
            //   onSubmit(prompt, session.user.id)
            //   setPrompt("")
            // } else {
            //   router.push("/sign-in")
            // }
            onSubmit(prompt, "anonymous")
            setPrompt("")
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
          className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 h-12 rounded-xl shadow-lg border border-gray-400/20 min-w-[60px] flex-shrink-0 box-border cursor-not-allowed opacity-50"
          disabled={true}
        >
          <SendIcon size={18} />
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
          // COMMENTED OUT - NO AUTH REQUIRED
          // if (session?.user) {
          //   onSubmit(prompt, session.user.id)
          //   setPrompt("")
          // } else {
          //   router.push("/sign-in")
          // }
          onSubmit(prompt, "anonymous")
          setPrompt("")
        }
      }}
    >
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <SuggestionBar onPromptSelect={setPrompt} />
        <div className="relative">
          <Textarea
            placeholder="Describe the mathematical animation you want to create... (e.g., 'Show the graph of quadratic equation')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={cn(
              "sm:w-[650px] rounded-xl border p-4 sm:p-6 pr-10 sm:pr-12 bg-slate-900/50 text-white border-cyan-700/30 box-border",
              "focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-slate-400 shadow-inner",
              "min-h-[100px] sm:min-h-[120px] resize-none text-sm sm:text-base"
            )}
            disabled={isLoading}
          />
          <div className="absolute right-4 sm:right-6 bottom-4 sm:bottom-6 text-cyan-400/50">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-4 sm:py-6 rounded-xl font-medium text-base sm:text-lg shadow-lg border border-gray-400/20 cursor-not-allowed opacity-50"
          disabled={true}
        >
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Generate Animation (Disabled - No Backend)</span>
          </div>
        </Button>
      </div>
    </form>
  )
}

export default PromptInput
