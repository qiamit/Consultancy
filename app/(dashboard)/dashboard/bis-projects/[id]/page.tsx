import { redirect } from "next/navigation";

export default async function BisProjectDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/bis-projects?id=${encodeURIComponent(id)}`);
}
