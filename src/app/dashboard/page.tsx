import { redirect } from "next/navigation";

// The old admin dashboard lives on in the new console; keep the URL working.
export default function LegacyDashboard() {
  redirect("/assistant");
}
