import { Brand, LinkButton, Card } from "@/components/ui";
import { currentEvent } from "@/lib/event";

export const dynamic = "force-dynamic";

export default async function Home() {
  const event = await currentEvent().catch(() => null);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <p className="text-center text-sm text-neutral-600">{event ? event.name : "Competition voting"}</p>
      <Card className="w-full space-y-3">
        <LinkButton href="/judge/login" className="w-full">I am a judge</LinkButton>
        <LinkButton href="/results" variant="secondary" className="w-full">See the results</LinkButton>
      </Card>
      <a href="/admin/login" className="text-xs text-neutral-500 hover:text-wine">Organisation</a>
    </main>
  );
}
