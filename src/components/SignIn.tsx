"use client"
import Link from "next/link"
import UserAuthForm from "./UserAuthForm"

const SignIn = () => {
  return (
    <div className="container mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] animate-fade-in">
      <div className="flex flex-col space-y-2 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-3 sm:mb-4 mx-auto">
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
          Welcome Back
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-xs mx-auto mb-6">
          Sign in to your Manim account to create and manage your
          mathematical animations
        </p>

        <div className="w-full bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-slate-800/50 shadow-xl mx-2 sm:mx-0">
          <UserAuthForm />
        </div>

        <p className="px-8 text-center text-sm text-slate-400 mt-4">
          New to Manim?{" "}
          <Link
            href="/sign-up"
            className="text-cyan-400 hover:text-cyan-300 text-sm underline underline-offset-4"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default SignIn
