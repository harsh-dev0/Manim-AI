"use client"
import React, { useState, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import Header from "@/components/Header"
import PromptInput from "@/components/PromptInput"
import VideoPlayer from "@/components/VideoPlayer"
import CodePreview from "@/components/CodePreview"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import ChatMessage from "@/components/ChatMessage"
import ShimmerEffect from "@/components/ShimmerEffect"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { checkGenerationStatus, generateAnimation } from "@/services"
import { AlertCircle } from "lucide-react"

const Index = () => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [currentCode, setCurrentCode] = useState<string | null>(null)
  const [currentVideo, setCurrentVideo] = useState<string | null>(null)
  const [isFirstPrompt, setIsFirstPrompt] = useState(true)
  const [animationTitle, setAnimationTitle] = useState<string | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Function to handle preview click
  const handlePreviewClick = (videoUrl: string) => {
    setCurrentVideo(videoUrl)
  }

  // Placeholder for Claude API call and Manim rendering
  const handleGenerateAnimation = async (prompt: string) => {
    setIsLoading(true)

    // Add user message to chat
    const userMessageId = Date.now().toString()
    setChatMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        content: prompt,
        type: "user",
        timestamp: new Date(),
      },
    ])

    try {
      // Call the API to start generation
      const response = await generateAnimation(prompt)
      const jobId = response.id

      // Poll for status
      const checkInterval = setInterval(async () => {
        const status = await checkGenerationStatus(jobId)

        if (status.status === "completed") {
          clearInterval(checkInterval)

          // Generate a video URL by prepending the API base URL
          const videoUrl = `http://localhost:8000${status.video_url}`

          // Add AI response to chat
          setChatMessages((prev) => [
            ...prev,
            {
              id: jobId,
              content:
                "Here's your mathematical animation. I've created a visualization for you.",
              type: "ai",
              timestamp: new Date(),
              video: videoUrl,
              code: status.code,
              title: status.title,
            },
          ])

          setActiveId(jobId)
          setCurrentCode(status.code!)
          setCurrentVideo(videoUrl)
          setIsFirstPrompt(false)
          setAnimationTitle(status.title!)

          toast({
            title: "Animation generated!",
            description: "Your mathematical animation is ready to view.",
          })

          setIsLoading(false)
        } else if (status.status === "failed") {
          clearInterval(checkInterval)

          // Add error message to chat
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              content: `Sorry, I couldn't generate the animation: ${status.error}`,
              type: "ai",
              timestamp: new Date(),
              isError: true,
            },
          ])

          toast({
            title: "Error",
            description: "Failed to generate animation. Please try again.",
            variant: "destructive",
          })

          setIsLoading(false)
        }
      }, 3000) // Check every 3 seconds
    } catch (error) {
      console.error("Error:", error)

      // Add error message to chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content:
            "Sorry, I couldn't generate the animation. Please try again.",
          type: "ai",
          timestamp: new Date(),
          isError: true,
        },
      ])

      toast({
        title: "Error",
        description: "Failed to generate animation. Please try again.",
        variant: "destructive",
      })

      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />

      <main className="flex-1 container py-6">
        {isFirstPrompt ? (
          // Initial prompt UI centered on the screen
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto animate-fade-in">
            <div className="mb-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
                  <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
                </svg>
              </div>
              <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                VisuaMath Forge
              </h1>
              <p className="text-slate-400 mb-8 text-center">
                Create beautiful mathematical animations with AI
              </p>
            </div>
            <div className="w-full bg-slate-900/50 backdrop-blur-sm p-6 rounded-xl border border-slate-800 shadow-xl">
              <PromptInput
                onSubmit={handleGenerateAnimation}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : (
          // Chat interface with resizable panels
          <div className="h-[calc(100vh-200px)] animate-fade-in">
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full rounded-xl overflow-hidden shadow-xl"
            >
              {/* Left side - Chat interface */}
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-l-xl">
                  <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-2">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 16.5L14 4.5L6 16.5H22Z"
                          fill="white"
                        />
                        <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-slate-200">
                      Conversation
                    </h3>
                  </div>
                  {/* Chat messages area */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                  >
                    {chatMessages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        onPreviewClick={handlePreviewClick}
                      />
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-800/80 text-white rounded-lg p-3 max-w-[80%] backdrop-blur-sm">
                          <ShimmerEffect className="h-4 w-32 mb-2" />
                          <ShimmerEffect className="h-4 w-48 mb-2" />
                          <ShimmerEffect className="h-4 w-40" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input area */}
                  <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
                    <PromptInput
                      onSubmit={handleGenerateAnimation}
                      isLoading={isLoading}
                      compact={true}
                    />
                  </div>
                </div>
              </ResizablePanel>

              {/* Resizable handle */}
              <ResizableHandle
                withHandle
                className="bg-slate-800 hover:bg-cyan-600 transition-colors"
              />

              {/* Right side - Video and code */}
              <ResizablePanel defaultSize={60}>
                <div className="flex flex-col h-full p-4 bg-slate-950 border border-slate-800 space-y-4 rounded-r-xl">
                  <div className="p-2 border-b border-slate-800 mb-2">
                    <h3 className="text-lg font-semibold text-cyan-400 flex items-center">
                      <svg
                        className="mr-2"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15 10L20 15L15 20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4 4V9C4 10.0609 4.42143 11.0783 5.17157 11.8284C5.92172 12.5786 6.93913 13 8 13H20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {animationTitle || "Animation Preview"}
                    </h3>
                  </div>

                  {isLoading ? (
                    <div className="w-full h-[400px] rounded-lg flex items-center justify-center bg-slate-900/50 border border-slate-800">
                      <div className="text-center">
                        <ShimmerEffect className="w-full h-[400px] rounded-lg" />
                        <p className="text-slate-400 mt-4">
                          Generating your animation...
                        </p>
                      </div>
                    </div>
                  ) : currentVideo ? (
                    <div className="flex-none bg-slate-900/30 rounded-xl overflow-hidden border border-slate-800">
                      <VideoPlayer videoUrl={currentVideo} />
                    </div>
                  ) : (
                    <div className="w-full h-[400px] rounded-lg flex items-center justify-center bg-slate-900/50 border border-slate-800">
                      <div className="text-center p-6">
                        <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <p className="text-slate-300 font-medium">
                          No animation available
                        </p>
                        <p className="text-slate-400 mt-2">
                          Try generating a new animation
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col">
                    <Tabs
                      defaultValue="code"
                      className="w-full flex-1 flex flex-col"
                    >
                      <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-800 rounded-lg">
                        <TabsTrigger
                          value="code"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 rounded-md"
                        >
                          <svg
                            className="mr-2"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M16 18L22 12L16 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8 6L2 12L8 18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Generated Code
                        </TabsTrigger>
                        <TabsTrigger
                          value="info"
                          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 rounded-md"
                        >
                          <svg
                            className="mr-2"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 16V12"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 8H12.01"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          How It Works
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="code" className="mt-3 flex-1">
                        {isLoading ? (
                          <ShimmerEffect className="w-full h-full rounded-lg" />
                        ) : currentCode ? (
                          <CodePreview
                            code={currentCode}
                            className="h-full rounded-lg border border-slate-800"
                          />
                        ) : (
                          <div className="w-full h-full rounded-lg flex items-center justify-center bg-slate-900/50 border border-slate-800">
                            <div className="text-center p-6">
                              <p className="text-slate-400">
                                No code available yet
                              </p>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="info" className="mt-3 flex-1">
                        <div className="rounded-lg border h-full overflow-auto bg-slate-900/50 border-slate-800 p-6">
                          <h3 className="text-xl font-medium mb-4 text-cyan-400">
                            About VisuaMath Forge
                          </h3>
                          <p className="mb-6 text-slate-300 leading-relaxed">
                            VisuaMath Forge generates mathematical
                            animations using Manim, a powerful Python
                            library for creating precise, beautiful math
                            animations created by 3Blue1Brown.
                          </p>
                          <h4 className="font-medium mb-3 text-slate-200 flex items-center">
                            <svg
                              className="mr-2"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 16V12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12 8H12.01"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            How it works:
                          </h4>
                          <ol className="list-decimal pl-6 space-y-3 text-slate-300">
                            <li className="leading-relaxed">
                              You enter a prompt describing the
                              mathematical concept or animation you want to
                              visualize
                            </li>
                            <li className="leading-relaxed">
                              Our AI generates Python code using the Manim
                              library to create the animation
                            </li>
                            <li className="leading-relaxed">
                              The code is executed on our servers using
                              Manim to render the animation
                            </li>
                            <li className="leading-relaxed">
                              The resulting animation is returned as a
                              video that you can watch and download
                            </li>
                          </ol>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 py-4 bg-slate-950">
        <div className="container text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22 16.5L14 4.5L6 16.5H22Z" fill="white" />
                <path d="M2 7.5L6 16.5H10L6 7.5H2Z" fill="white" />
              </svg>
            </div>
            <span className="font-medium text-cyan-400">
              VisuaMath Forge
            </span>
          </div>
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} VisuaMath Forge | Powered by Manim
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Index
