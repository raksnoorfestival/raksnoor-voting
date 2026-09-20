"use client";

import { Button } from "@/components/ui";

// Without this, any error while a page renders in the browser leaves a
// blank white screen (the iPhone on 20 September 2026). Better a sentence
// and a button.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-neutral-600">The page could not be shown. Try again, or go back and open it once more.</p>
      {error.digest && <p className="text-xs text-neutral-400">Reference: {error.digest}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={() => reset()}>Try again</Button>
        <Button type="button" variant="secondary" onClick={() => window.location.assign("/")}>Home</Button>
      </div>
    </main>
  );
}
