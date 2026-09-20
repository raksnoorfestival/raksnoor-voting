// Set in next.config.ts from Netlify's COMMIT_REF at build time, and
// inlined into the code; "dev" locally, so the dev server never reloads.
export function appVersion(): string {
  return process.env.APP_VERSION ?? "dev";
}
