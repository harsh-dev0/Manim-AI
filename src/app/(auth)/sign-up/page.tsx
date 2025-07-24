import { buttonVariants } from "@/components/ui/button"
import SignUp from "@/components/SignUp"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
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

            <SignUp />
          </div>
        </RouteProtection>
      </main>
      <Footer />
    </div>
  )
}

export default page
