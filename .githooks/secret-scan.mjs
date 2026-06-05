#!/usr/bin/env node
// .githooks/secret-scan.mjs
//
// Scans STAGED file content for hardcoded credentials and blocks raw .env files.
// Invoked by .githooks/pre-commit. Node is always available in this project, so
// the scanner is written in Node rather than depending on Python.
//
// Exit codes:  0 = clean,  1 = secret(s) found / .env staged

import { execFileSync } from "node:child_process";
import path from "node:path";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const NC = "\x1b[0m";

// ── Patterns that indicate a hardcoded real credential ──────────────────────
const PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS Access Key ID"],
  [/AIzaSy[0-9A-Za-z\-_]{33}/, "GCP / Firebase API Key"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/, "Private key block"],
  [/ghp_[0-9a-zA-Z]{36}/, "GitHub Personal Access Token"],
  [/ghs_[0-9a-zA-Z]{36}/, "GitHub Actions token"],
  [/sk-[a-zA-Z0-9]{20,}/, "OpenAI-style secret key"],
  [/sk-ant-[a-zA-Z0-9\-_]{20,}/, "Anthropic API key"],
  // Postgres/MySQL connection string carrying a real (non-placeholder) password.
  [
    /(?:postgres(?:ql)?|mysql):\/\/[^:\s]+:(?!PASSWORD|password|CHANGE|changeme|\$|\{)[^@\s:]{6,}@/,
    "Database URL with embedded password",
  ],
  // Hardcoded literal assigned to a credential field. The value must be a single
  // contiguous token (no spaces) of >=12 chars — real keys/passwords look like
  // that, while UI strings ("Passwords do not match") have spaces and are ignored.
  // \b before the keyword stops camelCase substrings like `confirmPassword` matching.
  [
    /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key|auth[_-]?secret)\s*[:=]\s*["'](?!\$|\{|%|<|\*|replace-me|your[_-]?|change|placeholder|example)[^"'\s]{12,}["']/i,
    "Possible hardcoded credential",
  ],
];

const SKIP_EXTS = new Set([
  ".lock", ".sum", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp",
  ".woff", ".woff2", ".ttf", ".eot", ".map", ".bin", ".pyc", ".svg", ".pdf",
]);
const SKIP_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
]);
const SKIP_DIRS = new Set([".claude", "node_modules", ".next"]);

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

const staged = git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const hits = [];

for (const file of staged) {
  const base = path.basename(file);
  const ext = path.extname(file);
  const parts = file.replace(/\\/g, "/").split("/");

  if (SKIP_EXTS.has(ext) || SKIP_FILES.has(base) || parts.some((p) => SKIP_DIRS.has(p))) {
    continue;
  }

  // Allow example/sample/template env files; block every other .env / .env.* file.
  const isEnvExample = /\.env\..*(example|sample|template)/.test(base) || base === ".env.example";
  if (isEnvExample) continue;
  if (base === ".env" || /^\.env\..+/.test(base)) {
    hits.push({ file, line: 0, label: ".env file must not be committed" });
    continue;
  }

  let blob;
  try {
    blob = git(["show", `:${file}`]);
  } catch {
    continue; // not a blob (e.g. submodule) — skip
  }

  const lines = blob.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const [pattern, label] of PATTERNS) {
      if (pattern.test(lines[i])) {
        hits.push({ file, line: i + 1, label, preview: lines[i].trim().slice(0, 120) });
        break; // one hit per line is enough
      }
    }
  }
}

if (hits.length > 0) {
  for (const h of hits) {
    const loc = h.line ? `${h.file}:${h.line}` : h.file;
    process.stdout.write(`  ${RED}✗${NC} ${loc}  [${h.label}]\n`);
    if (h.preview) process.stdout.write(`    → ${h.preview}\n`);
  }
  process.exit(1);
}

process.stdout.write(`  ${GREEN}✓${NC} No secrets detected\n`);
process.exit(0);
