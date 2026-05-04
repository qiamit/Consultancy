import { redirect } from "next/navigation";

export default function NewClientRedirectPage() {
  redirect("/dashboard/clients?new=1");
}
