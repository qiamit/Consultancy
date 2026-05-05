import { redirect } from "next/navigation";

/** ISO Projects UI removed; old bookmarks land on the dashboard. */
export default function IsoProjectsRedirectPage() {
  redirect("/dashboard");
}
