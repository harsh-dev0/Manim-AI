"use client"
import React, { useState } from "react"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const animation_prompts = {
  // Math animations
  "rotating cube":
    "Create an animation of a red 3D cube rotating along its diagonal axis with smooth rotation and lighting effects.",
  "sine wave":
    "Visualize a sine wave with amplitude 1 and frequency 2, smoothly oscillating over time with color gradients.",
  "butterfly curve":
    "Animate a parametric butterfly curve being traced out in real-time, with colors transitioning from blue to purple.",

  // Data structures & algorithms
  "binary search tree":
    "Visualize the insertion of nodes 5, 3, 7, 2, 4, 6, 8 into a binary search tree with step-by-step animation.",
  "merge sort":
    "Demonstrate merge sort algorithm on the array [6, 5, 3, 1, 8, 7, 2, 4] with clear step divisions.",
  "graph traversal":
    "Show a BFS traversal on a directed graph with 6 nodes, highlighting the visited nodes in sequence.",

  // Boolean algebra
  "logic gates":
    "Create an animation showing how AND, OR, and NOT gates work with input signals changing over time.",
  "karnaugh map":
    "Visualize the simplification of boolean expression (A·B) + (A·C) using a Karnaugh map.",
  "binary adder":
    "Demonstrate a 4-bit binary adder circuit in operation with animated signal flows.",

  // Math theorems
  "pythagorean theorem":
    "Prove the Pythagorean theorem visually by showing the areas of squares on the sides of a right triangle.",
  "euler's identity":
    "Create a visual explanation of Euler's identity (e^(iπ) + 1 = 0) using the unit circle.",
  "fibonacci sequence":
    "Visualize the Fibonacci sequence and its relation to the golden ratio with spirals and rectangles.",

  // Equations
  "quadratic formula":
    "Animate the derivation of the quadratic formula from ax² + bx + c = 0 with step-by-step algebraic manipulations.",
  "wave equation":
    "Show a numerical solution to the 1D wave equation with changing boundary conditions.",
  "differential equations":
    "Visualize a vector field for a system of differential equations with animated solution curves.",

  // Landscapes
  "fractal landscape":
    "Generate a 3D fractal mountain landscape with dynamic lighting and camera movement.",
  "mandelbrot zoom":
    "Create a smooth zoom animation into the Mandelbrot set, focusing on an interesting border region.",
  "geometric patterns":
    "Animate the construction of Islamic geometric patterns from basic shapes to complex tessellations.",
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
              size="sm"
              variant="ghost"
              className="bg-slate-800/60 hover:bg-slate-700/60 text-cyan-100 border border-cyan-800/30 rounded-lg px-3 py-1 text-xs"
              onClick={() => onPromptSelect(ex.value)}
              title={ex.value}
            >
              {ex.key}
            </Button>
          ))}
        </span>
      </div>
      <Button
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
