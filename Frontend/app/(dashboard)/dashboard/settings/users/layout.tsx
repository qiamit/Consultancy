export default function UserManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-3 -my-4 flex h-[calc(100dvh-3.25rem)] min-h-0 flex-col overflow-hidden sm:-mx-5 sm:-my-6 lg:-mx-8 lg:-my-8 lg:h-dvh">
      {children}
    </div>
  );
}
