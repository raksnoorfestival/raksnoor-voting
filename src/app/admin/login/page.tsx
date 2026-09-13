import { redirect } from "next/navigation";
import { adminLogin } from "@/actions/auth";
import { StateForm, SubmitButton } from "@/components/forms";
import { Brand, Card, Field, Input } from "@/components/ui";
import { getAdmin } from "@/lib/session";

export default async function AdminLogin() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <Card className="w-full">
        <h1 className="mb-1 text-xl font-bold">Organisation sign in</h1>
        <p className="mb-4 text-sm text-neutral-600">Admin access to categories, participants, judges and results.</p>
        <StateForm action={adminLogin}>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="username" required autoFocus />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </StateForm>
      </Card>
      <a href="/" className="text-xs text-neutral-500">Back</a>
    </main>
  );
}
