import { AdminNav } from "./nav";
import { getAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The login page lives under /admin too and must render without a session.
  const admin = await getAdmin();
  if (!admin) return <>{children}</>;
  const event = await currentEvent();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav adminName={admin.name} eventName={event?.name ?? null} />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
