import { redirect } from "next/navigation";

export default function BisNewApplicationNewPage() {
  redirect("/dashboard/bis-new-applications/master?new=1");
}
