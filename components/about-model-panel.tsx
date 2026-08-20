"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { MotionPreference } from "@/hooks/use-motion-preference"

interface AboutModelPanelProps {
  open: boolean
  onClose: () => void
  motionPref: MotionPreference
  setMotionPref: (m: MotionPreference) => void
}

export function AboutModelPanel({ open, onClose, motionPref, setMotionPref }: AboutModelPanelProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[88vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto themed-scroll border-white/10 bg-[#0a0a0c] p-0 text-white"
        showCloseButton
      >
        <div className="telemetry-grid">
          <DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Model Info</span>
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white md:text-2xl">
              How this works
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] text-white/40">
              What the model does, what it doesn&apos;t know, and how to read its warnings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 px-6 py-6">
            <p className="text-sm leading-relaxed text-white/70">
              <span className="font-semibold text-white">TL;DR</span> — A machine learning model trained on 66,000+
              real F1 laps (2023{"\u2013"}2025) that predicts tire degradation by circuit, temperature, and compound.{" "}
              <span className="font-semibold text-white">~14% accuracy on held-out race data</span> — a real signal,
              but not a precise forecast, and it doesn&apos;t account for driver, fuel load, or race strategy.
            </p>

            <div className="flex flex-wrap gap-3">
              <Stat value="66k+" label="Training laps" />
              <Stat value="3" label="Seasons (23\u201325)" />
              <Stat value="R\u00B2 0.14" label="Held-out accuracy" />
            </div>

            <Section title="What it does">
              <p>
                Predicts a degradation curve — predicted lap-time loss in seconds at each tire age — per compound,
                for a circuit the model has actually seen in training. It learns each circuit&apos;s pattern
                directly from repeated seasons rather than from hand-picked physical variables, since that approach
                was tested and found to perform worse.
              </p>
            </Section>

            <Section title="What it doesn't account for">
              <ul className="space-y-2.5">
                <Bullet>
                  <b>Driver identity or style.</b> Same prediction regardless of who&apos;s in the car.
                </Bullet>
                <Bullet>
                  <b>Fuel load / race position.</b> Excluded from this interactive sweep — including it produced
                  physically impossible &quot;fresh tire, empty tank&quot; combinations.
                </Bullet>
                <Bullet>
                  <b>Race strategy or traffic.</b> No DRS, slipstream, tire management pace, or safety cars.
                </Bullet>
                <Bullet>
                  <b>Car setup.</b> No aero, suspension, or team-level differences.
                </Bullet>
                <Bullet>
                  <b>Circuits outside training.</b> Only the 16 circuits shown here are supported.
                </Bullet>
              </ul>
            </Section>

            <Section title="Reading the warnings">
              <p>
                When a query falls into a sparse or unusual combination — an extreme temperature at a circuit
                rarely raced in those conditions — the result is flagged as low-confidence. That&apos;s the model
                being honest about thin precedent, not a bug.
              </p>
            </Section>

            <Section title="Live vs. simulated">
              <p>
                Every result carries a small badge marking it{" "}
                <span className="text-emerald-300">Live model</span> (the real Random Forest, via API) or{" "}
                <span className="text-white/70">Simulated preview</span> (illustrative mock logic, when no live
                backend is connected). Check that badge before treating a number as real.
              </p>
            </Section>

            <Section title="Preferences">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/70">Motion</span>
                  <SegmentedControl
                    options={[
                      { value: "system", label: "System" },
                      { value: "reduced", label: "Reduced" },
                      { value: "full", label: "Full" },
                    ]}
                    value={motionPref}
                    onChange={(v) => setMotionPref(v as MotionPreference)}
                  />
                </div>
                <p className="font-mono text-[10px] leading-relaxed text-white/30">
                  &quot;Reduced&quot; overrides this site&apos;s animation regardless of your OS setting.
                  &quot;System&quot; follows your device&apos;s reduced-motion preference automatically. The
                  units toggle (°C/km vs °F/mi) now lives in the bottom-left corner of the main screen.
                </p>
              </div>
            </Section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors ${
            value === opt.value ? "bg-white text-black" : "text-white/40 hover:text-white/70"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5">
      <div className="font-mono text-lg font-semibold text-red-400">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 font-mono text-xs uppercase tracking-widest text-red-400">{title}</h3>
      <div className="text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30" />
      <span>{children}</span>
    </li>
  )
}
