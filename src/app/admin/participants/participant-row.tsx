"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteParticipant, updateParticipant } from "@/actions/admin";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Button, Field, Input } from "@/components/ui";

type Entry = { id: string; categoryId: string; number: number; level: string; category: string };

// One line per participant; the edit form only opens on request, so a long
// list stays a list.
export function ParticipantRow({ id, name, notes, entries }: { id: string; name: string; notes: string | null; entries: Entry[] }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="border-b border-neutral-100 py-2">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{name}</span>
        {notes && <span className="text-xs text-neutral-500">{notes}</span>}
        <span className="flex flex-wrap gap-1">
          {entries.length === 0 && <span className="text-xs text-neutral-400">no category yet</span>}
          {entries.map((e) => (
            <Link key={e.id} href={`/admin/categories/${e.categoryId}`} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs hover:bg-wine-light hover:text-wine">
              {e.level} / {e.category} #{e.number}
            </Link>
          ))}
        </span>
        </div>
        <Button variant="ghost" className="h-8 shrink-0 px-2 text-xs" onClick={() => setEditing((v) => !v)}>
          {editing ? "Close" : "Edit"}
        </Button>
      </div>
      {editing && (
        <StateForm action={updateParticipant} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <input type="hidden" name="id" value={id} />
          <Field label="Name"><Input name="name" defaultValue={name} required /></Field>
          <Field label="Notes"><Input name="notes" defaultValue={notes ?? ""} placeholder="school, country, contact" /></Field>
          <SubmitButton variant="secondary">Save</SubmitButton>
          <ActionButton action={deleteParticipant.bind(null, id)} variant="danger" confirm={`Delete ${name}?`}>Delete</ActionButton>
        </StateForm>
      )}
    </div>
  );
}
