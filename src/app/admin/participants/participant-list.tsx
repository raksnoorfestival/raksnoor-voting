"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteParticipant, updateParticipant } from "@/actions/admin";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, LinkButton } from "@/components/ui";

type Entry = { id: string; categoryId: string; number: number; level: string; category: string };
type Participant = { id: string; name: string; notes: string | null; entries: Entry[] };

function Chips({ entries }: { entries: Entry[] }) {
  return (
    <span className="flex flex-wrap gap-1 text-xs">
      {entries.length === 0 && <span className="text-neutral-400">In no category yet</span>}
      {entries.map((e) => (
        <Link key={e.id} href={`/admin/categories/${e.categoryId}`} className="rounded-full bg-neutral-100 px-2 py-0.5 hover:bg-wine-light hover:text-wine">
          {e.level} / {e.category} #{e.number}
        </Link>
      ))}
    </span>
  );
}

// The list lives behind a header with an arrow: closed, only the count
// shows; open, every row with its edit form. A search opens it.
export function ParticipantList({ participants, query, total }: { participants: Participant[]; query: string; total: number }) {
  const [open, setOpen] = useState(query !== "");
  const label = query ? `${total} match${total === 1 ? "" : "es"}` : "Participants";
  return (
    <>
      <form className="mb-3 flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs">
          <Input name="q" defaultValue={query} placeholder="Search by name" />
        </div>
        <SubmitButton variant="secondary">Search</SubmitButton>
        {query && <LinkButton href="/admin/participants" variant="ghost">Clear</LinkButton>}
      </form>

      <Card className="p-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-5 py-4 text-left"
        >
          <span className="text-sm font-bold uppercase tracking-wide">{label}</span>
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-2 text-xs font-bold text-white">{total}</span>
          <svg
            className={`ml-auto h-5 w-5 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {open && (
          <div className="space-y-2 border-t border-neutral-100 p-3">
            {participants.length === 0 && <p className="py-2 text-sm text-neutral-600">{query ? "No match." : "No participants yet."}</p>}
            {participants.map((p) => (
              <div key={p.id} className="rounded-xl border border-neutral-200 p-3">
                <StateForm action={updateParticipant} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                  <input type="hidden" name="id" value={p.id} />
                  <Field label="Name"><Input name="name" defaultValue={p.name} required /></Field>
                  <Field label="Notes"><Input name="notes" defaultValue={p.notes ?? ""} placeholder="school, country, contact" /></Field>
                  <SubmitButton variant="secondary">Save</SubmitButton>
                  <ActionButton action={deleteParticipant.bind(null, p.id)} variant="danger" confirm={`Delete ${p.name}?`}>Delete</ActionButton>
                </StateForm>
                <div className="mt-2">
                  <Chips entries={p.entries} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
