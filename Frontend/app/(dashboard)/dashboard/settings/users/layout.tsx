export default function UserManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-3 -mb-4 flex h-[calc(100dvh-3.25rem)] min-h-0 flex-col overflow-hidden sm:-mx-5 sm:-mb-6 lg:-mx-8 lg:-mb-8">
      {children}
    </div>
  );
}
