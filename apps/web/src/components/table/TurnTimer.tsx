"use client";

type Props = {
  secondsLeft: number;
  totalSeconds: number;
  label?: string;
};

export function TurnTimer({ secondsLeft, totalSeconds, label }: Props) {
  const pct = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const urgent = secondsLeft <= 5;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div
      className="inline-flex items-center gap-2"
      aria-live="polite"
      aria-label={`Time remaining ${secondsLeft} seconds`}
    >
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={urgent ? "#e07a7a" : "#c6a75e"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.2s linear" }}
        />
      </svg>
      <div className="text-left">
        {label ? (
          <p className="text-[0.55rem] tracking-[0.2em] text-[var(--color-titanium)]">
            {label}
          </p>
        ) : null}
        <p
          className={`text-sm tabular-nums ${
            urgent ? "text-[#e07a7a]" : "text-[var(--color-platinum)]"
          }`}
        >
          {secondsLeft}s
        </p>
      </div>
    </div>
  );
}
