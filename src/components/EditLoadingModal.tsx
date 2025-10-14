"use client"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Wand2 } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface EditLoadingModalProps {
  isOpen: boolean
}

export function EditLoadingModal({ isOpen }: EditLoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-slate-900/95 border-slate-700 backdrop-blur-sm">
        <VisuallyHidden>
          <DialogTitle>Processing Edit</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping">
              <Sparkles className="w-16 h-16 text-cyan-400 opacity-20" />
            </div>
            <Wand2 className="w-16 h-16 text-cyan-400 animate-spin" style={{ animationDuration: "2s" }} />
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">
            Cooking up some magic!
          </h3>
          
          <p className="text-slate-400 text-center mb-4">
            Our AI is putting on its thinking cap and rewriting your animation...
          </p>
          
          <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          
          <p className="text-xs text-slate-500 mt-6 text-center">
            This usually takes 30-60 seconds. Hang tight!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

