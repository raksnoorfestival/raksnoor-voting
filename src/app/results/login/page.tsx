import { redirect } from "next/navigation";
import { publicLogin } from "@/actions/auth";
import { StateForm, SubmitButton } from "@/components/forms";
import { Brand, Card, Field, Input } from "@/components/ui";
import { getPublic } from "@/lib/session";

export default async function ResultsLogin() {
  if (await getPublic()) redirect("/results");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <Card className="w-full">
        <h1 className="mb-1 text-xl font-bold">Results</h1>
        <p className="mb-4 text-sm text-neutral-600">Enter the password given by the organisation.</p>
        <StateForm action={publicLogin}>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="off" required autoFocus />
          </Field>
          <SubmitButton className="w-full">See the results</SubmitButton>
        </StateForm>
      </Card>
      <a href="/" className="text-xs text-neutral-500">Back</a>
    </main>
  );
}
