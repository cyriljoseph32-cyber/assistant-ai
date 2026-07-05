import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isValidSession, SESSION_COOKIE } from "@/lib/auth";
import { Shell } from "@/components/Shell";

// Session check must run per-request.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const session = cookies().get(SESSION_COOKIE)?.value;
  if (!isValidSession(session)) redirect("/login");
  return <Shell>{children}</Shell>;
}
