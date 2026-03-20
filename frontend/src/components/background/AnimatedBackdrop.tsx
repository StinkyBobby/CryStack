import { AntigravityField } from "@/components/background/AntigravityField";

export function AnimatedBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0">
        <AntigravityField
          count={360}
          magnetRadius={10}
          ringRadius={8.5}
          waveSpeed={0.45}
          waveAmplitude={1}
          particleSize={1.8}
          lerpSpeed={0.1}
          color="#df2531"
          rotationSpeed={0.08}
          depthFactor={1}
          pulseSpeed={3}
          fieldStrength={11}
        />
      </div>

      <div className="antigravity-core pointer-events-none absolute left-1/2 top-[18%] z-[1] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full" />
      <div className="antigravity-ring antigravity-ring-a pointer-events-none absolute left-1/2 top-[15%] z-[1] h-[35rem] w-[35rem] -translate-x-1/2" />
      <div className="antigravity-ring antigravity-ring-b pointer-events-none absolute left-1/2 top-[12%] z-[1] h-[42rem] w-[42rem] -translate-x-1/2" />

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_12%,rgba(223,37,49,0.24),transparent_40%),radial-gradient(circle_at_85%_16%,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.97)_68%)]" />
      <div className="noise-overlay pointer-events-none absolute inset-0 z-[2]" />

      <div className="floating-blob pointer-events-none absolute -left-20 top-8 z-[2] h-64 w-64 rounded-full bg-[#df2531]/30 blur-3xl" />
      <div className="floating-blob-delayed pointer-events-none absolute -right-12 bottom-24 z-[2] h-56 w-56 rounded-full bg-white/15 blur-3xl" />
    </>
  );
}
