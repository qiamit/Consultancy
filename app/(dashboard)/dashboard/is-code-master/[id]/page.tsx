import { redirect } from "next/navigation";

export default async function IsCodeDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/is-code-master?id=${id}`);
}
