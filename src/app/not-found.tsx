import Link from "next/link";

// Installed on a phone the app has no browser back button, so a page that
// is gone (a category put back to draft, a judge made inactive) must offer
// a way out.
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">This page is not available</h1>
      <p className="text-sm text-neutral-600">It may have been closed or moved by the organisation.</p>
      <div className="flex gap-3 text-sm">
        <Link href="/judge" className="text-wine underline">Judge categories</Link>
        <Link href="/results" className="text-wine underline">Results</Link>
        <Link href="/" className="text-wine underline">Home</Link>
      </div>
    </main>
  );
}
