import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

type Finding = {
  file: string;
  line: number;
  pattern: string;
  text: string;
};

const scannedRoots = ["app"];
const scannedExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

const blockedPatterns = [
  /\bmock(?:ed|s|ing)?\b/i,
  /\bfake\b/i,
  /\bdummy\b/i,
  /\bsample(?:s)?\b/i,
  /\bsimulated\b/i,
  /\bfallback\b/i,
  /layout preview/i,
  /using fallback data/i,
  /showing fallback/i,
  /showing sample/i,
  /fallback-[a-z0-9-]+/i,
  /falling back to simulated/i,
  /let\s+\w*(?:Count|Counts)\s*=\s*\d+;/i
];

const allowedLinePatterns = [
  /placeholder=/i,
  /No sample data is injected/i,
  /does not create mock/i,
  /cannot be mocked/i,
  /rules_fallback/i
];

function listSourceFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }

    if (stats.isFile() && scannedExtensions.has(extname(path))) {
      files.push(path);
    }
  }

  return files;
}

function listScannedFiles() {
  return scannedRoots.flatMap((root) => listSourceFiles(root));
}

function shouldSkipLine(line: string) {
  return allowedLinePatterns.some((pattern) => pattern.test(line));
}

function findMockDataSignals() {
  const findings: Finding[] = [];

  for (const file of listScannedFiles()) {
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (shouldSkipLine(line)) return;

      for (const pattern of blockedPatterns) {
        if (!pattern.test(line)) continue;
        findings.push({
          file: relative(process.cwd(), file),
          line: index + 1,
          pattern: pattern.toString(),
          text: line.trim()
        });
      }
    });
  }

  return findings;
}

const findings = findMockDataSignals();

if (findings.length > 0) {
  console.error("Mock/fallback data signals were found in web application code.");
  console.error("The UI must use live database data or fail visibly instead of injecting sample records.\n");

  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}`);
    console.error(`  pattern: ${finding.pattern}`);
    console.error(`  ${finding.text}\n`);
  }

  process.exit(1);
}

console.log("No mock/fallback data signals found in app web code.");
