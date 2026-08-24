import Image from "next/image";

type QELogoImageProps = {
  className?: string;
  priority?: boolean;
  /** panel = homepage sidebar; nav = header; auth = login/signup; bare = image only */
  variant?: "panel" | "nav" | "auth" | "bare";
  onError?: () => void;
};

const DEFAULT_HEIGHT: Record<Exclude<QELogoImageProps["variant"], "bare" | undefined>, string> = {
  nav: "h-9 w-auto sm:h-10",
  panel: "h-14 w-auto sm:h-[4.25rem]",
  auth: "h-12 w-auto sm:h-14",
};

export function QELogoImage({
  className,
  priority = false,
  variant = "nav",
  onError,
}: QELogoImageProps) {
  const heightClass =
    className ?? (variant && variant !== "bare" ? DEFAULT_HEIGHT[variant] : "h-10 w-auto");

  return (
    <Image
      src="/logo.png"
      alt="Quality Engineering — Certification Consultants"
      width={320}
      height={88}
      className={`object-contain object-left ${heightClass}`}
      priority={priority}
      onError={onError}
    />
  );
}
