/**
 * Monitoring: register a webhook endpoint, create a monitor that fires on
 * material NVIDIA events, then read the live events feed.
 *
 *   CLOUS_API_KEY=clous_live_... npx tsx examples/monitors.ts
 */
import { Clous } from "../src/index.js";

const clous = new Clous();

async function main() {
  // 1. Register a webhook endpoint (https only).
  const ep = await clous.webhooks.endpoints.create({
    url: "https://example.com/clous-hook",
    description: "demo endpoint",
  });
  const endpointId = (ep.data[0] as { id: string }).id;

  // 2. Create a monitor on NVDA, firing on a few signals at medium+ importance.
  const monitor = await clous.monitors.create({
    name: "NVIDIA material changes",
    target_type: "ticker",
    target_value: "NVDA",
    signals: ["sec.filing.new", "sec.8k.executive_change", "sec.form4.insider_sell"],
    materiality: "medium",
    cadence: "1h",
    trigger_on_create: true,
    metadata: { team: "research" },
    webhook_endpoint_id: endpointId,
  });
  const monitorId = (monitor.data[0] as { id: string }).id;
  console.log("Created monitor:", monitorId);

  // 3. Pause / resume.
  await clous.monitors.pause(monitorId);
  await clous.monitors.resume(monitorId);

  // 4. Read the events feed directly (what monitors match against).
  const events = await clous.events.list({ ticker: "NVDA", importance: "high", limit: 5 });
  console.log("Recent high-importance NVDA events:", events.data);

  // 5. Clean up the demo monitor.
  await clous.monitors.delete(monitorId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
