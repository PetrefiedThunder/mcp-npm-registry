#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const REGISTRY = "https://registry.npmjs.org";
const SEARCH = "https://registry.npmjs.org/-/v1/search";
const API = "https://api.npmjs.org";
const RATE_LIMIT_MS = 200;
let last = 0;

async function npmFetch(url: string): Promise<any> {
  const now = Date.now(); if (now - last < RATE_LIMIT_MS) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - (now - last)));
  last = Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`npm ${res.status}`);
  return res.json();
}

const server = new McpServer({ name: "mcp-npm-registry", version: "1.0.0" });

server.tool("search", "Search npm packages.", {
  query: z.string(), size: z.number().min(1).max(250).default(10),
}, async ({ query, size }) => {
  const d = await npmFetch(`${SEARCH}?text=${encodeURIComponent(query)}&size=${size}`);
  const pkgs = d.objects?.map((o: any) => ({
    name: o.package?.name, version: o.package?.version, description: o.package?.description?.slice(0, 200),
    keywords: o.package?.keywords?.slice(0, 5), publisher: o.package?.publisher?.username,
    score: Math.round((o.score?.final || 0) * 100) / 100,
  }));
  return { content: [{ type: "text" as const, text: JSON.stringify({ total: d.total, packages: pkgs }, null, 2) }] };
});

server.tool("get_package", "Get package metadata.", {
  name: z.string().describe("Package name (e.g. 'express', '@modelcontextprotocol/sdk')"),
}, async ({ name }) => {
  const d = await npmFetch(`${REGISTRY}/${encodeURIComponent(name)}`);
  const latest = d["dist-tags"]?.latest;
  const v = d.versions?.[latest];
  return { content: [{ type: "text" as const, text: JSON.stringify({
    name: d.name, version: latest, description: d.description,
    license: v?.license, homepage: d.homepage, repository: d.repository?.url,
    dependencies: v?.dependencies ? Object.keys(v.dependencies) : [],
    distTags: d["dist-tags"], maintainers: d.maintainers?.map((m: any) => m.name),
  }, null, 2) }] };
});

server.tool("get_versions", "List all versions of a package.", {
  name: z.string(),
}, async ({ name }) => {
  const d = await npmFetch(`${REGISTRY}/${encodeURIComponent(name)}`);
  const versions = Object.keys(d.versions || {}).reverse();
  return { content: [{ type: "text" as const, text: JSON.stringify({
    name: d.name, distTags: d["dist-tags"], totalVersions: versions.length,
    versions: versions.slice(0, 50),
  }, null, 2) }] };
});

server.tool("get_downloads", "Get download counts for a package.", {
  name: z.string(), period: z.enum(["last-day", "last-week", "last-month", "last-year"]).default("last-week"),
}, async ({ name, period }) => {
  const d = await npmFetch(`${API}/downloads/point/${period}/${encodeURIComponent(name)}`);
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

server.tool("compare_packages", "Compare download stats of multiple packages.", {
  packages: z.string().describe("Comma-separated package names"),
  period: z.enum(["last-day", "last-week", "last-month", "last-year"]).default("last-month"),
}, async ({ packages, period }) => {
  const names = packages.split(",").map((n) => n.trim());
  const results = await Promise.all(names.map(async (name) => {
    try {
      const d = await npmFetch(`${API}/downloads/point/${period}/${encodeURIComponent(name)}`);
      return { package: name, downloads: d.downloads };
    } catch { return { package: name, downloads: 0, error: "not found" }; }
  }));
  results.sort((a, b) => b.downloads - a.downloads);
  return { content: [{ type: "text" as const, text: JSON.stringify({ period, results }, null, 2) }] };
});

async function main() { const t = new StdioServerTransport(); await server.connect(t); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
