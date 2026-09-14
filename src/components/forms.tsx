"use client";

import { useActionState, useEffect, useRef, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, Notice } from "@/components/ui";

export type FormState = { error?: string; ok?: string } | undefined;

// A form bound to a server action, showing the action's message under it.
// `resetOnOk` clears the fields after a success (create forms).
export function StateForm({
  action,
  children,
  className = "",
  resetOnOk = false,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    // A column form gets vertical spacing; a caller laying the form out as a
    // grid brings its own gaps, and space-y would shove the last cell down.
    <form ref={ref} action={formAction} className={className.includes("grid") ? className : `space-y-3 ${className}`}>
      {children}
      {state?.error && <div className="col-span-full"><Notice kind="error">{state.error}</Notice></div>}
      {state?.ok && <div className="col-span-full"><Notice kind="ok">{state.ok}</Notice></div>}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary", className = "" }: { children: ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? "..." : children}
    </Button>
  );
}

// A button that runs a server action with fixed arguments (status flips,
// deletes). `confirm` asks first. It is a plain button, not a form, so it
// can sit inside another form without submitting it.
export function ActionButton({
  action,
  children,
  variant = "secondary",
  confirm: confirmText,
  className = "",
}: {
  action: () => Promise<unknown>;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  confirm?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          try {
            await action();
          } catch (e) {
            // A redirect() inside the action throws on purpose; let it through.
            if (typeof (e as { digest?: string })?.digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")) throw e;
            window.alert(e instanceof Error ? e.message : "Something went wrong.");
          }
        });
      }}
    >
      {pending ? "..." : children}
    </Button>
  );
}
