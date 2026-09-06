export default function EmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-[2mm] -mt-[2mm] -mb-4 flex h-[calc(100dvh-3.25rem)] min-h-0 flex-col overflow-hidden bg-white dark:bg-zinc-900">
      {children}
    </div>
  );
}
