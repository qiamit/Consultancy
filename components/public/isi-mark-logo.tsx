import Image from "next/image";

type IsiMarkLogoProps = {
  className?: string;
};

export function IsiMarkLogo({ className = "" }: IsiMarkLogoProps) {
  return (
    <div
      className={`inline-flex items-center justify-center mb-1.5 ${className}`}
    >
      <Image
        src="/isi-logo.png"
        alt="ISI Mark"
        width={56}
        height={56}
        className="h-9 w-9 object-contain"
      />
    </div>
  );
}
