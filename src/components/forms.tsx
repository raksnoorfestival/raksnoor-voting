"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
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
    <form ref={ref} action={formAction} className={`space-y-3 ${className}`}>
      {children}
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      {state?.ok && <Notice kind="ok">{state.ok}</Notice>}
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
// deletes). `confirm` asks first.
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
  return (
    <form
      action={async () => {
        if (confirmText && !window.confirm(confirmText)) return;
        try {
          await action();
        } catch (e) {
          window.alert(e instanceof Error ? e.message : "Something went wrong.");
        }
      }}
      className="inline"
    >
      <SubmitButton variant={variant} className={className}>{children}</SubmitButton>
    </form>
  );
}
