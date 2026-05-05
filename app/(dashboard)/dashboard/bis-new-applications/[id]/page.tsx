import { redirect } from "next/navigation";

export default async function BisNewApplicationDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/bis-new-applications?id=${encodeURIComponent(id)}`);
}
