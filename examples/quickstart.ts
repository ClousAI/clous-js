/**
 * Quickstart: search filings, fetch financials, and ask a grounded question.
 *
 *   CLOUS_API_KEY=clous_live_... npx tsx examples/quickstart.ts
 */
import { Clous } from "../src/index.js";

const clous = new Clous(); // reads process.env.CLOUS_API_KEY

async function main() {
  // 1. Search recent 8-K filings for NVIDIA.
  const filings = await clous.filings.search({ q: "NVIDIA", form_type: "8-K", limit: 3 });
  console.log("Latest 8-Ks:");
  for (const f of filings.data) console.log("  ", f);
  console.log("source:", filings.source, "as_of:", filings.as_of);

  // 2. Token-efficient projection with `fields`.
  const lean = await clous.filings.search({
    form_type: "4",
    fields: ["accession", "company_name", "filed_at"],
    limit: 2,
  });
  console.log("Lean projection:", lean.data);

  // 3. All XBRL facts for Apple (CIK), then just one concept.
  const revenue = await clous.financials.get("0000320193", { concept: "Revenues" });
  console.log("Apple revenue facts:", revenue.data.length);

  // 4. Grounded, cited answer.
  const answer = await clous.answer({
    q: "What was the most recent material event NVIDIA disclosed?",
    ticker: "NVDA",
  });
  console.log("Answer:", answer.data[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
