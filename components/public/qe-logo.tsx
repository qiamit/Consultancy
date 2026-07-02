type QELogoProps = {
  sm?: boolean;
  className?: string;
};

function QEMark({ size }: { size: number }) {
  const id = "qe";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1565C0" />
          <stop offset="100%" stopColor="#0D47A1" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Shield background */}
      <path
        d="M28 3 L50 11 L50 30 C50 42 40 51 28 54 C16 51 6 42 6 30 L6 11 Z"
        fill={`url(#${id}-bg)`}
      />
      {/* Shine overlay */}
      <path
        d="M28 3 L50 11 L50 30 C50 42 40 51 28 54 C16 51 6 42 6 30 L6 11 Z"
        fill={`url(#${id}-shine)`}
      />
      {/* Shield border */}
      <path
        d="M28 3 L50 11 L50 30 C50 42 40 51 28 54 C16 51 6 42 6 30 L6 11 Z"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="1"
        fill="none"
      />

      {/* "QE" lettering */}
      <text
        x="28"
        y="30"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="20"
        fontWeight="900"
        letterSpacing="-0.5"
      >
        QE
      </text>

      {/* Bottom accent line */}
      <path
        d="M20 40 Q28 43 36 40"
        stroke="white"
        strokeOpacity="0.5"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Top-right star accent */}
      <circle cx="46" cy="10" r="2" fill="white" fillOpacity="0.4" />
    </svg>
  );
}

export function QELogo({ sm = false, className = "" }: QELogoProps) {
  const markSize = sm ? 32 : 44;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <QEMark size={markSize} />

      <div className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[15px] font-black tracking-tight text-zinc-900 dark:text-white leading-none">
          Quality Engineering
        </span>
      </div>
    </div>
  );
}
