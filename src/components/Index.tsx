"use client"
import React from "react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

const Index = () => {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />

      <main className="flex-1 container flex items-center justify-center py-8">
        <div className="max-w-2xl mx-auto text-center px-4">
          <div className="mb-6 flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-3 sm:mb-4">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
                <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
              </svg>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              Manim AI
            </h1>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm p-6 sm:p-8 rounded-xl border border-cyan-700/30 shadow-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4 text-cyan-400">
                Out of Funds
              </h2>
              <p className="text-lg text-slate-300 mb-4">
                This project is currently dormant due to insufficient funds.
              </p>
              <p className="text-base text-slate-400 mb-6">
                You can view all videos created through this platform here:
              </p>
            </div>

            <Button
              onClick={() => router.push("/public-gallery")}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 px-6 rounded-xl font-medium text-base shadow-lg border border-cyan-400/20"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Public Gallery
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Index
