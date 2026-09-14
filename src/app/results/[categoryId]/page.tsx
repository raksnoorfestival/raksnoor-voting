import Link from "next/link";
import { notFound } from "next/navigation";
import { HowRankingWorks, ResultsTable, TieNotice } from "@/components/results-table";
import { Badge, Brand, Card } from "@/components/ui";
import { requirePublicAccess } from "@/lib/public-access";
import { categoryResults } from "@/lib/results";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export default async function PublicCategory({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const { event } = await requirePublicAccess();
  const results = await categoryResults(categoryId);
  if (!results || results.category.eventId !== event.id) notFound();
  if (!results.category.resultsVisible) notFound();
  const { category } = results;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/results" className="text-sm text-wine">&larr; Results</Link>
        <Brand small />
      </header>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{category.level.name}</div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
        </div>
        {category.status === "OPEN" ? <Badge tone="open">Live, may still change</Badge> : <Badge tone="closed">Final</Badge>}
      </div>
      <Card className="space-y-3">
        <TieNotice results={results} />
        <ResultsTable results={results} detailed />
      </Card>
      <div className="mt-4">
        <HowRankingWorks criteria={results.criteria} />
      </div>
      {category.status === "OPEN" && <AutoRefresh seconds={20} />}
    </main>
  );
}
