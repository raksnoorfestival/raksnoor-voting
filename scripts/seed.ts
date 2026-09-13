// Creates the first admin from the environment when there is none. Safe to
// run again: does nothing once an admin exists.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const count = await db.admin.count();
  if (count > 0) {
    console.log("An admin already exists; nothing to do.");
    return;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !name || !password || password.length < 8) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD (8+ characters) in .env.local");
  }
  await db.admin.create({ data: { email, name, passwordHash: await bcrypt.hash(password, 10) } });
  console.log(`Admin ${email} created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
