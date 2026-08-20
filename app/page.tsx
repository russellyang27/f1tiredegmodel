import { Suspense } from "react"
import { CircuitSlider } from "@/components/circuit-slider"

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0a0a0c]">
      <Suspense fallback={null}>
        <CircuitSlider />
      </Suspense>
    </main>
  )
}
