"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { error?: string; ok?: string } | null;
export type FormAction = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/** A form bound to a server action that shows its error/success message. */
export function ActionForm({
  action,
  children,
  className,
  confirm,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && <p className="mt-2 text-sm text-henna">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-teal">{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Please wait…" : children}
    </button>
  );
}
