// Applies pending Prisma migrations during Vercel builds.
//
// Vercel's zero-config Node build runs a plain `npm install` and ignores the
// project's custom Install/Build Command, so the old `prisma migrate deploy` step
// there never ran — production silently fell behind the schema. `postinstall` is
// the one hook that reliably runs on every Vercel build, so it calls this. Outside
// Vercel (local installs, CI) it's a no-op; use `npm run prisma:migrate` there.
const { execSync } = require("child_process");

if (!process.env.VERCEL) process.exit(0);
if (!process.env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set for this Vercel build — cannot apply migrations.");
  process.exit(1);
}
console.log("[migrate] applying pending migrations…");
execSync("npx prisma migrate deploy", { stdio: "inherit", cwd: __dirname + "/.." });
