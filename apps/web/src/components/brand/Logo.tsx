type LogoProps = {
  variant?: "full" | "mark";
  className?: string;
};

export function Logo({ variant = "full", className = "" }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="40" cy="40" r="30" stroke="#c6a75e" strokeWidth="1.75" />
        <circle
          cx="40"
          cy="40"
          r="24.5"
          stroke="#8b93a7"
          strokeWidth="0.8"
          opacity="0.5"
        />
        <path
          d="M28 52V28l9.5 16L47 28v24"
          stroke="#d6d9e2"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M52 28v24"
          stroke="#c6a75e"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
      {variant === "full" ? (
        <div className="leading-none">
          <div
            className="text-[0.7rem] tracking-[0.35em] text-[var(--color-champagne)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            MK
          </div>
          <div
            className="mt-1 text-sm tracking-[0.28em] text-[var(--color-platinum)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            POKER ROYALE
          </div>
        </div>
      ) : null}
    </div>
  );
}
