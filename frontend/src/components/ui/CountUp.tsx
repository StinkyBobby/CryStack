import { useEffect, useMemo, useState } from "react";

interface CountUpProps {
  to: number;
  durationMs?: number;
  className?: string;
  scale?: number;
  suffix?: string;
}

export function CountUp({ to, durationMs = 1200, className = "", scale = 1, suffix = "" }: CountUpProps) {
  const target = useMemo(() => Math.max(0, Math.round(to)), [to]);
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startedAt = performance.now();

    const step = (timestamp: number) => {
      const elapsed = timestamp - startedAt;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [target, durationMs]);

  const displayValue = scale > 1 ? (value / scale).toFixed(1) : value.toLocaleString("ru-RU");
  return <span className={className}>{displayValue}{suffix}</span>;
}
