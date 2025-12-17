import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function fetchAndExtract(url: string) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(id);
  if (!res.ok) throw new Error("Fetch failed");
  const html = await res.text();
  const $ = cheerio.load(html);

  // Try schema.org JSON-LD
  const ld = $("script[type=\"application/ld+json\"]").map((i, el) => $(el).html()).get();
  for (const item of ld) {
    try {
      const parsed = JSON.parse(item!);
      // normalized detection: Offer or array
      if (parsed && (parsed["@type"] === "Offer" || parsed["@graph"])) {
        const price = parsed.price || parsed.offers?.price;
        const title = parsed.name || parsed.offers?.name;
        if (price) return { site: url, price, title };
      }
    } catch {}
  }

  // Try meta tags
  const ogPrice = $("meta[property=\"og:price:amount\"]").attr("content");
  if (ogPrice) {
    return { site: url, price: ogPrice, title: $("meta[property=\"og:title\"]").attr("content") || "" };
  }

  // Heuristic: search for price-like elements
  const priceCandidates = $("[class*=\"price\"], [id*=\"price\"]").map((i, el) => $(el).text()).get();
  for (const c of priceCandidates) {
    const m = c.match(/[\d\.,]+\s*(₽|₽|USD|€|\$)?/i);
    if (m) return { site: url, price: m[0].trim(), title: $("title").text().trim() };
  }

  // Fallback: return snippet for model to parse
  const snippet = $("body").find("*").slice(0, 30).text().slice(0, 1500);
  return { site: url, htmlSnippet: snippet, title: $("title").text().trim() };
}
