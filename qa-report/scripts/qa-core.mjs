// Shared harness for the StockSense browser QA pass: results with evidence, screenshots, console/network capture.
import { chromium } from 'playwright-core'
import fs from 'node:fs'

export const APP = process.env.APP
const REAL = process.env.QA_REAL_RUN === '1'
if (!APP || (REAL ? !APP.includes(':5173') : !APP.includes(':5174'))) {
  throw new Error('APP must be the throwaway UI (:5174 via run-ui-test.mjs), or :5173 with QA_REAL_RUN=1 (user-requested real run)')
}
export const OUT = process.env.QA_OUT ?? (REAL ? 'qa-real' : 'qa-dev')
fs.mkdirSync(OUT, { recursive: true })

export const results = []
let current = null
const issues = []

export const browser = await chromium.launch({ channel: 'msedge' })

/** A browser tab with console + network monitoring attached */
export async function newTab() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  // Cancel actions use window.confirm; a real user clicks OK
  page.on('dialog', (d) => d.accept().catch(() => {}))
  page.on('pageerror', (e) => current?.errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text()
    // 4xx responses are expected in negative tests; they are checked through the API responses instead
    if (/Failed to load resource: the server responded with a status of 4\d\d/.test(text)) return
    current?.errors.push('console: ' + text)
  })
  page.on('response', (r) => {
    if (!r.url().includes('/api/')) return
    const entry = `${r.request().method()} ${r.url().replace(/^.*\/api/, '/api')} → ${r.status()}`
    current?.network.push(entry)
    if (r.status() >= 500) current?.errors.push('HTTP ' + entry)
  })
  page.on('requestfailed', (r) => {
    if (r.url().includes('/api/')) current?.errors.push(`request failed: ${r.method()} ${r.url()} (${r.failure()?.errorText})`)
  })
  return page
}

/**
 * Runs one test. `fn` returns an evidence string (what was observed). Throwing = FAIL.
 * Throwing a Blocked error = BLOCKED (feature not available in the UI / precondition missing).
 */
export class Blocked extends Error {}
export async function test(id, title, page, fn) {
  current = { id, title, status: 'PASS', evidence: '', errors: [], network: [] }
  try {
    const evidence = await fn()
    current.evidence = evidence ?? ''
    if (current.errors.length) {
      current.status = 'FAIL'
      current.evidence += ` | browser errors: ${[...new Set(current.errors)].slice(0, 3).join(' ; ')}`
    }
  } catch (e) {
    current.status = e instanceof Blocked ? 'BLOCKED' : 'FAIL'
    current.evidence = e.message.split('\n')[0]
  }
  if (page) await page.screenshot({ path: `${OUT}/${id}.png`, fullPage: true }).catch(() => {})
  results.push(current)
  console.log(`${current.status.padEnd(7)} ${id.padEnd(16)} ${title}${current.evidence ? '  — ' + current.evidence : ''}`)
  const done = current
  current = null
  return done.status === 'PASS'
}

export function note(message) {
  issues.push(message)
  console.log('NOTE   ' + message)
}

export function expect(cond, message) {
  if (!cond) throw new Error(message)
}

/** GET through the app's own session (read-only verification) */
export function apiGet(page, path) {
  return apiRaw(page, 'GET', path)
}

