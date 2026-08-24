import { redirect } from "next/navigation";

export default function NewBisNewApplicationRedirectPage() {
  redirect("/dashboard/bis-new-applications?new=1");
}
