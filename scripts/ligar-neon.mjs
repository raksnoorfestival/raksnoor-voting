// Liga esta app a base de dados própria dentro do projeto Neon da loja.
// Corre-se UMA vez, à mão: `node scripts/ligar-neon.mjs`.
//
// 1. Lê a ligação da loja em ../site-aelita/.env.local (DIRECT_URL).
// 2. Cria a base de dados `raksnoor_voting` nesse servidor, se não existir.
// 3. Escreve o .env.local desta app a apontar para essa base de dados,
//    com um AUTH_SECRET novo. Nunca toca nas tabelas da loja.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const root = path.resolve(here, "..");
const shopEnv = path.resolve(root, "..", "site-aelita", ".env.local");
const ourEnv = path.join(root, ".env.local");

if (fs.existsSync(ourEnv)) {
  console.log(".env.local já existe; não mexo. Apaga-o se quiseres refazer.");
  process.exit(0);
}
const env = fs.readFileSync(shopEnv, "utf8");
const direct = env.match(/^DIRECT_URL="?([^"\r\n]+)/m)?.[1];
const pooled = env.match(/^DATABASE_URL="?([^"\r\n]+)/m)?.[1];
if (!direct || !pooled) throw new Error("Não encontrei DIRECT_URL/DATABASE_URL em " + shopEnv);

const client = new pg.Client({ connectionString: direct, ssl: { rejectUnauthorized: false } });
await client.connect();
const { rows } = await client.query("select datname from pg_database where datname = 'raksnoor_voting'");
if (rows.length === 0) {
  await client.query("create database raksnoor_voting");
  console.log("Base de dados raksnoor_voting criada.");
} else {
  console.log("A base de dados raksnoor_voting já existia.");
}
await client.end();

// Mesmo servidor, mesma senha, outra base de dados.
const swap = (u) => u.replace(/\/[^/?]+(\?|$)/, "/raksnoor_voting$1");
const secret = crypto.randomBytes(32).toString("base64url");
fs.writeFileSync(
  ourEnv,
  [
    `DATABASE_URL="${swap(pooled)}"`,
    `DIRECT_URL="${swap(direct)}"`,
    `AUTH_SECRET="${secret}"`,
    `ADMIN_EMAIL=""`,
    `ADMIN_NAME=""`,
    `ADMIN_PASSWORD=""`,
    "",
  ].join("\n"),
);
console.log("Escrito " + ourEnv);
console.log("Falta: preencher ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD nesse ficheiro.");
