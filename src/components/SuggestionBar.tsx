"use client"
import React, { useState } from "react"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const animation_prompts = {
  // Math animations
  "rotating cube": "Create a blue cube that rotates.",
  "sine wave": "Show a simple sine wave.",
  "number line": "Draw a number line from 0 to 10.",

  // Data structures & algorithms
  "binary search tree": "Show a small binary search tree.",
  "merge sort": "Merge sort the array [3,1,4,2].",
  "graph traversal": "Show a graph traversal.",

  // Boolean algebra
  "logic gates": "Draw an AND gate and OR gate.",
  "karnaugh map": "Create a 2×2 Karnaugh map.",
  "binary adder": "Show a binary adder.",

  // Math theorems
  "pythagorean theorem": "Show a right triangle with a²+b²=c².",
  "fibonacci sequence": "Show the first 5 Fibonacci numbers.",

  // Equations
  "quadratic formula": "Show the quadratic formula.",
  "linear equation": "Graph y = x + 1.",

  // Shapes and patterns
  "square to circle": "Morph a square into a circle.",
  "geometric patterns": "Create a simple geometric pattern.",
}

const examplePrompts = Object.entries(animation_prompts)
  .map(([key, value]) => ({ key, value }))
  .sort(() => Math.random() - 0.5)
  .slice(0, 4)

interface SuggestionBarProps {
  onPromptSelect: (prompt: string) => void
}

const SuggestionBar: React.FC<SuggestionBarProps> = ({
  onPromptSelect,
}) => {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const handleSuggestionClick = (
    e: React.MouseEvent,
    promptValue: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    onPromptSelect(promptValue)
  }

  return (
    <div className="w-full bg-slate-900/50 backdrop-blur-sm border border-cyan-800/30 rounded-xl shadow-lg mb-6 px-4 py-3 flex flex-col md:flex-row items-center gap-3 relative animate-fade-in">
      <Sparkles className="text-cyan-400 mr-2 shrink-0" />
      <div className="flex-1 text-sm md:text-base text-slate-200">
        <span className="font-semibold text-cyan-300">
          Try these examples:
        </span>
        <span className="ml-2 flex flex-wrap gap-2 mt-2 md:mt-0">
          {examplePrompts.map((ex, idx) => (
            <Button
              key={idx}
              type="button"
              size="sm"
              variant="ghost"
              className="bg-slate-800/60 hover:bg-slate-700/60 text-cyan-100 border border-cyan-800/30 rounded-lg px-3 py-1 text-xs"
              onClick={(e) => handleSuggestionClick(e, ex.value)}
              title={ex.value}
            >
              {ex.key}
            </Button>
          ))}
        </span>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 text-slate-400 hover:text-white"
        onClick={() => setVisible(false)}
        aria-label="Close suggestions"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}

export default SuggestionBar
