import OpenAI from "openai";
import { NextResponse } from "next/server";
import { fetchAndExtract } from "../../../lib/extract";

const OPEN_ROUTER_TOKEN = process.env.OPEN_ROUTER_TOKEN;
const SITE_URL = process.env.OPENROUTER_SITE_URL || "http://localhost:3000";
const SITE_TITLE = process.env.OPENROUTER_SITE_TITLE || "AnalyzePrices";
const MODEL_AI = process.env.MODEL_AI || "";

if (!OPEN_ROUTER_TOKEN) {
  throw new Error(
    "OPEN_ROUTER_TOKEN is not set. Put it into .env.local (do not commit)."
  );
}

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPEN_ROUTER_TOKEN,
  defaultHeaders: {
    "HTTP-Referer": SITE_URL, // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": SITE_TITLE, // Optional. Site title for rankings on openrouter.ai.
  },
});

export const analyzePagesContent = async ({
  messages,
  model = MODEL_AI,
}: {
  messages: Array<{ role: string; content: string | null; name?: string }>; // simplified message type for SDK
  model?: string;
}) => {
  const result = await openai.chat.completions.create({
    model,
    // SDK typing is stricter than our simplified Message type; suppress explicit any warning here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
    stream: false,
  });

  // const response = result.choices[0].message.content;
  return result;
};

export async function POST(request: Request) {
  const { from, search } = await request.json();

  // Валидация
  if (!Array.isArray(from)) {
    return NextResponse.json(
      { error: "`from` should be array" },
      { status: 400 }
    );
  }
  if (!search || typeof search !== "string") {
    return NextResponse.json(
      { error: "`search` must be a string" },
      { status: 400 }
    );
  }

  // Fetch & extract data from sites
  const settle = await Promise.allSettled(
    from.map((url) => fetchAndExtract(url))
  );
  type Extracted = {
    site: string;
    price?: string;
    title?: string;
    htmlSnippet?: string;
    error?: string;
  };
  const extracted = settle.map((s, i) => {
    if (s.status === "fulfilled") return s.value as Extracted;
    return {
      site: from[i],
      error: String((s as PromiseRejectedResult).reason),
    } as Extracted;
  });

  // Build a compact input for the model
  const modelInput = extracted.map((e: Extracted) => {
    if (e.price) {
      return {
        site: e.site,
        price: e.price,
        title: e.title ?? null,
        source: "extracted",
      };
    }
    return {
      site: e.site,
      snippet: e.htmlSnippet ?? "",
      title: e.title ?? null,
      source: "snippet",
    };
  });

  // build messages (user/system)
  const messages = [
    {
      role: "system",
      content:
        "You are a JSON-only assistant. Output: { data: [{ site: string, price: number|null, currency: string|null, confidence: number }] }. Only find prices in RUBLE (examples: ₽, руб, RUB). Do NOT convert other currencies. If no ruble price, set price=null.",
    },
    {
      role: "user",
      content: `Search: "${search}". For these sites, return JSON with the ruble price or null. Data: ${JSON.stringify(
        modelInput
      )}`,
    },
  ];

  // Call model via analyzePagesContent
  const aiResult = await analyzePagesContent({
    messages,
    model: "gpt-4o-mini",
  });

  // Extract text and try to parse JSON
  const text = aiResult?.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(text);
    return NextResponse.json({ extracted, model: parsed });
  } catch {
    // If parsing fails, return fallback: raw model text + extracted data
    return NextResponse.json(
      { extracted, modelRaw: text, error: "Model response not valid JSON" },
      { status: 207 }
    );
  }
}
