/**
 * The Clous AI endpoint is OpenAI-compatible. You can use the Clous SDK's
 * `chat.completions.create`, OR point the official `openai` client at Clous —
 * both hit `POST /v1/chat/completions` and answer grounded in SEC filings.
 *
 *   CLOUS_API_KEY=clous_live_... npx tsx examples/openai-compatible.ts
 */
import { Clous } from "../src/index.js";

const clous = new Clous();

async function main() {
  // Using the Clous SDK directly:
  const completion = await clous.chat.completions.create({
    model: "clous",
    messages: [
      { role: "user", content: "Summarize Tesla's most recent 8-K in two sentences." },
    ],
  });
  console.log(JSON.stringify(completion, null, 2));

  // Equivalent with the official `openai` package (uncomment after `npm i openai`):
  //
  // import OpenAI from "openai";
  // const openai = new OpenAI({
  //   apiKey: process.env.CLOUS_API_KEY,
  //   baseURL: "https://api.clous.ai/v1",
  // });
  // const res = await openai.chat.completions.create({
  //   model: "clous",
  //   messages: [{ role: "user", content: "Summarize Tesla's most recent 8-K." }],
  // });
  // console.log(res.choices[0].message.content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
