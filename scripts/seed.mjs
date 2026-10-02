// Loads the sample activities into your local database (spec §6).
// The local site must be running: `npm run dev` in another window.
if (process.env.DATABASE_URL || process.env.VERCEL || process.env.NODE_ENV === "production") {
  console.error("Sample data is for local testing only. It must never be loaded in production.");
  process.exit(1);
}
const port = process.env.PORT || 3000;
try {
  const res = await fetch(`http://localhost:${port}/api/dev/seed`, { method: "POST" });
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.error || `status ${res.status}`);
  console.log(`Loaded ${body.activities} sample activities from ${body.ngos} made-up NGOs. Open http://localhost:${port}`);
  console.log("To act as a sample NGO, sign in with rekha.joshi@example.org (any name and mobile).");
} catch (e) {
  console.error(`Couldn't reach the local site on port ${port}. Start it with "npm run dev" first.\n${e.message}`);
  process.exit(1);
}
