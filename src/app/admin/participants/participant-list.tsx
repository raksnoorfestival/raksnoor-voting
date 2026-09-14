"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteParticipant, updateParticipant } from "@/actions/admin";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Button, Card, Field, Input } from "@/components/ui";

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

// The full rows, with the edit form always open, or one line per person:
// the "Compact" button switches between the two.
export function ParticipantList({ participants }: { participants: Participant[] }) {
  const [compact, setCompact] = useState(false);
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="secondary" onClick={() => setCompact((v) => !v)}>
          {compact ? "Full rows" : "Compact"}
        </Button>
      </div>
      {compact ? (
        <Card className="p-3">
          {participants.map((p) => (
            <div key={p.id} className="flex items-start gap-3 border-b border-neutral-100 py-2 last:border-0">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{p.name}</span>
                {p.notes && <span className="text-xs text-neutral-500">{p.notes}</span>}
                <Chips entries={p.entries} />
              </div>
            </div>
          ))}
        </Card>
      ) : (
        <div className="space-y-2">
          {participants.map((p) => (
            <Card key={p.id} className="p-3">
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
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
