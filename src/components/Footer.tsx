import React from "react"

const Footer = () => {
  return (
    <footer className="border-t border-gray-800 py-4 bg-black">
      <div className="container text-center text-sm text-gray-500">
        © {new Date().getFullYear()} VisuaMath Forge - AI-powered
        mathematical animation generator
      </div>
    </footer>
  )
}

export default Footer
