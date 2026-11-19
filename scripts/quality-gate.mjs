#!/usr/bin/env node
// Exit 0: below threshold; 1: blocking findings; 2: unusable report or invocation.
import { readFileSync } from "node:fs";

const [tool, file, ...extra] = process.argv.slice(2);
if (!["semgrep", "axe", "osv"].includes(tool) || !file || extra.length) {
  console.error(
    "quality-gate: usage: node quality-gate.mjs <semgrep|axe|osv> <report.json>"
  );
  process.exit(2);
}

try {
  const report = JSON.parse(readFileSync(file, "utf8"));
  let levels;
  let allowed;
  let blocking;
  if (tool === "semgrep") {
    if (
      !Array.isArray(report?.results) ||
      !Array.isArray(report.errors) ||
      report.errors.length ||
      !Array.isArray(report.paths?.scanned) ||
      !report.paths.scanned.length
    ) {
      throw new Error("Incomplete scan");
    }
    levels = report.results.map((finding) => finding?.extra?.severity);
    allowed = ["INFO", "WARNING", "ERROR", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
    blocking = ["ERROR", "HIGH", "CRITICAL"];
  } else if (tool === "osv") {
    // osv-scanner fails on any vulnerability; the bar is CVSS high (7.0) and above. A group with no
    // score blocks too: an unscored advisory is unknown, not harmless.
    if (!Array.isArray(report?.results)) throw new Error("Incomplete scan");
    const groups = report.results.flatMap((r) =>
      (r?.packages ?? []).flatMap((p) => p?.groups ?? [])
    );
    levels = groups.map((g) => {
      const score = Number.parseFloat(g?.max_severity);
      return Number.isNaN(score)
        ? "unscored"
        : score >= 9
          ? "critical"
          : score >= 7
            ? "high"
            : score >= 4
              ? "medium"
              : "low";
    });
    allowed = ["low", "medium", "high", "critical", "unscored"];
    blocking = ["high", "critical", "unscored"];
  } else {
    // A browser error page can otherwise look like a successful accessibility scan.
    if (
      !Array.isArray(report) ||
      !report.length ||
      report.some(
        (page) =>
          !Array.isArray(page?.violations) ||
          typeof page.url !== "string" ||
          !["http:", "https:"].includes(new URL(page.url).protocol)
      )
    ) {
      throw new Error("Incomplete scan");
    }
    levels = report.flatMap((page) =>
      page.violations.map((finding) => finding?.impact)
    );
    allowed = ["minor", "moderate", "serious", "critical"];
    blocking = ["serious", "critical"];
  }
  if (levels.some((level) => !allowed.includes(level))) {
    throw new Error("Unknown severity");
  }
  const count = levels.filter((level) => blocking.includes(level)).length;
  console.log(`${tool}: ${levels.length} findings, ${count} blocking`);
  process.exitCode = count ? 1 : 0;
} catch {
  console.error(
    "quality-gate: unreadable, incomplete, or unsupported report; check the scanner output"
  );
  process.exitCode = 2;
}
