// Turns report.json (written by scripts/qa-e2e.mjs) into REPORT.md
import { readFileSync, writeFileSync } from 'node:fs'

const dir = new URL('.', import.meta.url)
const r = JSON.parse(readFileSync(new URL('report.json', dir), 'utf8'))

const MODULES = [
  ['ENVIRONMENT & BASELINE', /^(ENV|BASE)/],
  ['AUTH', /^AUTH/],
  ['CATEGORIES', /^CAT/],
  ['PRODUCTS', /^PROD/],
  ['WAREHOUSES', /^WH/],
  ['LOCATIONS', /^LOC/],
  ['INVENTORY', /^INV/],
  ['RECEIPTS', /^RECEIPT/],
  ['TRANSFERS', /^TRANSFER/],
  ['DELIVERIES', /^DELIVERY/],
  ['ADJUSTMENTS', /^ADJ/],
  ['END-TO-END SCENARIO (section 38)', /^E2E/],
  ['DASHBOARD', /^DASH-(\d|KPI)/],
  ['DASHBOARD FILTERS & PAGINATION', /^DASH-(F|PAGE)/],
  ['LEDGER', /^LEDGER/],
  ['DATA CONSISTENCY', /^RECON/],
  ['NEGATIVE TESTS', /^NEG/],
  ['ROLE SECURITY', /^ROLE/],
  ['REFRESH / PERSISTENCE', /^PERSIST/],
  ['NAVIGATION', /^NAV/],
  ['SEARCH / FILTERS', /^SEARCH/],
]
// Clean Material Symbols ligature words that leak into innerText (e.g. "errorA category…")
const clean = (s) => s.replace(/\b(error|close|done_all|check_circle|inventory|block)(?=[A-Z" ])/g, '').replace(/\|/g, '\\|')

const lines = []
lines.push('# StockSense E2E Test Report', '')
lines.push('```text')
lines.push('Environment:')
lines.push(`Frontend: ${r.app} (Vite dev server, real browser: Microsoft Edge via Playwright)`)
lines.push('Backend:  http://localhost:4100/api (NestJS, proxied by the frontend at /api)')
lines.push('Database: PostgreSQL 17 (Docker container stocksense-db, database "stocksense") — real database, QA data kept')
lines.push(`Run:      ${r.started} → ${r.finished}`)
lines.push('')
lines.push(`Total Tests: ${r.results.length}`)
lines.push(`Passed:      ${r.counts.PASS}`)
lines.push(`Failed:      ${r.counts.FAIL ?? 0}`)
lines.push('Fixed:       5 (found while preparing the run, fixed and verified before the final run — see "Failures found and fixed")')
lines.push(`Blocked:     ${r.counts.BLOCKED ?? 0}`)
lines.push('')
for (const [name, re] of MODULES) {
  const rows = r.results.filter((x) => re.test(x.id))
  if (!rows.length) continue
  const ok = rows.every((x) => x.status === 'PASS')
  lines.push(`${name.padEnd(36)} ${ok ? 'PASS' : 'FAIL'} (${rows.filter((x) => x.status === 'PASS').length}/${rows.length})`)
}
lines.push('```', '')

lines.push('## Test accounts (kept)', '')
lines.push('| Role | Name | Email | Password |', '|---|---|---|---|')
lines.push('| INVENTORY_MANAGER | QA Inventory Manager | qa.inventory.manager@example.com | Qa@2026StockSense! |')
lines.push('| WAREHOUSE_STAFF | QA Warehouse Staff | qa.warehouse.staff@example.com | Qa@2026StockSense! |', '')

lines.push('## Every test with evidence', '')
lines.push('Screenshots: `screenshots/<Test ID>.png` (taken at the end of each test).', '')
for (const [name, re] of MODULES) {
  const rows = r.results.filter((x) => re.test(x.id))
  if (!rows.length) continue
  lines.push(`### ${name}`, '', '| Test ID | Test | Result | Evidence (observed) |', '|---|---|---|---|')
  for (const x of rows) lines.push(`| ${x.id} | ${x.title.replace(/\|/g, '\\|')} | **${x.status}** | ${clean(x.evidence)} |`)
  lines.push('')
}
if (r.notes?.length) lines.push('## Notes', '', ...r.notes.map((n) => `- ${n}`), '')

lines.push(readFileSync(new URL('fixes.md', dir), 'utf8'))
writeFileSync(new URL('REPORT.md', dir), lines.join('\n'))
console.log('REPORT.md written:', r.results.length, 'tests')
