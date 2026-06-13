/**
 * Auto-pagination: stream every matching record across all pages with a single
 * `for await ... of` loop. The SDK follows `page.next_cursor` for you.
 *
 *   CLOUS_API_KEY=clous_live_... npx tsx examples/paginate.ts
 */
import { Clous } from "../src/index.js";

const clous = new Clous();

async function main() {
  let count = 0;
  // Iterate all 13F managers with at least $10B AUM (use a big page size).
  for await (const manager of clous.managers.iterate({ aum_min: 10_000_000_000, limit: 100 })) {
    count++;
    if (count <= 5) console.log(manager);
    if (count >= 250) break; // stop early for the demo
  }
  console.log(`Streamed ${count} managers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
