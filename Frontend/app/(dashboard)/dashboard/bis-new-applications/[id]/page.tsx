import { redirect } from "next/navigation";

export default async function BisNewApplicationByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/bis-new-applications/master?id=${encodeURIComponent(id)}`);
}
