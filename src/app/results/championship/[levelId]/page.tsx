import Link from "next/link";
import { notFound } from "next/navigation";
import { ChampionshipTable } from "@/components/championship-table";
import { Badge, Brand, Card } from "@/components/ui";
import { requirePublicAccess } from "@/lib/public-access";
import { levelChampionship } from "@/lib/results";

export const dynamic = "force-dynamic";

export default async function PublicChampionship({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  const { event, isAdmin } = await requirePublicAccess();
  const championship = await levelChampionship(levelId);
  if (!championship || championship.level.eventId !== event.id || !championship.level.hasChampionship) notFound();
  // The public sees the championship only once every category of the level is published.
  const allVisible = championship.categories.every((c) => c.resultsVisible);
  if (!isAdmin && !allVisible) notFound();

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/results" className="text-sm text-wine">&larr; Results</Link>
        <Brand small />
      </header>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{championship.level.name}</div>
          <h1 className="text-2xl font-bold">Championship</h1>
        </div>
        {championship.allClosed ? <Badge tone="closed">Final</Badge> : <Badge tone="open">Provisional</Badge>}
      </div>
      <Card>
        <ChampionshipTable championship={championship} />
      </Card>
      <p className="mt-3 text-xs text-neutral-500">
        Only participants who competed in every category of the level are eligible. Order: sum of final places (lowest wins), then more 1st places, then 2nd, then 3rd; a remaining tie is decided by the jury.
      </p>
    </main>
  );
}
