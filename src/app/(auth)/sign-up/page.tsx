// TEMPORARILY DISABLED - NO FUNDS TO RUN THE PROJECT
// import { buttonVariants } from "@/components/ui/button"
// import SignUp from "@/components/SignUp"
// import { cn } from "@/lib/utils"
// import Link from "next/link"
// import { ChevronLeft } from "lucide-react"
// import Header from "@/components/Header"
// import Footer from "@/components/Footer"
// import RouteProtection from "@/components/RouteProtection"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChevronLeft, AlertTriangle, DollarSign } from "lucide-react"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import RouteProtection from "@/components/RouteProtection"

const page = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Header />
      <main className="flex-1 container h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] overflow-auto sm:overflow-hidden py-2 sm:py-4 flex flex-col">
        <RouteProtection authRequired={false} redirectTo="/">
          <div className="h-full max-w-2xl mx-auto flex flex-col items-center justify-center">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "self-start mb-8 text-slate-300 "
              )}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Home
            </Link>

            {/* SIGN-UP TEMPORARILY DISABLED - NO FUNDS */}
            <div className="w-full max-w-md mx-auto animate-fade-in">
              <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border-2 border-red-500/30 rounded-2xl p-8 shadow-2xl backdrop-blur-sm text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
                  <h1 className="text-2xl font-bold text-red-300">Sign-Up Disabled</h1>
                  <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
                </div>
                
                <div className="bg-slate-900/60 rounded-xl p-6 border border-red-400/20">
                  <p className="text-lg text-slate-200 mb-4">
                    💸 <span className="text-red-300 font-bold">BROKE ALERT!</span> 💸
                  </p>
                  <p className="text-base text-slate-300 mb-4">
                    Sorry, but I&apos;m running on ramen budget and can&apos;t afford to keep the servers running for new users right now! 😅
                  </p>
                  
                  <div className="flex items-center justify-center space-x-2 text-sm text-slate-400 mb-4">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span>Donations welcome to keep this project alive!</span>
                  </div>
                  
                  <p className="text-sm text-slate-500 italic">
                    Check back later when I figure out how to pay for this thing! 🤷‍♂️
                  </p>
                </div>
              </div>
            </div>

            {/* <SignUp /> */}
          </div>
        </RouteProtection>
      </main>
      <Footer />
    </div>
  )
}

export default page
