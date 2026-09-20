// Netlify sets COMMIT_REF at build time; locally there is no such thing,
// so the dev server never triggers a reload.
export function appVersion(): string {
  return process.env.COMMIT_REF ?? "dev";
}
