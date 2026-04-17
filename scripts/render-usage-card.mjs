#!/usr/bin/env node
// Reads `ccusage daily --json` output on stdin and writes an SVG card to the path
// passed as argv[2] (default: claude-usage/card.svg).
//
// Visual style is modeled on vn7n24fzkq/github-profile-summary-cards so the card
// blends with the rest of the profile page.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outPath = resolve(process.argv[2] ?? "claude-usage/card.svg");

const raw = readFileSync(0, "utf8");
let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error("render-usage-card: could not parse stdin as JSON");
  process.exit(1);
}

// ccusage shape: { daily: [ { date, inputTokens, outputTokens, totalTokens, totalCost, modelsUsed } ], totals: {...} }
const daily = Array.isArray(data.daily) ? data.daily : [];
const last14 = daily.slice(-14);

const totalTokens = last14.reduce((sum, d) => sum + (d.totalTokens ?? 0), 0);
const totalCost = last14.reduce((sum, d) => sum + (d.totalCost ?? 0), 0);

// Dominant model across the window
const modelCounts = new Map();
for (const d of last14) {
  for (const m of d.modelsUsed ?? []) {
    modelCounts.set(m, (modelCounts.get(m) ?? 0) + 1);
  }
}
const topModel = [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

// ---- Bar chart geometry ----
const W = 540;
const H = 285;
const PAD_X = 25;
const CHART_TOP = 150;
const CHART_BOTTOM = 250;
const CHART_H = CHART_BOTTOM - CHART_TOP;
const CHART_W = W - 2 * PAD_X;
const N = Math.max(last14.length, 1);
const barGap = 4;
const barW = Math.max(1, (CHART_W - barGap * (N - 1)) / N);
const maxTokens = Math.max(1, ...last14.map((d) => d.totalTokens ?? 0));

const bars = last14
  .map((d, i) => {
    const h = ((d.totalTokens ?? 0) / maxTokens) * CHART_H;
    const x = PAD_X + i * (barW + barGap);
    const y = CHART_BOTTOM - h;
    return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="2" fill="#7aa2f7"><title>${escapeXml(
      d.date ?? ""
    )}: ${(d.totalTokens ?? 0).toLocaleString()} tokens</title></rect>`;
  })
  .join("");

// Axis labels — first and last date
const firstDate = last14[0]?.date ?? "";
const lastDate = last14[last14.length - 1]?.date ?? "";

const fmtTokens = (n) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Claude Code usage (last 14 days)">
  <style>
    .bg { fill: #1a1b27; }
    .title { fill: #bb9af7; font: 600 18px "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .label { fill: #a9b1d6; font: 400 12px "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .value { fill: #c0caf5; font: 600 14px "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .axis  { fill: #565f89; font: 400 10px "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  </style>
  <rect class="bg" width="100%" height="100%" rx="10" ry="10" />
  <text class="title" x="${PAD_X}" y="38">Claude Code usage</text>
  <text class="label" x="${PAD_X}" y="60">last 14 days</text>

  <text class="label" x="${PAD_X}"        y="95">Tokens</text>
  <text class="value" x="${PAD_X}"        y="118">${fmtTokens(totalTokens)}</text>

  <text class="label" x="${PAD_X + 170}"  y="95">Cost (USD)</text>
  <text class="value" x="${PAD_X + 170}"  y="118">$${totalCost.toFixed(2)}</text>

  <text class="label" x="${PAD_X + 340}"  y="95">Top model</text>
  <text class="value" x="${PAD_X + 340}"  y="118">${escapeXml(topModel)}</text>

  <g>${bars}</g>
  <text class="axis" x="${PAD_X}" y="268" text-anchor="start">${escapeXml(firstDate)}</text>
  <text class="axis" x="${W - PAD_X}" y="268" text-anchor="end">${escapeXml(lastDate)}</text>
</svg>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, svg, "utf8");
console.log(`render-usage-card: wrote ${outPath} (${last14.length} days, ${fmtTokens(totalTokens)} tokens, $${totalCost.toFixed(2)})`);

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
