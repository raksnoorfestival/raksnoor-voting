// Writes public/version.json while building, with the same build code the
// pages carry (next.config.ts). Open pages read it every minute to know when
// to reload themselves (UpdateWatch). A plain file is served by Netlify's CDN
// and costs none of the free plan's 125,000 function calls a month; the old
// /api/version route did, once a minute per open screen.
import { writeFileSync } from "node:fs";

const version = process.env.COMMIT_REF ?? process.env.DEPLOY_ID ?? "dev";
writeFileSync("public/version.json", JSON.stringify({ version }));
console.log(`public/version.json: ${version}`);
