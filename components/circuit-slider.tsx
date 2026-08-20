"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { CircuitCard } from "./circuit-card"
import { SteeringWheel } from "./steering-wheel"
import { PredictionPanel } from "./prediction-panel"
import { StartLights } from "./start-lights"
import { AboutModelPanel } from "./about-model-panel"
import { FirstVisitHint } from "./first-visit-hint"
import { CompareModal } from "./compare-modal"
import { CircuitSearch } from "./circuit-search"
import { ShortcutsPanel } from "./shortcuts-panel"
import { circuits } from "@/data/circuits"
import { useSliderNavigation } from "@/hooks/use-slider-navigation"
import { useSliderDrag } from "@/hooks/use-slider-drag"
import { useSliderWheel } from "@/hooks/use-slider-wheel"
import { usePredictionSettings } from "@/hooks/use-prediction-settings"
import { useUnitPreference } from "@/hooks/use-unit-preference"
import { useMotionPreference } from "@/hooks/use-motion-preference"
import { useUrlSync } from "@/hooks/use-url-sync"
import type { Circuit } from "@/types/circuit"

export function CircuitSlider() {
  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [activeCircuit, setActiveCircuit] = useState<Circuit | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  const [pinnedIds, setPinnedIds] = useState<number[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const settings = usePredictionSettings()
  const { units, setUnits } = useUnitPreference()
  const { preference: motionPref, setPreference: setMotionPref, motionConfigValue } = useMotionPreference()

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth > 768)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const { currentIndex, goToNext: goToNextRaw, goToPrev: goToPrevRaw, goToSlide } = useSliderNavigation({
    totalSlides: circuits.length,
    enableKeyboard: !panelOpen && !aboutOpen && !compareOpen && !searchOpen && !shortcutsOpen,
  })

  const [navSignal, setNavSignal] = useState(0)
  const goToNext = () => {
    setNavSignal((n) => n + 1)
    goToNextRaw()
  }
  const goToPrev = () => {
    setNavSignal((n) => n + 1)
    goToPrevRaw()
  }

  const { isDragging, dragX, handleDragStart, handleDragMove, handleDragEnd } = useSliderDrag({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
  })

  useSliderWheel({
    sliderRef,
    onScrollLeft: goToNext,
    onScrollRight: goToPrev,
  })

  const openPanel = (circuit: Circuit) => {
    setActiveCircuit(circuit)
    setPanelOpen(true)
  }

  // Clicking a card: if it's already centered, open the predictor; if it's
  // off to the side, bring it to center first (so every card in the gallery
  // is meaningfully clickable, not just the active one).
  const handleCardClick = (circuit: Circuit, index: number) => {
    if (index === currentIndex) {
      openPanel(circuit)
    } else {
      setNavSignal((n) => n + 1)
      goToSlide(index)
    }
  }

  const togglePin = (circuit: Circuit) => {
    setPinnedIds((prev) => {
      if (prev.includes(circuit.id)) return prev.filter((id) => id !== circuit.id)
      if (prev.length >= 2) return [prev[1], circuit.id] // keep it to a pair, newest bumps the oldest
      return [...prev, circuit.id]
    })
  }

  const pinnedCircuits = circuits.filter((c) => pinnedIds.includes(c.id))

  // If a pin is removed while Compare is open (down to <2), close it rather
  // than leaving a half-populated comparison on screen.
  useEffect(() => {
    if (compareOpen && pinnedCircuits.length < 2) setCompareOpen(false)
  }, [compareOpen, pinnedCircuits.length])

  useUrlSync({ currentIndex, goToSlide, settings, pinnedIds, setPinnedIds })

  const centerCircuit = circuits[currentIndex]
  // Ambient glow hue sweeps from cool (gentle circuits) to hot red
  // (harsh/abrasive circuits) — ties the atmosphere to real model data
  // instead of being purely decorative.
  const glowRotate = 170 - (centerCircuit.abrasiveness - 1) * 45

  return (
    <MotionConfig reducedMotion={motionConfigValue}>
      <div
        className={`relative h-full w-full overflow-hidden bg-[#0a0a0c] ${
          motionPref === "reduced" ? "force-reduced-motion" : ""
        }`}
      >
        <StartLights onDone={() => setIntroDone(true)} />

        {/* Ambient world: floodlit color wash + oversized circuit silhouette + drifting speed streaks */}
        <div className="ambient-glow" style={{ filter: `hue-rotate(${glowRotate}deg)` }} />
        <img src="/circuits/suzuka.png" alt="" aria-hidden className="ambient-circuit object-contain" />
        <div className="speed-streaks" />
        <div className="film-grain" />

        {/* Telemetry grid + ambient glow */}
        <div className="absolute inset-0 telemetry-grid" />
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 15%, rgba(239,68,68,0.10) 0%, transparent 45%),
              radial-gradient(ellipse at 80% 85%, rgba(59,130,246,0.08) 0%, transparent 45%),
              linear-gradient(180deg, transparent 0%, #0a0a0c 90%)
            `,
          }}
        />

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between p-6 md:p-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Live Model</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">Tire Degradation Predictor</h1>
            <p className="font-mono text-[11px] text-white/40">
              Random Forest {"\u2022"} 2023{"\u2013"}2025 F1 telemetry
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2.5"
          >
            <CircuitSearch
              circuits={circuits}
              onSelect={(index) => {
                setNavSignal((n) => n + 1)
                goToSlide(index)
              }}
              onOpenChange={setSearchOpen}
              suspend={shortcutsOpen || panelOpen || aboutOpen || compareOpen}
            />
            <ShortcutsPanel
              onOpenChange={setShortcutsOpen}
              suspend={searchOpen || panelOpen || aboutOpen || compareOpen}
            />
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              aria-label="About this model"
              title="About this model"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-sm font-semibold text-white/60 backdrop-blur-md transition hover:border-red-400/40 hover:bg-white/10 hover:text-white"
            >
              i
            </button>
          </motion.div>
        </header>

        {/* Circuit counter — bottom right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono backdrop-blur-md md:bottom-8 md:right-8"
        >
          <span className="text-sm text-white/70">{String(currentIndex + 1).padStart(2, "0")}</span>
          <span className="text-white/30">/</span>
          <span className="text-sm text-white/40">{String(circuits.length).padStart(2, "0")}</span>
        </motion.div>

        {/* Units toggle — bottom left, mirrors the counter's bottom-right placement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-6 left-6 z-20 flex items-center rounded-full border border-white/10 bg-white/5 p-1 font-mono backdrop-blur-md md:bottom-8 md:left-8"
        >
          {(["metric", "imperial"] as const).map((system) => (
            <button
              key={system}
              type="button"
              onClick={() => setUnits(system)}
              aria-pressed={units === system}
              className={`rounded-full px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
                units === system ? "bg-white text-black" : "text-white/40 hover:text-white/70"
              }`}
            >
              {system === "metric" ? "\u00B0C / km" : "\u00B0F / mi"}
            </button>
          ))}
        </motion.div>

        {/* Slider */}
        <div
          ref={sliderRef}
          className="relative flex h-full w-full cursor-grab items-center active:cursor-grabbing"
          style={{ perspective: 1800 }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <motion.div
            className="flex items-center gap-8 px-[calc(50vw-200px)] md:gap-16 md:px-[calc(50vw-250px)]"
            animate={{ x: -currentIndex * (isDesktop ? 564 : 432) + dragX }}
            transition={isDragging ? { duration: 0 } : { duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          >
            {circuits.map((circuit, index) => (
              <CircuitCard
                key={circuit.id}
                circuit={circuit}
                isActive={index === currentIndex}
                dragOffset={dragX}
                index={index}
                currentIndex={currentIndex}
                onOpen={(c) => handleCardClick(c, index)}
                pinned={pinnedIds.includes(circuit.id)}
                onTogglePin={togglePin}
                units={units}
              />
            ))}
          </motion.div>
        </div>

        {/* Compare bar — appears once two circuits are pinned */}
        <AnimatePresence>
          {pinnedCircuits.length === 2 && !compareOpen && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3 }}
              onClick={() => setCompareOpen(true)}
              className="absolute bottom-[210px] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-red-400/40 bg-[#1a0a0a]/90 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:border-red-400/70 hover:bg-[#220c0c]/90"
            >
              Compare {pinnedCircuits[0].name} vs {pinnedCircuits[1].name}
              <span aria-hidden>&rarr;</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Steering wheel navigation */}
        <SteeringWheel total={circuits.length} current={currentIndex} onNext={goToNext} onPrev={goToPrev} />
        <FirstVisitHint active={introDone} dismissSignal={navSignal} />

        <PredictionPanel
          circuit={activeCircuit}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          settings={settings}
          units={units}
        />
        <AboutModelPanel
          open={aboutOpen}
          onClose={() => setAboutOpen(false)}
          motionPref={motionPref}
          setMotionPref={setMotionPref}
        />
        <CompareModal
          circuits={pinnedCircuits}
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          settings={settings}
          onUnpin={togglePin}
          units={units}
        />
      </div>
    </MotionConfig>
  )
}
