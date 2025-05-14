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
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      <main className="flex-1 container py-6">
        {isFirstPrompt ? (
          // Initial prompt UI centered on the screen
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">VisuaMath Forge</h1>
            <p className="text-gray-400 mb-8">
              AI-powered math animations
            </p>
            <div className="w-full">
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
              className="h-full rounded-lg overflow-hidden"
            >
              {/* Left side - Chat interface */}
              <ResizablePanel defaultSize={40} minSize={30}>
                <div className="flex flex-col h-full bg-gray-900 border border-gray-800">
                  {/* Chat messages area */}
                  <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-auto p-4 space-y-4"
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
                        <div className="bg-gray-800 text-white rounded-lg p-3 max-w-[80%]">
                          <ShimmerEffect className="h-4 w-32 mb-2" />
                          <ShimmerEffect className="h-4 w-48 mb-2" />
                          <ShimmerEffect className="h-4 w-40" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input area */}
                  <div className="p-4 border-t border-gray-800">
                    <PromptInput
                      onSubmit={handleGenerateAnimation}
                      isLoading={isLoading}
                      compact={true}
                    />
                  </div>
                </div>
              </ResizablePanel>

              {/* Resizable handle */}
              <ResizableHandle withHandle />

              {/* Right side - Video and code */}
              <ResizablePanel defaultSize={60}>
                <div className="flex flex-col h-full p-4 bg-black border border-gray-800 space-y-4">
                  {isLoading ? (
                    <ShimmerEffect className="w-full h-[400px] rounded-lg" />
                  ) : (
                    <div className="flex-none">
                      {animationTitle && (
                        <div className="mb-2">
                          <h3 className="text-lg font-semibold text-purple-400">
                            {animationTitle}
                          </h3>
                        </div>
                      )}
                      <VideoPlayer videoUrl={currentVideo} />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col">
                    <Tabs
                      defaultValue="code"
                      className="w-full flex-1 flex flex-col"
                    >
                      <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                        <TabsTrigger
                          value="code"
                          className="data-[state=active]:bg-purple-600"
                        >
                          Generated Code
                        </TabsTrigger>
                        <TabsTrigger
                          value="info"
                          className="data-[state=active]:bg-purple-600"
                        >
                          How It Works
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="code" className="mt-2 flex-1">
                        {isLoading ? (
                          <ShimmerEffect className="w-full h-full rounded-lg" />
                        ) : (
                          <CodePreview
                            code={currentCode}
                            className="h-full"
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="info" className="mt-2 flex-1">
                        <div className="rounded-lg border h-full overflow-auto bg-gray-900 border-gray-800 p-4">
                          <h3 className="text-lg font-medium mb-2">
                            About VisuaMath Forge
                          </h3>
                          <p className="mb-4 text-gray-300">
                            VisuaMath Forge generates mathematical
                            animations using Manim, a powerful Python
                            library for creating precise, beautiful math
                            animations.
                          </p>
                          <h4 className="font-medium mb-2 text-gray-200">
                            How it works:
                          </h4>
                          <ol className="list-decimal pl-5 space-y-2 text-gray-300">
                            <li>
                              You enter a prompt describing the animation
                              you want
                            </li>
                            <li>
                              Our AI generates Python code using the Manim
                              library
                            </li>
                            <li>
                              The code is executed on our servers using
                              Manim
                            </li>
                            <li>
                              The resulting animation is returned as a
                              video
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

      <footer className="border-t border-gray-800 py-3 bg-black">
        <div className="container text-center text-xs text-gray-500">
          © {new Date().getFullYear()} VisuaMath Forge
        </div>
      </footer>
    </div>
  )
}

export default Index
