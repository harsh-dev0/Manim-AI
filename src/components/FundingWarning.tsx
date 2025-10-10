"use client"
import React from "react"

const FundingWarning = () => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-4 animate-fade-in">
      <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-lg p-4 shadow-lg backdrop-blur-sm">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-lg animate-bounce">💸</span>
            <p className="text-sm text-slate-300">
              <span className="text-red-300 font-semibold">BROKE ALERT!</span> - Ran out of funds, can&apos;t deploy backend! 😅
            </p>
            <span className="text-lg animate-bounce">💸</span>
          </div>
          <p className="text-xs text-slate-400">
            Animation generation won&apos;t work. Check out the <a href="https://github.com/harsh-dev0/Manimbe" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">GitHub repo</a> to deploy your own backend!
          </p>
        </div>
      </div>
    </div>
  )
}

export default FundingWarning