/** Raw request with the current session — used only for the security tests (manipulated requests) */
export function apiRaw(page, method, path, body) {
  return page.evaluate(async ({ method, path, body }) => {
    const KEY = 'stocksense.session'
    const store = localStorage.getItem(KEY) ? localStorage : sessionStorage.getItem(KEY) ? sessionStorage : null
    const read = () => JSON.parse(store?.getItem(KEY) ?? 'null')
    const send = (session) => fetch('/api' + path, {
      method,
      headers: { 'content-type': 'application/json', ...(session ? { authorization: `Bearer ${session.accessToken}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    let session = read()
    let res = await send(session)
    // Same as the app's client: an expired access token is refreshed once, then the request is retried
    if (res.status === 401 && session?.refreshToken) {
      const r = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: session.refreshToken }) })
      if (r.ok) {
        const tokens = await r.json()
        session = { ...session, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? session.refreshToken }
        store.setItem(KEY, JSON.stringify(session))
        res = await send(session)
      }
    }
    return { status: res.status, body: await res.json().catch(() => null) }
  }, { method, path, body })
}

export const bodyText = (page) => page.evaluate(() => document.body.innerText)

export async function settle(page, ms = 600) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(ms)
}

/** Wait until the page shows `text` (polls innerText; handles re-renders) */
export async function waitText(page, text, timeout = 10000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if ((await bodyText(page)).includes(text)) return
    await page.waitForTimeout(200)
  }
  throw new Error(`"${text}" not shown`)
}

export async function selectByLabel(page, selector, label, timeout = 10000) {
  await page.waitForFunction(
    ({ selector, label }) => [...(document.querySelector(selector)?.options ?? [])].some((o) => o.textContent.includes(label)),
    { selector, label },
    { timeout },
  )
  const value = await page.$eval(selector, (el, label) => [...el.options].find((o) => o.textContent.includes(label)).value, label)
  await page.selectOption(selector, value)
  return value
}

export function writeReport(meta) {
  const counts = { PASS: 0, FIXED: 0, FAIL: 0, BLOCKED: 0 }
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ ...meta, counts, results, notes: issues }, null, 2))
  console.log(`\nTOTAL ${results.length}  PASS ${counts.PASS}  FAIL ${counts.FAIL}  BLOCKED ${counts.BLOCKED}`)
  return counts
}

/** Marks the first visible element matching `selector` that contains `text` so it can be used as a scope */
export async function tagScope(page, selector, text, tag = 'qa-row', timeout = 10000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const ok = await page.evaluate(({ selector, text, tag }) => {
      document.querySelectorAll(`[data-${tag}]`).forEach((el) => el.removeAttribute(`data-${tag}`))
      // innermost match (smallest text) so a card/row wins over the container that holds all cards
      const el = [...document.querySelectorAll(selector)]
        .filter((e) => e.textContent.includes(text) && e.getBoundingClientRect().height > 0)
        .sort((a, b) => a.textContent.length - b.textContent.length)[0]
      if (el) el.setAttribute(`data-${tag}`, '1')
      return Boolean(el)
    }, { selector, text, tag })
    if (ok) return `[data-${tag}="1"]`
    await page.waitForTimeout(200)
  }
  throw new Error(`no ${selector} containing "${text}"`)
}

/** Button/link state by its visible label (Material Symbols icon text stripped) */
export function buttonState(page, label, scope = 'body', exact = true) {
  return page.evaluate(({ label, scope, exact }) => {
    document.querySelectorAll('[data-qa-target]').forEach((el) => el.removeAttribute('data-qa-target'))
    const root = document.querySelector(scope)
    if (!root) return { found: false }
    for (const b of root.querySelectorAll('button, a')) {
      const clone = b.cloneNode(true)
      clone.querySelectorAll('.material-symbols-outlined, .material-icons, .material-symbols-rounded').forEach((i) => i.remove())
      const text = clone.textContent.replace(/\s+/g, ' ').trim()
      const r = b.getBoundingClientRect()
      const visible = r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== 'hidden' && !b.closest('[aria-hidden="true"]')
      if (visible && (exact ? text === label : text.includes(label))) {
        b.setAttribute('data-qa-target', '1')
        return { found: true, disabled: b.disabled || b.getAttribute('aria-disabled') === 'true', text }
      }
    }
    return { found: false }
  }, { label, scope, exact })
}

export async function clickButton(page, label, scope = 'body', { exact = true, timeout = 10000 } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const state = await buttonState(page, label, scope, exact)
    if (state.found && !state.disabled) {
      await page.click('[data-qa-target="1"]')
      return
    }
    await page.waitForTimeout(200)
  }
  throw new Error(`button "${label}" not clickable in ${scope}`)
}

export async function waitFor(page, predicate, message, timeout = 10000) {
  const deadline = Date.now() + timeout
  let last
  while (Date.now() < deadline) {
    last = await predicate()
    if (last) return last
    await page.waitForTimeout(250)
  }
  throw new Error(message)
}
