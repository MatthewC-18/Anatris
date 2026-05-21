// src/components/CanvasLoader.tsx
//
// Full-canvas loading overlay shown while the GLB streams in. Uses the real
// drei progress value. Fades out when the viewer marks itself ready.

interface CanvasLoaderProps {
  progress: number;
}

export function CanvasLoader({ progress }: CanvasLoaderProps) {
  const pct = Math.min(100, Math.round(progress));

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-ink-950/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-5">
        {/* Pulsing ring mark */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          <div className="absolute inset-2 rounded-full bg-accent/10" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="font-display text-sm font-medium tracking-wide text-slate-200">
            Cargando modelo anatómico
          </span>
          <span className="font-mono text-xs text-slate-500">
            modelo-opt.glb · {pct}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-56 overflow-hidden rounded-full bg-slate-800">
          <div
            className="shimmer-bar h-full animate-shimmer rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
