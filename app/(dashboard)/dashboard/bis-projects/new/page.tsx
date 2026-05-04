import { redirect } from "next/navigation";

export default function NewBisProjectRedirectPage() {
  redirect("/dashboard/bis-projects?new=1");
}
