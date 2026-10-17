// Applies pending Prisma migrations during Vercel builds.
//
// Vercel's zero-config Node build runs a plain `npm install` and ignores the
// project's custom Install/Build Command, so the old `prisma migrate deploy` step
// there never ran — production silently fell behind the schema. `postinstall` is
// the one hook that reliably runs on every Vercel build, so it calls this. Outside
// Vercel (local installs, CI) it's a no-op; use `npm run prisma:migrate` there.
const { execSync } = require("child_process");

if (!process.env.VERCEL) process.exit(0);
// Other Vercel projects built from this monorepo (the web app) also run this
// postinstall but have no database — nothing to migrate there.
if (!process.env.DATABASE_URL) {
  console.log("[migrate] no DATABASE_URL in this Vercel project — skipping migrations.");
  process.exit(0);
}
console.log("[migrate] applying pending migrations…");
execSync("npx prisma migrate deploy", { stdio: "inherit", cwd: __dirname + "/.." });
