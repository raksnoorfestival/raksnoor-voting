import { judgeLogin } from "@/actions/auth";
import { StateForm, SubmitButton } from "@/components/forms";
import { Brand, Card, Field, Input } from "@/components/ui";
import { getJudge } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function JudgeLogin() {
  if (await getJudge()) redirect("/judge");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <Card className="w-full">
        <h1 className="mb-1 text-xl font-bold">Judge sign in</h1>
        <p className="mb-4 text-sm text-neutral-600">Use the name and password the organisation gave you.</p>
        <StateForm action={judgeLogin}>
          <Field label="Name">
            <Input name="name" autoComplete="off" autoCapitalize="words" required autoFocus />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="off" required />
          </Field>
          <SubmitButton className="w-full">Sign in</SubmitButton>
        </StateForm>
      </Card>
      <a href="/" className="text-xs text-neutral-500">Back</a>
    </main>
  );
}
