import { redirect } from "next/navigation";
import { Brand, Button, Card, Field, Input, Notice } from "@/components/ui";
import { getPublic } from "@/lib/session";

// A classic form: the password goes to /results/session, which answers
// with a redirect. No server action here on purpose (see that route).
export default async function ResultsLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getPublic()) redirect("/results");
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <Card className="w-full">
        <h1 className="mb-1 text-xl font-bold">Results</h1>
        <p className="mb-4 text-sm text-neutral-600">Enter the password given by the organisation.</p>
        <form method="post" action="/results/session" className="space-y-3">
          <Field label="Password">
            <Input name="password" type="password" autoComplete="off" required autoFocus />
          </Field>
          <Button type="submit" className="w-full">See the results</Button>
          {error && <Notice kind="error">{error}</Notice>}
        </form>
      </Card>
      <a href="/" className="text-xs text-neutral-500">Back</a>
    </main>
  );
}
