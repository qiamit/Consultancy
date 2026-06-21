// Professional SVG icons for each service tile

type IconProps = { className?: string };

export function BISIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
      <path d="M16 16h8c2.5 0 4.5 2 4.5 4.5S26.5 25 24 25h-8V16z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16 25h9c2.8 0 5 2.2 5 5s-2.2 5-5 5h-9V25z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="36" cy="12" r="5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M34 12h4M36 10v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function NABLIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Flask */}
      <path d="M18 8h12M20 8v14l-8 16h24L28 22V8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Liquid */}
      <path d="M15 33c2-3 6-3 8-1s6 2 8-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Bubbles */}
      <circle cx="22" cy="28" r="1.2" fill="currentColor" opacity="0.7" />
      <circle cx="26" cy="31" r="0.9" fill="currentColor" opacity="0.5" />
      {/* Stars / accreditation marks */}
      <circle cx="36" cy="10" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="38" cy="16" r="1.2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function ISOIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Certificate */}
      <rect x="8" y="6" width="28" height="34" rx="3" stroke="currentColor" strokeWidth="2.2" />
      {/* Lines */}
      <path d="M14 16h20M14 22h16M14 28h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Seal */}
      <circle cx="33" cy="33" r="8" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.8" />
      <path d="M30 33l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalibrationIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Vernier caliper base */}
      <path d="M8 30h32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Left jaw */}
      <path d="M10 20v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right jaw */}
      <path d="M30 22v10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Scale ticks */}
      <path d="M12 26v3M16 25v3M20 24v4M24 25v3M28 26v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      {/* Measurement object */}
      <rect x="14" y="17" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.8" opacity="0.5" />
      {/* NABL trace symbol */}
      <circle cx="36" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <path d="M34 14h4M36 12v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function TestingIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Test tubes */}
      <path d="M14 8v20a6 6 0 0012 0V8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Liquid fill */}
      <path d="M14 24a6 6 0 0012 4" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      {/* Second tube */}
      <path d="M32 12v14a4 4 0 008 0V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M32 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Checkmark */}
      <path d="M8 40l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

export function CEIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Circle background */}
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" opacity="0.2" />
      {/* C letter */}
      <path d="M22 14c-6 0-10 4.5-10 10s4 10 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* E letter */}
      <path d="M26 14h8M26 24h6M26 34h8M26 14v20" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      {/* Stars around */}
      <circle cx="24" cy="6" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="38" cy="14" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="38" cy="34" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="24" cy="42" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="10" cy="34" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="10" cy="14" r="1.2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function CRSIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Phone */}
      <rect x="13" y="6" width="22" height="36" rx="4" stroke="currentColor" strokeWidth="2.2" />
      {/* Screen */}
      <rect x="16" y="11" width="16" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      {/* Home button */}
      <circle cx="24" cy="39" r="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      {/* BIS badge on screen */}
      <circle cx="24" cy="22" r="5" stroke="currentColor" strokeWidth="1.8" opacity="0.7" />
      <path d="M22 22l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HallmarkIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Jewellery tag shape */}
      <path d="M24 4l8 6v8l-8 6-8-6V10L24 4z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      {/* BIS Hallmark hexagon */}
      <path d="M24 24l5 3v6l-5 3-5-3v-6l5-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" opacity="0.7" />
      {/* Hallmark 'H' */}
      <path d="M22 28v4M26 28v4M22 30h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      {/* Sparkles */}
      <path d="M8 20l2-2M38 20l2 2M8 30l2 2M38 30l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Ring */}
      <path d="M16 42c0-2 3-3 8-3s8 1 8 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function QCOIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard */}
      <rect x="10" y="10" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="2.2" />
      {/* Clip at top */}
      <path d="M19 10V8a5 5 0 0110 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Check items */}
      <path d="M16 20h3M22 20h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <path d="M16 26h3M22 26h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <path d="M16 32h3M22 32h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      {/* Checkmarks */}
      <path d="M16.5 20.5l1 1 1.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 26.5l1 1 1.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Warning/alert badge */}
      <circle cx="36" cy="12" r="6" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M36 9v4M36 14.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
