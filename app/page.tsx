import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SplashScreen() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#bfdac7] p-4">
      <div className="flex flex-col items-center gap-12 max-w-2xl w-full">
        {/* Game Title */}
        <h1 className="text-6xl md:text-8xl font-bold text-[#170f08] text-center tracking-tight">CRITICAL POLE</h1>

        {/* Start Button */}
        <Link href="/game">
          <Button
            size="lg"
            className="bg-[#170f08] hover:bg-[#170f08]/90 text-[#fcf2e9] text-xl px-12 py-6 h-auto font-semibold tracking-wide"
          >
            START
          </Button>
        </Link>
      </div>
    </main>
  )
}
