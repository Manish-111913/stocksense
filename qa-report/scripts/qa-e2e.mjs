// StockSense end-to-end QA through the browser UI (spec: "COMPLETE END-TO-END QA, BROWSER TESTING & AUTO-FIX").
// Every operation is performed by clicking the real UI; results are verified in the UI and against the API/ledger.
import {
  APP, OUT, Blocked, apiGet, apiRaw, bodyText, browser, buttonState, clickButton, expect, newTab, note, results,
  selectByLabel, settle, tagScope, test, waitFor, waitText, writeReport,
} from './qa-core.mjs'

const MGR = { name: 'QA Inventory Manager', email: 'qa.inventory.manager@example.com', password: 'Qa@2026StockSense!' }
const STAFF = { name: 'QA Warehouse Staff', email: 'qa.warehouse.staff@example.com', password: 'Qa@2026StockSense!' }
const CAT = { name: 'QA Raw Materials', description: 'Test category for StockSense end-to-end validation' }
const PRODUCTS = [
  { key: 'steel', name: 'QA Steel', sku: 'QA-STEEL-001', uom: 'KG', reorder: 20 },
  { key: 'copper', name: 'QA Copper', sku: 'QA-COPPER-001', uom: 'KG', reorder: 10 },
  { key: 'bolts', name: 'QA Bolts', sku: 'QA-BOLTS-001', uom: 'PCS', reorder: 5 },
]
const WH = { name: 'QA Main Warehouse', code: 'QA-WH-001', description: 'Primary warehouse for automated end-to-end testing' }
const LOCS = [
  { key: 'rec', name: 'QA Receiving Rack', code: 'QA-REC-001' },
  { key: 'prod', name: 'QA Production Rack', code: 'QA-PROD-001' },
  { key: 'disp', name: 'QA Dispatch Rack', code: 'QA-DISP-001' },
]
const SUPPLIER = { name: 'QA Steel Suppliers', code: 'QA-SUP-001', email: 'qa.supplier@example.com', phone: '9000000001' }
const CUSTOMER = { name: 'QA Manufacturing Customer', code: 'QA-CUST-001', email: 'qa.customer@example.com', phone: '9000000002' }

const S = { products: {}, locs: {} } // ids and references discovered while testing
const started = new Date()

// ---------------------------------------------------------------------------------------------- helpers
async function productBySku(page, sku) {
  const r = await apiGet(page, `/products?search=${encodeURIComponent(sku)}&limit=100`)
  return r.body?.data?.find((p) => p.sku === sku)
}
/** { total, byLoc: { rec, prod, disp } } from the inventory API */
async function stock(page, productKey) {
  const id = S.products[productKey]
  const r = await apiGet(page, `/inventory?productId=${id}&limit=100`)
  const byLoc = { rec: 0, prod: 0, disp: 0 }
  for (const row of r.body?.data ?? []) {
    const key = Object.keys(S.locs).find((k) => S.locs[k] === row.location.id)
    if (key) byLoc[key] = row.quantity
  }
  const total = Object.values(byLoc).reduce((a, b) => a + b, 0)
  return { total, ...byLoc }
}
async function ledger(page, qs) {
  const r = await apiGet(page, `/ledger?limit=100&${qs}`)
  return r.body?.data ?? []
}
async function dashApi(page, qs = '') {
  return (await apiGet(page, `/dashboard${qs}`)).body?.summary
}
/** KPI values as displayed on the Dashboard page */
async function dashUi(page) {
  await page.goto(APP + '/dashboard')
  await settle(page)
  await waitFor(page, () => page.evaluate(() => [...document.querySelectorAll('.text-metric-currency')].length >= 5 && [...document.querySelectorAll('.text-metric-currency')].every((e) => !e.textContent.includes('—'))), 'dashboard KPIs never loaded')
  return page.evaluate(() => {
    const label = (text) => [...document.querySelectorAll('span, div, p, h3, h4')].find((el) => el.children.length === 0 && el.textContent.trim() === text)
    const card = (text) => label(text)?.closest('.rounded-xl')
    const val = (text) => Number((card(text)?.querySelector('.text-metric-currency')?.textContent ?? '').replace(/[^0-9]/g, ''))
    const risk = card('Inventory Risk')?.textContent ?? ''
    return {
      inStock: val('In Stock SKUs'),
      risk: val('Inventory Risk'),
      low: Number(risk.match(/(\d+)\s*Low/)?.[1] ?? NaN),
      out: Number(risk.match(/(\d+)\s*Depleted/)?.[1] ?? NaN),
      receipts: val('Pending Receipts'),
      deliveries: val('Pending Deliveries'),
      transfers: val('Internal Transfers'),
    }
  })
}
const fmt = (o) => JSON.stringify(o)
async function login(page, acct) {
  await page.goto(APP + '/login')
  await page.waitForSelector('#loginEmail')
  await page.fill('#loginEmail', acct.email)
  await page.fill('#loginPassword', acct.password)
  await page.click('#loginSubmitBtn')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}
async function signupOrLogin(page, acct) {
  await page.goto(APP + '/signup')
  await page.waitForSelector('#signupName')
  await page.fill('#signupName', acct.name)
  await page.fill('#signupEmail', acct.email)
  await page.fill('#signupPassword', acct.password)
  await page.fill('#signupConfirmPassword', acct.password)
  await page.click('#signupSubmitBtn')
  const outcome = await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 15000 }).then(() => 'created'),
    page.waitForSelector('#signupEmailError', { timeout: 15000 }).then(() => 'exists'),
  ])
  if (outcome === 'exists') {
    note(`${acct.email} already existed — signed in instead of signing up`)
    await login(page, acct)
  }
  return outcome
}
async function readCount(page, regex) {
  const text = await bodyText(page)
  const m = text.match(regex)
  return m ? Number(m[1].replace(/,/g, '')) : NaN
}

// ================================================================================================
// 2. DISCOVERY + ACCOUNTS
// ================================================================================================
const mgr = await newTab()
const staff = await newTab()

await test('ENV-001', 'Discover the running application (login page, API health)', mgr, async () => {
  const res = await mgr.goto(APP + '/dashboard')
  await mgr.waitForURL('**/login', { timeout: 10000 })
  const docs = await mgr.request.get(APP + '/api/docs').catch(() => null)
  expect(res?.ok(), 'frontend did not respond')
  return `frontend ${APP} → unauthenticated /dashboard redirects to /login; API docs via proxy ${docs?.status()}`
})

await test('AUTH-SETUP-1', 'Create QA Inventory Manager via Sign Up (first account = INVENTORY_MANAGER)', mgr, async () => {
  const outcome = await signupOrLogin(mgr, MGR)
  const me = (await apiGet(mgr, '/users/me')).body
  expect(me?.email === MGR.email, `signed in as ${me?.email}`)
  expect(me.role === 'INVENTORY_MANAGER', `role is ${me.role}`)
  return `${outcome}; /users/me → ${me.fullName} <${me.email}> role ${me.role}; landed on /dashboard`
})

await test('AUTH-SETUP-2', 'Create QA Warehouse Staff via Sign Up (later accounts = WAREHOUSE_STAFF)', staff, async () => {
  const outcome = await signupOrLogin(staff, STAFF)
  const me = (await apiGet(staff, '/users/me')).body
  expect(me?.role === 'WAREHOUSE_STAFF', `role is ${me?.role}`)
  const forged = await apiRaw(staff, 'POST', '/auth/signup', { fullName: 'X', email: `forged.${Date.now()}@example.com`, password: MGR.password, role: 'INVENTORY_MANAGER' })
  expect(forged.status === 400, `signup with a role field → ${forged.status}`)
  return `${outcome}; role ${me.role}; signup request with role=INVENTORY_MANAGER rejected (400)`
})

// ================================================================================================
// 10. AUTHENTICATION
// ================================================================================================
await test('AUTH-004', 'Logout from Profile, protected pages need auth afterwards', mgr, async () => {
  await mgr.goto(APP + '/profile')
  await mgr.click('#openLogoutModalBtn')
  await mgr.locator('#logoutModal').waitFor({ state: 'visible' })
  await mgr.click('#confirmLogoutBtn')
  await mgr.waitForURL('**/login', { timeout: 10000 })
  const session = await mgr.evaluate(() => localStorage.getItem('stocksense.session') ?? sessionStorage.getItem('stocksense.session'))
  expect(!session, 'session still stored after logout')
  await mgr.goto(APP + '/dashboard')
  await mgr.waitForURL('**/login', { timeout: 10000 })
  const api = await apiGet(mgr, '/dashboard')
  expect(api.status === 401, `API without session → ${api.status}`)
  return 'Confirm Log Out → /login; session cleared; /dashboard redirects to /login; API 401'
})

let wrongPasswordMessage = ''
await test('AUTH-002', 'Invalid password is rejected with a meaningful message', mgr, async () => {
  await mgr.goto(APP + '/login')
  await mgr.fill('#loginEmail', MGR.email)
  await mgr.fill('#loginPassword', 'Wrong@Password2026')
  await mgr.click('#loginSubmitBtn')
  await mgr.locator('#loginAlertText').waitFor({ state: 'visible', timeout: 10000 })
  wrongPasswordMessage = (await mgr.textContent('#loginAlertText')).trim()
  expect(mgr.url().endsWith('/login'), `navigated to ${mgr.url()}`)
  expect((await apiGet(mgr, '/users/me')).status === 401, 'user is authenticated')
  return `alert: "${wrongPasswordMessage}"; still on /login; not authenticated`
})

await test('AUTH-003', 'Unknown email fails safely (no crash, no internals, no account enumeration)', mgr, async () => {
  await mgr.goto(APP + '/login')
  await mgr.fill('#loginEmail', 'invalid@example.com')
  await mgr.fill('#loginPassword', 'Whatever@2026')
  await mgr.click('#loginSubmitBtn')
  await mgr.locator('#loginAlertText').waitFor({ state: 'visible', timeout: 10000 })
  const msg = (await mgr.textContent('#loginAlertText')).trim()
  expect(!/prisma|exception|stack|sql|argon|at \w+\.\w+ \(/i.test(msg), `internal details leaked: ${msg}`)
  expect(msg === wrongPasswordMessage, `different message for unknown email ("${msg}") allows account enumeration`)
  return `alert: "${msg}" (identical to wrong-password message); still on /login`
})

await test('AUTH-001', 'Login with valid credentials → Dashboard with navigation', mgr, async () => {
  await login(mgr, MGR)
  await settle(mgr)
  const text = await bodyText(mgr)
  for (const item of ['Dashboard', 'Products', 'Receipts', 'Deliveries', 'Transfers', 'Adjustments', 'Warehouse', 'Move History']) {
    expect(text.includes(item), `nav item "${item}" missing`)
  }
  expect(text.includes(MGR.name), 'user badge does not show the manager name')
  return 'redirected to /dashboard; nav shows Dashboard/Products/Receipts/Deliveries/Transfers/Adjustments/Warehouse/Move History; badge shows QA Inventory Manager'
})

// ================================================================================================
// 9. BASELINE
// ================================================================================================
let BASE
await test('BASE-001', 'Record baseline dashboard values (UI and API)', mgr, async () => {
  const ui = await dashUi(mgr)
  const api = await dashApi(mgr)
  const led = await apiGet(mgr, '/ledger/summary')
  BASE = { ui, api, ledger: led.body?.totalMovements }
  expect(ui.inStock === api.totalProductsInStock && ui.receipts === api.pendingReceipts && ui.deliveries === api.pendingDeliveries && ui.transfers === api.internalTransfersScheduled, `UI ${fmt(ui)} ≠ API ${fmt(api)}`)
  return `UI ${fmt(ui)}; API totalProducts=${api.totalProducts}; ledger movements=${BASE.ledger}`
})

// ================================================================================================
// 11. CATEGORIES
// ================================================================================================
async function openCategories(page) {
  await page.goto(APP + '/products')
  await settle(page)
  await page.click('#btnManageCategories')
  await page.locator('#categoriesDrawer').waitFor({ state: 'visible' })
  await settle(page, 300)
}
await test('CAT-001', 'Create category "QA Raw Materials" with description', mgr, async () => {
  await openCategories(mgr)
  await mgr.fill('#categoryFormName', CAT.name)
  await mgr.fill('#categoryFormDescription', CAT.description)
  await clickButton(mgr, 'Create Category', '#categoriesDrawer')
  await mgr.locator(`#categoriesDrawer [data-category-name="${CAT.name}"]`).waitFor({ timeout: 10000 })
  const toast = await mgr.textContent('#toastTitle').catch(() => '')
  await waitFor(mgr, () => mgr.evaluate((n) => [...document.querySelectorAll('#filterCategory option')].some((o) => o.textContent.includes(n)), CAT.name), 'category not in the products filter dropdown')
  const cat = (await apiGet(mgr, '/categories')).body.find((c) => c.name === CAT.name)
  expect(cat && cat.description === CAT.description && cat.status === 'ACTIVE', `API: ${fmt(cat)}`)
  S.categoryId = cat.id
  return `toast "${toast?.trim()}"; listed in drawer + #filterCategory; API status ${cat.status}, description saved`
})

await test('CAT-002', 'Duplicate category name is rejected', mgr, async () => {
  await mgr.fill('#categoryFormName', CAT.name)
  await clickButton(mgr, 'Create Category', '#categoriesDrawer')
  const err = await waitFor(mgr, async () => (await mgr.textContent('#categoryFormError').catch(() => ''))?.trim(), 'no duplicate error shown')
  const count = (await apiGet(mgr, '/categories')).body.filter((c) => c.name.toLowerCase() === CAT.name.toLowerCase()).length
  expect(count === 1, `${count} categories named ${CAT.name}`)
  return `error: "${err}"; still exactly 1 category`
})

await test('CAT-003', 'Edit category description, persists after refresh', mgr, async () => {
  const updated = `${CAT.description} (updated by QA)`
  const row = `#categoriesDrawer [data-category-name="${CAT.name}"]`
  await mgr.locator(`${row} [title="Edit category"]`).click()
  await mgr.fill('#editCategoryDescription', updated)
  await clickButton(mgr, 'Save', '#categoriesDrawer')
  await waitText(mgr, updated)
  await mgr.reload()
  await openCategories(mgr)
  await waitText(mgr, updated)
  const cat = (await apiGet(mgr, '/categories')).body.find((c) => c.id === S.categoryId)
  expect(cat.description === updated, `API description: ${cat.description}`)
  return `description now "${updated}" in UI after reload and in API`
})

await test('CAT-004', 'Deactivate category (hidden from new products), then reactivate', mgr, async () => {
  const row = `#categoriesDrawer [data-category-name="${CAT.name}"]`
  await mgr.locator(`${row} [title="Deactivate category"]`).click()
  await waitFor(mgr, async () => (await mgr.textContent(row)).includes('Inactive'), 'row never showed Inactive')
  expect((await apiGet(mgr, `/categories`)).body.find((c) => c.id === S.categoryId).status === 'INACTIVE', 'API status not INACTIVE')
  await mgr.goto(APP + '/products/new')
  await settle(mgr)
  const offered = await mgr.evaluate((n) => [...document.querySelectorAll('#newProdCategory option')].some((o) => o.textContent.includes(n)), CAT.name)
  expect(!offered, 'inactive category still offered for new products')
  await openCategories(mgr)
  await mgr.locator(`${row} [title="Activate category"]`).click()
  await waitFor(mgr, async () => !(await mgr.textContent(row)).includes('Inactive'), 'row never showed Active again')
  expect((await apiGet(mgr, `/categories`)).body.find((c) => c.id === S.categoryId).status === 'ACTIVE', 'API status not ACTIVE')
  return 'Deactivate → Inactive (not offered on Add Product) → Activate → Active'
})

// ================================================================================================
// 12. PRODUCTS
// ================================================================================================
for (const p of PRODUCTS) {
  await test(`PROD-C-${p.key}`, `Create product ${p.name} (${p.sku})`, mgr, async () => {
    await mgr.goto(APP + '/products/new')
    await mgr.waitForSelector('#newProdName')
    await settle(mgr, 300)
    await mgr.fill('#newProdName', p.name)
    await mgr.fill('#newProdSku', p.sku)
    await selectByLabel(mgr, '#newProdCategory', CAT.name)
    await mgr.selectOption('#newProdUom', p.uom)
    await mgr.fill('#newProdReorderLevel', String(p.reorder))
    await mgr.click('#btnSubmitNewProduct')
    await mgr.waitForURL(/\/products\/[0-9a-f-]{36}$/, { timeout: 15000 })
    await settle(mgr)
    const shown = await mgr.evaluate(() => ({
      name: document.querySelector('#displayProdName')?.textContent.trim(),
      sku: document.querySelector('#displayProdSku')?.textContent.trim(),
      category: document.querySelector('#displayProdCategory')?.textContent.trim(),
      uom: document.querySelector('#displayProdUom')?.textContent.trim(),
      reorder: document.querySelector('#displayProdReorder')?.textContent.trim(),
      view: document.querySelector('#panelViewMode')?.textContent ?? '',
    }))
    expect(shown.name === p.name, `name shown ${shown.name}`)
    expect(shown.sku === p.sku, `sku shown ${shown.sku}`)
    expect(shown.category?.includes(CAT.name), `category shown ${shown.category}`)
    expect(shown.uom?.includes(p.uom), `uom shown ${shown.uom}`)
    expect(shown.reorder?.includes(String(p.reorder)), `reorder shown ${shown.reorder}`)
    expect(shown.view.includes('Active'), 'record status not Active')
    const api = await productBySku(mgr, p.sku)
    S.products[p.key] = api.id
    expect(api.status === 'ACTIVE' && api.reorderLevel === p.reorder && api.unitOfMeasure === p.uom && api.category.id === S.categoryId, `API ${fmt(api)}`)
    await mgr.goto(APP + '/products')
    await waitText(mgr, p.sku)
    return `detail page: ${shown.name} / ${shown.sku} / ${shown.category} / ${shown.uom} / reorder ${shown.reorder} / Active; listed on /products`
  })
}

await test('PROD-001', 'Duplicate SKU QA-STEEL-001 is rejected', mgr, async () => {
  await mgr.goto(APP + '/products/new')
  await mgr.waitForSelector('#newProdName')
  await settle(mgr, 300)
  await mgr.fill('#newProdName', 'QA Steel Duplicate')
  await mgr.fill('#newProdSku', 'QA-STEEL-001')
  await selectByLabel(mgr, '#newProdCategory', CAT.name)
  await mgr.selectOption('#newProdUom', 'KG')
  await mgr.click('#btnSubmitNewProduct')
  const err = await waitFor(mgr, async () => (await mgr.textContent('#skuErrorMsg').catch(() => ''))?.trim() || (await mgr.textContent('#createProductError').catch(() => ''))?.trim(), 'no duplicate SKU error')
  expect(mgr.url().endsWith('/products/new'), 'left the form')
  const r = await apiGet(mgr, '/products?search=QA-STEEL-001')
  expect(r.body.pagination.total === 1, `${r.body.pagination.total} products with the SKU`)
  return `error: "${err}"; still 1 product with SKU QA-STEEL-001`
})

await test('PROD-002', 'Search "QA Steel" shows only matching products', mgr, async () => {
  await mgr.goto(APP + '/products')
  await settle(mgr)
  await mgr.fill('#searchInput', 'QA Steel')
  await settle(mgr, 800)
  const rows = await mgr.$$eval('#productsTable tbody tr', (trs) => trs.map((t) => t.innerText))
  expect(rows.length >= 1 && rows.every((r) => r.includes('QA Steel')), `rows: ${fmt(rows.map((r) => r.slice(0, 40)))}`)
  expect(!rows.some((r) => r.includes('QA Copper') || r.includes('QA Bolts')), 'non-matching rows shown')
  return `${rows.length} row(s), all "QA Steel"`
})

await test('PROD-003', 'Search by SKU QA-STEEL-001', mgr, async () => {
  await mgr.fill('#searchInput', 'QA-STEEL-001')
  await settle(mgr, 800)
  const rows = await mgr.$$eval('#productsTable tbody tr', (trs) => trs.map((t) => t.innerText))
  expect(rows.length === 1 && rows[0].includes('QA-STEEL-001'), `rows: ${rows.length}`)
  await mgr.fill('#searchInput', 'QA-NO-SUCH-SKU')
  await waitText(mgr, 'No products match your filters')
  await mgr.fill('#searchInput', '')
  await settle(mgr, 800)
  return 'exactly 1 row (QA-STEEL-001); nonexistent SKU → "No products match your filters"; cleared'
})

await test('PROD-004', 'Negative reorder level is rejected (UI and API)', mgr, async () => {
  await mgr.goto(APP + '/products/new')
  await mgr.waitForSelector('#newProdReorderLevel')
  await mgr.fill('#newProdReorderLevel', '-5')
  await mgr.locator('#newProdName').focus()
  const value = await mgr.inputValue('#newProdReorderLevel')
  const api = await apiRaw(mgr, 'POST', '/products', { name: 'QA Invalid Reorder', sku: 'QA-INVALID-001', categoryId: S.categoryId, unitOfMeasure: 'KG', reorderLevel: -5 })
  expect(api.status === 400, `API accepted negative reorder level (${api.status})`)
  expect(!(await productBySku(mgr, 'QA-INVALID-001')), 'product was created')
  expect(value !== '-5', `UI kept -5 in the field`)
  return `UI field normalised -5 → "${value}"; API POST reorderLevel -5 → 400 (${fmt(api.body?.message)})`
})

await test('PROD-N01', 'Empty product name / invalid category are rejected', mgr, async () => {
  await mgr.goto(APP + '/products/new')
  await mgr.waitForSelector('#newProdName')
  await mgr.fill('#newProdSku', 'QA-EMPTY-001')
  await mgr.click('#btnSubmitNewProduct')
  const err = await waitFor(mgr, async () => (await mgr.textContent('#nameErrorMsg').catch(() => ''))?.trim(), 'no name error')
  const api = await apiRaw(mgr, 'POST', '/products', { name: 'QA Bad Category', sku: 'QA-BADCAT-001', categoryId: '00000000-0000-4000-8000-000000000000', unitOfMeasure: 'KG' })
  expect(api.status >= 400 && api.status < 500, `invalid category → ${api.status}`)
  expect(!(await productBySku(mgr, 'QA-BADCAT-001')), 'product with invalid category was created')
  return `name error "${err}"; invalid category → ${api.status} "${api.body?.message}"`
})

// ================================================================================================
// 13/14. WAREHOUSE + LOCATIONS
// ================================================================================================
await test('WH-C01', 'Create warehouse QA Main Warehouse (QA-WH-001)', mgr, async () => {
  await mgr.goto(APP + '/warehouse')
  await settle(mgr)
  await clickButton(mgr, 'Add Warehouse', 'body', { exact: false })
  await mgr.fill('#warehouseName', WH.name)
  await mgr.fill('#warehouseCode', WH.code)
  await mgr.fill('#warehouseDescription', WH.description)
  await clickButton(mgr, 'Create Warehouse', '#warehouseFormModal')
  await waitText(mgr, WH.code)
  const w = (await apiGet(mgr, `/warehouses?search=${WH.code}`)).body.data.find((x) => x.code === WH.code)
  expect(w && w.status === 'ACTIVE' && w.description === WH.description, `API ${fmt(w)}`)
  S.warehouseId = w.id
  const row = await tagScope(mgr, 'main table tbody tr', WH.code)
  expect((await mgr.textContent(row)).includes('Active'), 'row status not Active')
  return `row shows ${WH.name} / ${WH.code} / Active; API id ${w.id.slice(0, 8)}`
})

await test('WH-001', 'Duplicate warehouse code is rejected', mgr, async () => {
  await clickButton(mgr, 'Add Warehouse', 'body', { exact: false })
  await mgr.fill('#warehouseName', 'QA Duplicate Warehouse')
  await mgr.fill('#warehouseCode', WH.code)
  await clickButton(mgr, 'Create Warehouse', '#warehouseFormModal')
  await waitFor(mgr, async () => /exist/i.test(await mgr.textContent('#warehouseFormModal')), 'no duplicate error')
  const err = (await mgr.textContent('#warehouseFormModal')).match(/[^.]*exist[^.]*/i)?.[0]
  await clickButton(mgr, 'Cancel', '#warehouseFormModal')
  const n = (await apiGet(mgr, `/warehouses?search=${WH.code}`)).body.data.filter((x) => x.code === WH.code).length
  expect(n === 1, `${n} warehouses with the code`)
  return `error "${err?.trim()}"; still 1 warehouse`
})

await test('WH-N01', 'Warehouse with empty name is rejected', mgr, async () => {
  await clickButton(mgr, 'Add Warehouse', 'body', { exact: false })
  await mgr.fill('#warehouseCode', 'QA-WH-EMPTY')
  await clickButton(mgr, 'Create Warehouse', '#warehouseFormModal')
  await mgr.waitForTimeout(800)
  const open = await mgr.isVisible('#warehouseFormModal')
  const text = open ? await mgr.textContent('#warehouseFormModal') : ''
  await clickButton(mgr, 'Cancel', '#warehouseFormModal').catch(() => {})
  const created = (await apiGet(mgr, '/warehouses?search=QA-WH-EMPTY')).body.data.length
  expect(open && created === 0, `modal open=${open}, created=${created}`)
  return `form stayed open with validation (${(text.match(/[^.]*required[^.]*/i)?.[0] ?? 'field error').trim()}); nothing created`
})

async function openWarehouseInspector(page) {
  if (!(await page.isVisible('#inspectorDrawer'))) {
    await page.goto(APP + '/warehouse')
    await settle(page)
    const row = await tagScope(page, 'main table tbody tr', WH.code)
    await page.click(row)
  }
  await page.locator('#inspectorDrawer').waitFor({ state: 'visible' })
}
for (const l of LOCS) {
  await test(`LOC-C-${l.key}`, `Create location ${l.name} (${l.code})`, mgr, async () => {
    await openWarehouseInspector(mgr)
    await clickButton(mgr, 'Add Location', '#inspectorDrawer', { exact: false })
    await mgr.fill('#locationName', l.name)
    await mgr.fill('#locationCode', l.code)
    await clickButton(mgr, 'Add Location', '#locationFormModal')
    await waitFor(mgr, async () => (await mgr.textContent('#inspectorDrawer')).includes(l.code), 'location not listed in the inspector')
    const w = (await apiGet(mgr, `/warehouses/${S.warehouseId}`)).body
    const loc = w.locations.find((x) => x.code === l.code)
    expect(loc && loc.status === 'ACTIVE' && loc.name === l.name, `API ${fmt(loc)}`)
    S.locs[l.key] = loc.id
    return `listed under ${WH.name} as ${l.name} / ${l.code} / Active`
  })
}

await test('LOC-001', 'Duplicate location code in the same warehouse is rejected', mgr, async () => {
  await openWarehouseInspector(mgr)
  await clickButton(mgr, 'Add Location', '#inspectorDrawer', { exact: false })
  await mgr.fill('#locationName', 'QA Duplicate Rack')
  await mgr.fill('#locationCode', 'QA-REC-001')
  await clickButton(mgr, 'Add Location', '#locationFormModal')
  await waitFor(mgr, async () => /exist/i.test(await mgr.textContent('#locationFormModal')), 'no duplicate error')
  await clickButton(mgr, 'Cancel', '#locationFormModal')
  const n = (await apiGet(mgr, `/warehouses/${S.warehouseId}`)).body.locations.filter((x) => x.code === 'QA-REC-001').length
  const bad = await apiRaw(mgr, 'POST', '/warehouses/00000000-0000-4000-8000-000000000000/locations', { name: 'QA Orphan', code: 'QA-ORPHAN' })
  expect(n === 1 && bad.status === 404, `dupes=${n}, invalid warehouse → ${bad.status}`)
  return `duplicate rejected, still 1 QA-REC-001; location for a nonexistent warehouse → 404`
})

await test('LOC-002', 'Locations appear under the correct warehouse', mgr, async () => {
  await mgr.goto(APP + '/warehouse')
  await settle(mgr)
  await mgr.click(await tagScope(mgr, 'main table tbody tr', WH.code))
  await mgr.locator('#inspectorDrawer').waitFor({ state: 'visible' })
  const text = await mgr.textContent('#inspectorDrawer')
  for (const l of LOCS) expect(text.includes(l.code) && text.includes(l.name), `${l.code} missing in inspector`)
  const list = (await apiGet(mgr, `/locations?warehouseId=${S.warehouseId}`)).body
  expect(list.filter((x) => x.warehouse?.id === S.warehouseId || x.warehouseId === S.warehouseId).length === 3, `API locations for warehouse: ${list.length}`)
  return 'inspector for QA Main Warehouse lists QA-REC-001, QA-PROD-001, QA-DISP-001; API agrees'
})

await test('WH-002', 'Deactivated warehouse cannot be used for new documents', mgr, async () => {
  await mgr.goto(APP + '/warehouse')
  await settle(mgr)
  await clickButton(mgr, 'Add Warehouse', 'body', { exact: false })
  await mgr.fill('#warehouseName', 'QA Inactive Warehouse')
  await mgr.fill('#warehouseCode', 'QA-WH-TMP')
  await mgr.fill('#warehouseDescription', 'Created by QA to test deactivation')
  await clickButton(mgr, 'Create Warehouse', '#warehouseFormModal')
  await waitText(mgr, 'QA-WH-TMP')
  await mgr.goto(APP + '/warehouse')
  await settle(mgr)
  const row = await tagScope(mgr, 'main table tbody tr', 'QA-WH-TMP')
  await mgr.locator(`${row} [title="Deactivate Facility"]`).click()
  await waitFor(mgr, async () => (await mgr.textContent(await tagScope(mgr, 'main table tbody tr', 'QA-WH-TMP'))).includes('Inactive'), 'row never showed Inactive')
  const w = (await apiGet(mgr, '/warehouses?search=QA-WH-TMP')).body.data[0]
  S.inactiveWarehouseId = w.id
  expect(w.status === 'INACTIVE', `API status ${w.status}`)
  await mgr.goto(APP + '/receipts/new')
  await settle(mgr)
  const offered = await mgr.evaluate(() => [...document.querySelectorAll('#rcptWarehouseSelect option')].map((o) => o.textContent))
  expect(!offered.some((o) => o.includes('QA Inactive Warehouse')), 'inactive warehouse offered on New Receipt')
  expect(offered.some((o) => o.includes(WH.name)), 'active warehouse missing on New Receipt')
  return `QA-WH-TMP → Inactive; New Receipt warehouse options: ${fmt(offered.filter(Boolean))}`
})

// ================================================================================================
// 15. INVENTORY BASELINE
// ================================================================================================
await test('INV-001', 'Inventory baseline for the new QA products (all 0)', mgr, async () => {
  await mgr.goto(APP + '/products')
  await settle(mgr)
  const out = []
  for (const p of PRODUCTS) {
    const s = await stock(mgr, p.key)
    const row = await tagScope(mgr, '#productsTable tbody tr', p.sku)
    const text = await mgr.textContent(row)
    expect(s.total === 0 && text.includes(`0 ${p.uom}`) && text.includes('Out of Stock'), `${p.sku}: API ${s.total}, row "${text.slice(0, 80)}"`)
    out.push(`${p.sku}=0`)
  }
  return `${out.join(', ')} (UI rows show 0 + Out of Stock)`
})

// ================================================================================================
// 16. RECEIPTS
// ================================================================================================
async function fillReceipt(page, { supplierInline, location, sku, qty }) {
  await page.goto(APP + '/receipts/new')
  await page.waitForSelector('#rcptSupplierInput')
  await settle(page)
  if (supplierInline) {
    if (!(await page.isVisible('#newSupplierName'))) await clickButton(page, 'New Supplier', 'body', { exact: false })
    await page.fill('#newSupplierName', SUPPLIER.name)
    await page.fill('#newSupplierCode', SUPPLIER.code)
    await page.fill('#newSupplierEmail', SUPPLIER.email)
    await page.fill('#newSupplierPhone', SUPPLIER.phone)
    await clickButton(page, 'Create Supplier')
    await waitFor(page, () => page.evaluate((n) => document.querySelector('#rcptSupplierInput')?.selectedOptions[0]?.textContent.includes(n), SUPPLIER.name), 'new supplier not selected')
  } else {
    await selectByLabel(page, '#rcptSupplierInput', SUPPLIER.name)
  }
  await selectByLabel(page, '#rcptWarehouseSelect', WH.name)
  await selectByLabel(page, '#rcptLocationSelect', location)
  await selectByLabel(page, '#productQuickSelect', sku)
  const qtyInput = page.locator(`input[aria-label="Received quantity of ${sku}"]`)
  await qtyInput.waitFor()
  await qtyInput.fill(String(qty))
}
async function saveReceiptDraft(page) {
  await page.click('#btnReceiptValidateHeader')
  await page.waitForURL(/\/receipts\/[0-9a-f-]{36}$/, { timeout: 15000 })
  await settle(page)
  const ref = (await page.textContent('#displayReceiptRefHeader')).trim()
  return { ref, id: page.url().split('/').pop() }
}
async function validateReceiptUi(page) {
  await clickButton(page, 'Confirm Receipt', 'body', { exact: false })
  await clickButton(page, 'Mark as Arrived', 'body', { exact: false })
  await clickButton(page, 'Validate Receipt', 'body', { exact: false })
  await page.click('#btnConfirmValidation')
  await page.waitForSelector('#receiptValidatedBanner', { timeout: 15000 })
}

await test('RECEIPT-004', 'Receipt quantity 0 and -10 are rejected', mgr, async () => {
  await fillReceipt(mgr, { supplierInline: true, location: 'QA Receiving Rack', sku: 'QA-STEEL-001', qty: 0 })
  const sup = (await apiGet(mgr, `/suppliers?search=${SUPPLIER.code}`)).body.find((x) => x.code === SUPPLIER.code)
  expect(sup && sup.email === SUPPLIER.email && sup.phone === SUPPLIER.phone, `supplier API ${fmt(sup)}`)
  S.supplierId = sup.id
  const msgs = []
  for (const q of ['0', '-10']) {
    await mgr.locator('input[aria-label="Received quantity of QA-STEEL-001"]').fill(q)
    await mgr.click('#btnReceiptValidateHeader')
    const err = await waitFor(mgr, async () => (await mgr.textContent('#receiptActionError').catch(() => ''))?.trim(), `no error for ${q}`)
    expect(mgr.url().endsWith('/receipts/new'), `saved with quantity ${q}`)
    msgs.push(`${q}: "${err}"`)
  }
  const api = await apiRaw(mgr, 'POST', '/receipts', { supplierId: S.supplierId, warehouseId: S.warehouseId, locationId: S.locs.rec, items: [{ productId: S.products.steel, quantity: 0 }] })
  expect(api.status === 400, `API quantity 0 → ${api.status}`)
  return `supplier created inline with email/phone; ${msgs.join('; ')}; API qty 0 → 400`
})

let rcpt1
await test('RECEIPT-001', 'Create receipt: QA Steel 100 KG → QA Receiving Rack', mgr, async () => {
  await mgr.locator('input[aria-label="Received quantity of QA-STEEL-001"]').fill('100')
  rcpt1 = await saveReceiptDraft(mgr)
  S.rcpt1 = rcpt1
  expect(/^WH\/IN\/\d{6}$/.test(rcpt1.ref), `reference ${rcpt1.ref}`)
  const badge = (await mgr.textContent('#receiptStatusBadge')).trim()
  const r = (await apiGet(mgr, `/receipts/${rcpt1.id}`)).body
  expect(r.status === 'DRAFT' && r.items.length === 1 && r.items[0].quantity === 100 && r.location.id === S.locs.rec && r.supplier.id === S.supplierId, `API ${fmt({ status: r.status, items: r.items })}`)
  const d = await dashApi(mgr)
  expect(d.pendingReceipts === BASE.api.pendingReceipts + 1, `pending receipts ${d.pendingReceipts}`)
  return `reference ${rcpt1.ref}; badge "${badge}"; 1 line QA Steel × 100; pending receipts ${BASE.api.pendingReceipts} → ${d.pendingReceipts}`
})

await test('RECEIPT-002', 'Validate receipt → DONE, stock +100, ledger RECEIPT entry', mgr, async () => {
  const before = await stock(mgr, 'steel')
  await validateReceiptUi(mgr)
  const badge = (await mgr.textContent('#receiptStatusBadge')).trim()
  const r = (await apiGet(mgr, `/receipts/${rcpt1.id}`)).body
  const after = await stock(mgr, 'steel')
  expect(r.status === 'DONE' && /done/i.test(badge), `status ${r.status} / badge ${badge}`)
  expect(after.total === before.total + 100 && after.rec === before.rec + 100, `stock ${before.total} → ${after.total}`)
  const led = await ledger(mgr, `referenceId=${rcpt1.id}`)
  expect(led.length === 1, `${led.length} ledger rows`)
  const e = led[0]
  expect(e.movementType === 'RECEIPT' && e.direction === 'IN' && e.quantity === 100 && e.quantityBefore === before.rec && e.quantityAfter === before.rec + 100 && e.performedBy.name === MGR.name && e.reference === rcpt1.ref, `ledger ${fmt(e)}`)
  await mgr.goto(APP + '/products')
  await waitFor(mgr, async () => (await mgr.textContent(await tagScope(mgr, '#productsTable tbody tr', 'QA-STEEL-001'))).includes('100 KG'), 'products page does not show 100 KG')
  await mgr.goto(APP + '/move-history')
  await settle(mgr)
  await mgr.fill('input[placeholder="Search stock movements by product, SKU or reference..."]', rcpt1.ref)
  await settle(mgr, 800)
  const row = await tagScope(mgr, 'main table tbody tr', rcpt1.ref)
  expect((await mgr.textContent(row)).includes('+100 KG'), 'move history row does not show +100 KG')
  const d = await dashApi(mgr)
  const ui = await dashUi(mgr)
  expect(d.pendingReceipts === BASE.api.pendingReceipts && ui.receipts === d.pendingReceipts, `pending receipts API ${d.pendingReceipts} UI ${ui.receipts}`)
  return `status DONE; QA Steel ${before.total} → ${after.total} KG (Receiving ${after.rec}); ledger RECEIPT IN 100 (${e.quantityBefore} → ${e.quantityAfter}) by ${e.performedBy.name}; products + move history show it; pending receipts back to ${d.pendingReceipts}`
})

await test('RECEIPT-003', 'Validating the DONE receipt again does not move stock twice', mgr, async () => {
  await mgr.goto(APP + `/receipts/${rcpt1.id}`)
  await mgr.waitForSelector('#receiptValidatedBanner')
  const validateBtn = await buttonState(mgr, 'Validate Receipt', 'body', false)
  const again = await apiRaw(mgr, 'POST', `/receipts/${rcpt1.id}/validate`)
  const s = await stock(mgr, 'steel')
  const led = await ledger(mgr, `referenceId=${rcpt1.id}`)
  expect(!validateBtn.found, 'Validate still offered on a DONE receipt')
  expect(again.status === 200 && again.body.alreadyCompleted === true && again.body.stockChanges.length === 0, `repeat validate → ${again.status} ${fmt(again.body?.alreadyCompleted)}`)
  expect(s.total === 100 && led.length === 1, `stock ${s.total}, ledger rows ${led.length}`)
  return 'no Validate button on the DONE receipt; forced repeat request → 200 alreadyCompleted, stockChanges []; stock still 100, 1 ledger row'
})

// ================================================================================================
// 18. TRANSFERS
// ================================================================================================
async function openTransferModal(page) {
  await page.goto(APP + '/transfers')
  await settle(page)
  await clickButton(page, 'New Transfer', 'body', { exact: false })
  await page.locator('#newTransferModal').waitFor({ state: 'visible' })
  await settle(page, 300)
}
async function fillTransfer(page, from, to, qty) {
  await selectByLabel(page, '#modalSourceWarehouse', WH.name)
  await selectByLabel(page, '#modalSourceLocation', from)
  await selectByLabel(page, '#modalDestWarehouse', WH.name)
  await selectByLabel(page, '#modalDestLocation', to)
  if (qty !== undefined) {
    const productSelect = page.locator('#newTransferModal select:not([id])').first()
    await waitFor(page, () => productSelect.evaluate((s) => [...s.options].some((o) => o.textContent.includes('QA-STEEL-001'))), 'no products in the line select')
    const value = await productSelect.evaluate((s) => [...s.options].find((o) => o.textContent.includes('QA-STEEL-001')).value)
    await productSelect.selectOption(value)
    await page.locator('#newTransferModal input[type=number]').first().fill(String(qty))
  }
}
async function newestTransfer(page) {
  return (await apiGet(page, '/transfers?limit=1')).body.data[0]
}

await test('TRANSFER-004', 'Same source and destination location is rejected', mgr, async () => {
  await openTransferModal(mgr)
  await fillTransfer(mgr, 'QA Receiving Rack', 'QA Receiving Rack')
  await mgr.locator('#locationWarning').waitFor({ state: 'visible' })
  const save = await buttonState(mgr, 'Save Draft', '#newTransferModal')
  const warning = (await mgr.textContent('#locationWarning')).trim()
  await clickButton(mgr, 'Cancel', '#newTransferModal')
  const api = await apiRaw(mgr, 'POST', '/transfers', { sourceWarehouseId: S.warehouseId, sourceLocationId: S.locs.rec, destinationWarehouseId: S.warehouseId, destinationLocationId: S.locs.rec, items: [{ productId: S.products.steel, quantity: 1 }] })
  expect(save.disabled && api.status === 400 && api.body.code === 'SOURCE_DESTINATION_SAME', `save disabled=${save.disabled}, API ${api.status} ${api.body?.code}`)
  return `warning "${warning}"; Save Draft disabled; API → 400 SOURCE_DESTINATION_SAME`
})

let tr1
await test('TRANSFER-001', 'Create transfer QA Steel 30 KG: Receiving → Production', mgr, async () => {
  await openTransferModal(mgr)
  await fillTransfer(mgr, 'QA Receiving Rack', 'QA Production Rack', 30)
  await clickButton(mgr, 'Save Draft', '#newTransferModal')
  await mgr.locator('#newTransferModal').waitFor({ state: 'hidden', timeout: 10000 })
  tr1 = await newestTransfer(mgr)
  S.tr1 = tr1
  expect(/^WH\/TR\/\d{6}$/.test(tr1.reference) && tr1.status === 'DRAFT', `transfer ${tr1.reference} ${tr1.status}`)
  expect(tr1.sourceLocation.id === S.locs.rec && tr1.destinationLocation.id === S.locs.prod && tr1.items[0].quantity === 30, `API ${fmt({ src: tr1.sourceLocation.name, dst: tr1.destinationLocation.name, items: tr1.items })}`)
  const row = await tagScope(mgr, 'main table tbody tr', tr1.reference)
  const text = await mgr.textContent(row)
  expect(text.includes('QA Receiving Rack') || text.includes('QA-REC-001'), 'row does not show the source')
  const d = await dashApi(mgr)
  expect(d.internalTransfersScheduled === BASE.api.internalTransfersScheduled + 1, `scheduled ${d.internalTransfersScheduled}`)
  return `${tr1.reference} DRAFT, ${tr1.sourceLocation.name} → ${tr1.destinationLocation.name}, 30 KG; scheduled transfers ${BASE.api.internalTransfersScheduled} → ${d.internalTransfersScheduled}`
})

await test('TRANSFER-002', 'Confirm + validate transfer: Receiving 70, Production 30, total unchanged, 2 ledger rows', mgr, async () => {
  const before = await stock(mgr, 'steel')
  let row = await tagScope(mgr, 'main table tbody tr', tr1.reference)
  await clickButton(mgr, 'Confirm', row)
  await waitFor(mgr, async () => (await apiGet(mgr, `/transfers/${tr1.id}`)).body.status === 'READY', 'transfer never became READY')
  row = await tagScope(mgr, 'main table tbody tr', tr1.reference)
  await clickButton(mgr, 'Validate', row)
  await mgr.locator('#validateModal').waitFor({ state: 'visible' })
  await clickButton(mgr, 'Validate Transfer', '#validateModal')
  await waitText(mgr, `${tr1.reference} validated`)
  const after = await stock(mgr, 'steel')
  const t = (await apiGet(mgr, `/transfers/${tr1.id}`)).body
  expect(t.status === 'DONE', `status ${t.status}`)
  expect(after.rec === before.rec - 30 && after.prod === before.prod + 30 && after.total === before.total, `stock ${fmt(before)} → ${fmt(after)}`)
  const led = await ledger(mgr, `referenceId=${tr1.id}`)
  const out = led.find((e) => e.direction === 'OUT')
  const inn = led.find((e) => e.direction === 'IN')
  expect(led.length === 2 && out.location.id === S.locs.rec && inn.location.id === S.locs.prod && out.quantity === 30 && inn.quantity === 30 && out.reference === tr1.reference && inn.reference === tr1.reference, `ledger ${fmt(led.map((e) => [e.direction, e.location.code, e.quantity]))}`)
  const d = await dashApi(mgr)
  expect(d.internalTransfersScheduled === BASE.api.internalTransfersScheduled, `scheduled ${d.internalTransfersScheduled}`)
  return `DONE; Receiving ${before.rec} → ${after.rec}, Production ${before.prod} → ${after.prod}, total ${after.total}; ledger OUT ${out.location.code} (${out.quantityBefore}→${out.quantityAfter}) + IN ${inn.location.code} (${inn.quantityBefore}→${inn.quantityAfter}) both ${tr1.reference}; scheduled back to ${d.internalTransfersScheduled}`
})

await test('TRANSFER-003', 'Transfer of 1000 KG (insufficient stock) cannot move stock', mgr, async () => {
  const before = await stock(mgr, 'steel')
  const ledgerBefore = (await apiGet(mgr, '/ledger/summary')).body.totalMovements
  await openTransferModal(mgr)
  await fillTransfer(mgr, 'QA Receiving Rack', 'QA Production Rack', 1000)
  await clickButton(mgr, 'Confirm', '#newTransferModal')
  await mgr.locator('#newTransferModal').waitFor({ state: 'hidden', timeout: 10000 })
  const t = await newestTransfer(mgr)
  S.trShort = t
  expect(t.status === 'WAITING' && t.items[0].shortage === 1000 - before.rec, `status ${t.status}, shortage ${t.items[0]?.shortage}`)
  const row = await tagScope(mgr, 'main table tbody tr', t.reference)
  const rowText = await mgr.textContent(row)
  const validate = await buttonState(mgr, 'Validate', row)
  const forced = await apiRaw(mgr, 'POST', `/transfers/${t.id}/validate`)
  const after = await stock(mgr, 'steel')
  const ledgerAfter = (await apiGet(mgr, '/ledger/summary')).body.totalMovements
  expect(!validate.found, 'Validate offered for a short transfer')
  expect(forced.status === 409, `forced validate → ${forced.status}`)
  expect(after.total === before.total && after.rec === before.rec && ledgerAfter === ledgerBefore, 'stock or ledger changed')
  expect((await apiGet(mgr, `/transfers/${t.id}`)).body.status !== 'DONE', 'transfer marked DONE')
  // Clean up the open document through the UI (Cancel button, confirm dialog accepted)
  await mgr.locator(`${row} [title="Cancel transfer"]`).click()
  await waitFor(mgr, async () => (await apiGet(mgr, `/transfers/${t.id}`)).body.status === 'CANCELED', 'cancel did not work')
  return `${t.reference} → WAITING ("${rowText.match(/Short[^\n]*/)?.[0] ?? 'short'}"), no Validate button; forced validate → 409 "${forced.body?.message}"; stock + ledger unchanged; then canceled via UI`
})

// ================================================================================================
// 19. DELIVERIES
// ================================================================================================
async function openNewDelivery(page) {
  await page.goto(APP + '/deliveries')
  await settle(page)
  await clickButton(page, '+ New Delivery', 'main', { exact: false }).catch(() => clickButton(page, 'New Delivery', 'body', { exact: false }))
  await page.locator('#viewDeliveryNew').waitFor({ state: 'visible' })
  await settle(page, 300)
}
async function fillDelivery(page, { inlineCustomer, location, qty }) {
  if (inlineCustomer) {
    if (!(await page.isVisible('#newCustomerName'))) await clickButton(page, 'New Customer', '#viewDeliveryNew', { exact: false })
    await page.fill('#newCustomerName', CUSTOMER.name)
    await page.fill('#newCustomerCode', CUSTOMER.code)
    await page.fill('#newCustomerEmail', CUSTOMER.email)
    await page.fill('#newCustomerPhone', CUSTOMER.phone)
    await clickButton(page, 'Create Customer', '#viewDeliveryNew')
    await waitFor(page, () => page.evaluate((n) => document.querySelector('#inputNewCustomer')?.selectedOptions[0]?.textContent.includes(n), CUSTOMER.name), 'new customer not selected')
  } else {
    await selectByLabel(page, '#inputNewCustomer', CUSTOMER.name)
  }
  await selectByLabel(page, '#selectNewWarehouse', WH.name)
  await selectByLabel(page, '#selectNewSourceLoc', location)
  await selectByLabel(page, '#deliveryProductQuickSelect', 'QA-STEEL-001')
  await page.locator('input[aria-label="Quantity of QA-STEEL-001"]').fill(String(qty))
}
async function detailStatus(page) {
  return (await page.textContent('#detailBadgeStatus')).replace(/\s+/g, ' ').trim()
}

let dl1
await test('DELIVERY-N01', 'Delivery quantity 0 and -5 are rejected', mgr, async () => {
  await openNewDelivery(mgr)
  await fillDelivery(mgr, { inlineCustomer: true, location: 'QA Production Rack', qty: 0 })
  const cus = (await apiGet(mgr, `/customers?search=${CUSTOMER.code}`)).body.find((x) => x.code === CUSTOMER.code)
  expect(cus && cus.email === CUSTOMER.email && cus.phone === CUSTOMER.phone, `customer API ${fmt(cus)}`)
  S.customerId = cus.id
  const msgs = []
  for (const q of ['0', '-5']) {
    await mgr.locator('input[aria-label="Quantity of QA-STEEL-001"]').fill(q)
    await clickButton(mgr, 'Save as Draft', '#viewDeliveryNew')
    await waitText(mgr, 'greater than 0')
    msgs.push(q)
  }
  const deliveries = (await apiGet(mgr, '/deliveries?limit=100')).body.data.length
  expect(deliveries === 0 || !(await apiGet(mgr, '/deliveries?limit=100')).body.data.some((d) => d.items?.some((i) => i.quantity <= 0)), 'a delivery with a non-positive quantity was saved')
  return `customer created inline with email/phone; quantities ${msgs.join(', ')} → "Every line needs a quantity greater than 0"`
})

await test('DELIVERY-001', 'Create delivery QA Steel 20 KG from QA Production Rack', mgr, async () => {
  await mgr.locator('input[aria-label="Quantity of QA-STEEL-001"]').fill('20')
  await clickButton(mgr, 'Save as Draft', '#viewDeliveryNew')
  await mgr.locator('#viewDeliveryDetail').waitFor({ state: 'visible', timeout: 10000 })
  const ref = (await mgr.textContent('#detailOrderRef')).trim()
  dl1 = (await apiGet(mgr, `/deliveries?search=${encodeURIComponent(ref)}`)).body.data[0]
  S.dl1 = dl1
  expect(/^WH\/OUT\/\d{6}$/.test(ref) && dl1.status === 'DRAFT' && dl1.items[0].quantity === 20 && dl1.items[0].sku === 'QA-STEEL-001', `API ${fmt({ ref, status: dl1?.status, items: dl1?.items })}`)
  const d = await dashApi(mgr)
  expect(d.pendingDeliveries === BASE.api.pendingDeliveries + 1, `pending deliveries ${d.pendingDeliveries}`)
  return `${ref} "${await detailStatus(mgr)}", QA Steel × 20 KG; pending deliveries ${BASE.api.pendingDeliveries} → ${d.pendingDeliveries}`
})

await test('DELIVERY-002', 'Confirm + Pick: picked recorded, stock NOT decreased', mgr, async () => {
  const before = await stock(mgr, 'steel')
  await clickButton(mgr, 'Confirm Delivery', '#viewDeliveryDetail', { exact: false })
  await waitFor(mgr, async () => (await apiGet(mgr, `/deliveries/${dl1.id}`)).body.status === 'READY', 'not READY after confirm')
  await clickButton(mgr, 'Mark Picked', '#viewDeliveryDetail', { exact: false })
  const d = await waitFor(mgr, async () => { const x = (await apiGet(mgr, `/deliveries/${dl1.id}`)).body; return x.picked ? x : null }, 'picked not recorded')
  const after = await stock(mgr, 'steel')
  const card = await mgr.textContent('#viewDeliveryDetail')
  expect(after.prod === before.prod, `stock changed on pick ${before.prod} → ${after.prod}`)
  expect(d.picked.by.fullName === MGR.name && card.includes(MGR.name), `picked by ${d.picked.by.fullName}`)
  return `status "${await detailStatus(mgr)}"; picked by ${d.picked.by.fullName} at ${d.picked.at}; Production still ${after.prod}`
})

await test('DELIVERY-003', 'Pack: packed recorded, stock still unchanged', mgr, async () => {
  const before = await stock(mgr, 'steel')
  await clickButton(mgr, 'Mark Packed', '#viewDeliveryDetail', { exact: false })
  const d = await waitFor(mgr, async () => { const x = (await apiGet(mgr, `/deliveries/${dl1.id}`)).body; return x.packed ? x : null }, 'packed not recorded')
  const after = await stock(mgr, 'steel')
  expect(after.prod === before.prod, 'stock changed on pack')
  return `status "${await detailStatus(mgr)}"; packed by ${d.packed.by.fullName} at ${d.packed.at}; Production still ${after.prod}`
})

await test('DELIVERY-004', 'Validate delivery → DONE, Production 30 → 10, ledger OUT 20', mgr, async () => {
  const before = await stock(mgr, 'steel')
  await clickButton(mgr, 'Validate Delivery', '#viewDeliveryDetail', { exact: false })
  await mgr.click('#btnConfirmDeliveryValidation')
  await mgr.waitForSelector('#detailValidatedBanner', { timeout: 15000 })
  const after = await stock(mgr, 'steel')
  const x = (await apiGet(mgr, `/deliveries/${dl1.id}`)).body
  const led = await ledger(mgr, `referenceId=${dl1.id}`)
  expect(x.status === 'DONE', `status ${x.status}`)
  expect(after.prod === before.prod - 20 && after.total === before.total - 20, `stock ${fmt(before)} → ${fmt(after)}`)
  expect(led.length === 1 && led[0].direction === 'OUT' && led[0].quantity === 20 && led[0].quantityBefore === before.prod && led[0].quantityAfter === before.prod - 20, `ledger ${fmt(led)}`)
  const d = await dashApi(mgr)
  expect(d.pendingDeliveries === BASE.api.pendingDeliveries, `pending deliveries ${d.pendingDeliveries}`)
  return `DONE ("${await detailStatus(mgr)}"); Production ${before.prod} → ${after.prod}; ledger DELIVERY OUT 20 (${led[0].quantityBefore}→${led[0].quantityAfter}); pending deliveries back to ${d.pendingDeliveries}`
})

await test('DELIVERY-006', 'Validating the DONE delivery again does not deduct twice', mgr, async () => {
  const before = await stock(mgr, 'steel')
  const again = await apiRaw(mgr, 'POST', `/deliveries/${dl1.id}/validate`)
  const after = await stock(mgr, 'steel')
  const led = await ledger(mgr, `referenceId=${dl1.id}`)
  const btn = await buttonState(mgr, 'Validate Delivery', '#viewDeliveryDetail', false)
  expect(!btn.found && again.status === 200 && again.body.alreadyCompleted === true && after.total === before.total && led.length === 1, `btn=${btn.found} status=${again.status} stock ${before.total}→${after.total} ledger=${led.length}`)
  return 'no Validate button on DONE; forced repeat → 200 alreadyCompleted; stock unchanged; still 1 ledger row'
})

await test('DELIVERY-005', 'Delivery larger than available stock is blocked', mgr, async () => {
  const before = await stock(mgr, 'steel')
  const ledgerBefore = (await apiGet(mgr, '/ledger/summary')).body.totalMovements
  await openNewDelivery(mgr)
  await fillDelivery(mgr, { inlineCustomer: false, location: 'QA Production Rack', qty: 500 })
  await clickButton(mgr, 'Confirm Delivery', '#viewDeliveryNew', { exact: false })
  await mgr.locator('#viewDeliveryDetail').waitFor({ state: 'visible', timeout: 10000 })
  const ref = (await mgr.textContent('#detailOrderRef')).trim()
  const x = (await apiGet(mgr, `/deliveries?search=${encodeURIComponent(ref)}`)).body.data[0]
  S.dlShort = x
  const pick = await buttonState(mgr, 'Mark Picked', '#viewDeliveryDetail', false)
  const forced = await apiRaw(mgr, 'POST', `/deliveries/${x.id}/validate`)
  const after = await stock(mgr, 'steel')
  const ledgerAfter = (await apiGet(mgr, '/ledger/summary')).body.totalMovements
  expect(x.status === 'WAITING' && !pick.found, `status ${x.status}, pick offered ${pick.found}`)
  expect(forced.status === 409 && after.total === before.total && ledgerAfter === ledgerBefore, `forced ${forced.status}, stock ${before.total}→${after.total}`)
  await mgr.click('#btnDetailCancel')
  await waitFor(mgr, async () => (await apiGet(mgr, `/deliveries/${x.id}`)).body.status === 'CANCELED', 'cancel did not work')
  return `${ref} → WAITING (short ${x.items[0].shortage} KG), no Pick/Validate; forced validate → 409; stock + ledger unchanged; canceled via "Cancel Order"`
})

// ================================================================================================
// 20. ADJUSTMENTS
// ================================================================================================
async function openAdjustmentModal(page) {
  await page.goto(APP + '/adjustments')
  await settle(page)
  await clickButton(page, 'New Adjustment', 'main', { exact: true })
  await page.locator('#newAdjustmentModal').waitFor({ state: 'visible' })
  await settle(page, 300)
}
async function fillAdjustment(page, { sku = 'QA-STEEL-001', location, physical, reason, otherReason, notes }) {
  await selectByLabel(page, '#adjProduct', sku)
  await selectByLabel(page, '#adjWarehouse', WH.name)
  await selectByLabel(page, '#adjLocation', location)
  await page.fill('#adjPhysical', String(physical))
  if (otherReason) {
    await page.selectOption('#adjReason', '__OTHER__')
    await page.fill('input[placeholder="Describe the reason..."]', otherReason)
  } else {
    await page.selectOption('#adjReason', reason)
  }
  if (notes) await page.fill('#adjNotes', notes)
}
const modalBox = (page, label) => page.evaluate((label) => {
  const el = [...document.querySelectorAll('#newAdjustmentModal *')].find((e) => e.children.length === 0 && e.textContent.trim() === label)
  return el?.parentElement?.parentElement?.innerText ?? el?.parentElement?.innerText ?? ''
}, label)
async function newestAdjustment(page) {
  return (await apiGet(page, '/adjustments?limit=1')).body.data[0]
}
async function applyAdjustmentUi(page, ref) {
  const row = await tagScope(page, 'main table tbody tr', ref)
  await clickButton(page, 'Apply', row)
  await page.locator('#applyAdjustmentModal').waitFor({ state: 'visible' })
  await clickButton(page, 'Apply Adjustment', '#applyAdjustmentModal')
  await page.locator('#applyAdjustmentModal').waitFor({ state: 'hidden', timeout: 10000 })
}

await test('ADJ-005', 'Negative physical quantity -5 is rejected', mgr, async () => {
  const before = (await apiGet(mgr, '/adjustments?limit=1')).body.pagination.total
  await openAdjustmentModal(mgr)
  await fillAdjustment(mgr, { location: 'QA Production Rack', physical: -5, reason: 'Damaged Stock' })
  await clickButton(mgr, 'Save', '#newAdjustmentModal')
  await waitText(mgr, 'Enter a count of 0 or more.')
  const api = await apiRaw(mgr, 'POST', '/adjustments', { productId: S.products.steel, warehouseId: S.warehouseId, locationId: S.locs.prod, physicalQuantity: -5, reason: 'QA negative' })
  const after = (await apiGet(mgr, '/adjustments?limit=1')).body.pagination.total
  expect(api.status === 400 && after === before, `API ${api.status}, adjustments ${before}→${after}`)
  return 'UI: "Enter a count of 0 or more."; API physicalQuantity -5 → 400; nothing created'
})

let adj1
await test('ADJ-001', 'Create adjustment: Production recorded 10 (backend), physical 7 → difference -3', mgr, async () => {
  await mgr.fill('#adjPhysical', '7')
  await mgr.selectOption('#adjReason', '__OTHER__')
  await mgr.fill('input[placeholder="Describe the reason..."]', 'Damaged stock found during physical count')
  await mgr.fill('#adjNotes', 'QA adjustment test')
  const recordedBox = await modalBox(mgr, 'Recorded (system)')
  const diffBox = await modalBox(mgr, 'Difference')
  await clickButton(mgr, 'Save', '#newAdjustmentModal')
  await mgr.locator('#newAdjustmentModal').waitFor({ state: 'hidden', timeout: 10000 })
  adj1 = await newestAdjustment(mgr)
  S.adj1 = adj1
  expect(adj1.recordedQuantity === 10 && adj1.physicalQuantity === 7 && adj1.difference === -3 && adj1.status === 'READY' && adj1.reason === 'Damaged stock found during physical count' && adj1.notes === 'QA adjustment test', `API ${fmt(adj1)}`)
  const forged = await apiRaw(mgr, 'POST', '/adjustments', { productId: S.products.steel, warehouseId: S.warehouseId, locationId: S.locs.prod, physicalQuantity: 7, recordedQuantity: 100, difference: 50, reason: 'QA forged' })
  expect(forged.status === 400, `forged recorded/difference → ${forged.status}`)
  const row = await mgr.textContent(await tagScope(mgr, 'main table tbody tr', adj1.reference))
  expect(row.includes('10 KG') && row.includes('7 KG') && row.includes('−3 KG'), `row "${row.slice(0, 160)}"`)
  return `${adj1.reference} READY; modal showed recorded "${recordedBox.replace(/\s+/g, ' ').slice(0, 40)}", diff "${diffBox.replace(/\s+/g, ' ').slice(0, 30)}"; API recorded 10 / physical 7 / difference -3 (client-sent recorded/difference rejected 400)`
})

await test('ADJ-002', 'Apply adjustment → Production 7, ledger ADJUSTMENT_OUT 3 (10 → 7)', mgr, async () => {
  const before = await stock(mgr, 'steel')
  await applyAdjustmentUi(mgr, adj1.reference)
  const a = (await apiGet(mgr, `/adjustments/${adj1.id}`)).body
  const after = await stock(mgr, 'steel')
  const led = await ledger(mgr, `referenceId=${adj1.id}`)
  expect(a.status === 'DONE' && after.prod === 7 && after.total === before.total - 3, `status ${a.status}, stock ${fmt(after)}`)
  expect(led.length === 1 && led[0].direction === 'ADJUSTMENT_OUT' && led[0].quantity === 3 && led[0].quantityBefore === 10 && led[0].quantityAfter === 7, `ledger ${fmt(led)}`)
  const row = await mgr.textContent(await tagScope(mgr, 'main table tbody tr', adj1.reference))
  expect(row.includes('Applied'), 'row not Applied')
  return `DONE (row "Applied"); Production 10 → 7; total ${after.total}; ledger ADJUSTMENT_OUT 3 (10→7)`
})

// ================================================================================================
// 38. MOST IMPORTANT E2E SCENARIO — checkpoint after steps 1–4 (receipt 100, transfer 30, deliver 20, adjust -3)
// ================================================================================================
await test('E2E-SCENARIO', 'Scenario checkpoint: Receiving 70, Production 7, total 77; ledger sequence; dashboard', mgr, async () => {
  const s = await stock(mgr, 'steel')
  expect(s.rec === 70 && s.prod === 7 && s.total === 77, `stock ${fmt(s)}`)
  const led = (await ledger(mgr, `productId=${S.products.steel}&sortOrder=asc`)).map((e) => `${e.movementType}:${e.direction}:${e.signedQuantity}`)
  const expected = ['RECEIPT:IN:100', 'INTERNAL_TRANSFER:OUT:-30', 'INTERNAL_TRANSFER:IN:30', 'DELIVERY:OUT:-20', 'ADJUSTMENT:ADJUSTMENT_OUT:-3']
  const sorted = [...led].sort()
  expect(JSON.stringify(sorted) === JSON.stringify([...expected].sort()), `ledger ${fmt(led)}`)
  const net = (await ledger(mgr, `productId=${S.products.steel}`)).reduce((a, e) => a + e.signedQuantity, 0)
  expect(net === 77, `ledger net ${net}`)
  await mgr.goto(APP + '/products')
  await waitFor(mgr, async () => (await mgr.textContent(await tagScope(mgr, '#productsTable tbody tr', 'QA-STEEL-001'))).includes('77 KG'), 'products page does not show 77 KG')
  await mgr.goto(APP + '/move-history')
  await settle(mgr)
  await mgr.fill('input[placeholder="Search stock movements by product, SKU or reference..."]', 'QA-STEEL-001')
  await settle(mgr, 900)
  const shown = await readCount(mgr, /of ([\d,]+) ledger records/)
  expect(shown === 5, `move history shows ${shown} QA Steel movements`)
  const api = await dashApi(mgr)
  const ui = await dashUi(mgr)
  expect(ui.inStock === api.totalProductsInStock && ui.low === api.lowStock && ui.out === api.outOfStock, `dashboard UI ${fmt(ui)} vs API ${fmt(api)}`)
  return `Receiving 70 + Production 7 = 77 KG (UI + API); ledger ${led.join(', ')} (net 77); Move History 5 rows; dashboard in-stock ${ui.inStock}, low ${ui.low}, out ${ui.out}`
})

await test('ADJ-003', 'Positive adjustment: recorded 7, physical 9 → +2, ADJUSTMENT_IN 2', mgr, async () => {
  await openAdjustmentModal(mgr)
  await fillAdjustment(mgr, { location: 'QA Production Rack', physical: 9, reason: 'Found Stock', notes: 'QA positive adjustment' })
  await clickButton(mgr, 'Save', '#newAdjustmentModal')
  await mgr.locator('#newAdjustmentModal').waitFor({ state: 'hidden', timeout: 10000 })
  const a = await newestAdjustment(mgr)
  expect(a.recordedQuantity === 7 && a.difference === 2, `recorded ${a.recordedQuantity}, diff ${a.difference}`)
  await applyAdjustmentUi(mgr, a.reference)
  const s = await stock(mgr, 'steel')
  const led = await ledger(mgr, `referenceId=${a.id}`)
  expect(s.prod === 9 && led.length === 1 && led[0].direction === 'ADJUSTMENT_IN' && led[0].quantity === 2, `stock ${s.prod}, ledger ${fmt(led)}`)
  return `${a.reference}: recorded 7, physical 9, difference +2 → applied; Production 9; ledger ADJUSTMENT_IN 2 (7→9)`
})

await test('ADJ-004', 'Zero physical quantity is accepted (QA Bolts at Dispatch Rack: 0 → 0, no ledger row)', mgr, async () => {
  await openAdjustmentModal(mgr)
  await fillAdjustment(mgr, { sku: 'QA-BOLTS-001', location: 'QA Dispatch Rack', physical: 0, reason: 'Cycle Count', notes: 'QA zero count' })
  await clickButton(mgr, 'Save', '#newAdjustmentModal')
  await mgr.locator('#newAdjustmentModal').waitFor({ state: 'hidden', timeout: 10000 })
  const a = await newestAdjustment(mgr)
  expect(a.recordedQuantity === 0 && a.physicalQuantity === 0 && a.difference === 0, `API ${fmt(a)}`)
  await applyAdjustmentUi(mgr, a.reference)
  const done = (await apiGet(mgr, `/adjustments/${a.id}`)).body
  const led = await ledger(mgr, `referenceId=${a.id}`)
  expect(done.status === 'DONE' && led.length === 0, `status ${done.status}, ledger rows ${led.length}`)
  return `${a.reference}: 0 counted accepted, applied → DONE; no ledger row (nothing moved)`
})

await test('ADJ-CONC', 'Stale adjustment (stock changed by a receipt) is rejected, stock not overwritten', mgr, async () => {
  await openAdjustmentModal(mgr)
  await fillAdjustment(mgr, { location: 'QA Production Rack', physical: 8, reason: 'Cycle Count', notes: 'QA concurrency test' })
  await clickButton(mgr, 'Save', '#newAdjustmentModal')
  await mgr.locator('#newAdjustmentModal').waitFor({ state: 'hidden', timeout: 10000 })
  const stale = await newestAdjustment(mgr)
  S.adjStale = stale
  expect(stale.recordedQuantity === 9, `recorded ${stale.recordedQuantity}`)
  // Another operation changes stock: receive 10 KG QA Steel into the Production Rack (through the UI)
  await fillReceipt(mgr, { supplierInline: false, location: 'QA Production Rack', sku: 'QA-STEEL-001', qty: 10 })
  const r2 = await saveReceiptDraft(mgr)
  S.rcpt2 = r2
  await validateReceiptUi(mgr)
  let s = await stock(mgr, 'steel')
  expect(s.prod === 19, `Production after receipt ${s.prod}`)
  const ledgerBefore = (await ledger(mgr, `referenceId=${stale.id}`)).length
  await mgr.goto(APP + '/adjustments')
  await settle(mgr)
  const row = await tagScope(mgr, 'main table tbody tr', stale.reference)
  const rowText = await mgr.textContent(row)
  await clickButton(mgr, 'Apply', row)
  await mgr.locator('#applyAdjustmentModal').waitFor({ state: 'visible' })
  const apply = await buttonState(mgr, 'Apply Adjustment', '#applyAdjustmentModal')
  const warning = (await mgr.textContent('#applyAdjustmentModal')).match(/Stock changed[^.]*\./)?.[0]
  await clickButton(mgr, 'Cancel', '#applyAdjustmentModal')
  const forced = await apiRaw(mgr, 'POST', `/adjustments/${stale.id}/apply`)
  s = await stock(mgr, 'steel')
  const a = (await apiGet(mgr, `/adjustments/${stale.id}`)).body
  expect(rowText.includes('Stale'), 'row not marked Stale')
  expect(apply.found && apply.disabled && warning, `Apply button state ${fmt(apply)}, warning ${warning}`)
  expect(forced.status === 409 && forced.body.code === 'STOCK_CHANGED_SINCE_ADJUSTMENT', `forced apply → ${forced.status} ${forced.body?.code}`)
  expect(s.prod === 19 && a.status === 'READY' && (await ledger(mgr, `referenceId=${stale.id}`)).length === ledgerBefore, `stock ${s.prod}, status ${a.status}`)
  await mgr.locator(`${await tagScope(mgr, 'main table tbody tr', stale.reference)} [title="Cancel adjustment"]`).click()
  await waitFor(mgr, async () => (await apiGet(mgr, `/adjustments/${stale.id}`)).body.status === 'CANCELED', 'cancel failed')
  return `${stale.reference} recorded 9; receipt ${r2.ref} +10 → Production 19; row "Stale", modal "${warning}", Apply disabled; forced apply → 409 STOCK_CHANGED_SINCE_ADJUSTMENT; stock stays 19, no ledger row; adjustment canceled via UI`
})

// ================================================================================================
// 23. DASHBOARD
// ================================================================================================
await test('DASH-004', 'Pending receipts: +1 when a receipt is created, -1 when validated (QA Copper 5 KG)', mgr, async () => {
  const before = await dashUi(mgr)
  await fillReceipt(mgr, { supplierInline: false, location: 'QA Receiving Rack', sku: 'QA-COPPER-001', qty: 5 })
  const r = await saveReceiptDraft(mgr)
  S.rcpt3 = r
  const mid = await dashUi(mgr)
  await mgr.goto(APP + `/receipts/${r.id}`)
  await settle(mgr)
  await validateReceiptUi(mgr)
  const after = await dashUi(mgr)
  expect(mid.receipts === before.receipts + 1 && after.receipts === before.receipts, `pending receipts ${before.receipts} → ${mid.receipts} → ${after.receipts}`)
  return `${r.ref}: Pending Receipts card ${before.receipts} → ${mid.receipts} (draft) → ${after.receipts} (validated)`
})

await test('DASH-005', 'Pending deliveries: +1 when created, -1 when completed', mgr, async () => {
  const before = await dashUi(mgr)
  await openNewDelivery(mgr)
  await fillDelivery(mgr, { inlineCustomer: false, location: 'QA Receiving Rack', qty: 5 })
  await clickButton(mgr, 'Save as Draft', '#viewDeliveryNew')
  await mgr.locator('#viewDeliveryDetail').waitFor({ state: 'visible', timeout: 10000 })
  const ref = (await mgr.textContent('#detailOrderRef')).trim()
  const x = (await apiGet(mgr, `/deliveries?search=${encodeURIComponent(ref)}`)).body.data[0]
  S.dl2 = x
  const mid = await dashUi(mgr)
  await mgr.goto(APP + '/deliveries')
  await settle(mgr)
  for (const step of ['Confirm', 'Pick', 'Pack', 'Validate']) {
    const row = await tagScope(mgr, '#deliveriesTableBody tr', ref)
    await clickButton(mgr, step, row)
    if (step === 'Validate') await mgr.click('#btnConfirmDeliveryValidation')
    await settle(mgr, 500)
  }
  await waitFor(mgr, async () => (await apiGet(mgr, `/deliveries/${x.id}`)).body.status === 'DONE', 'delivery not DONE')
  const after = await dashUi(mgr)
  expect(mid.deliveries === before.deliveries + 1 && after.deliveries === before.deliveries, `pending deliveries ${before.deliveries} → ${mid.deliveries} → ${after.deliveries}`)
  return `${ref} (QA Steel 5 KG from Receiving, via list buttons Confirm/Pick/Pack/Validate): Pending Deliveries card ${before.deliveries} → ${mid.deliveries} → ${after.deliveries}`
})

await test('DASH-006', 'Scheduled transfers: +1 when created, -1 when validated', mgr, async () => {
  const before = await dashUi(mgr)
  await openTransferModal(mgr)
  await fillTransfer(mgr, 'QA Receiving Rack', 'QA Dispatch Rack', 10)
  await clickButton(mgr, 'Save Draft', '#newTransferModal')
  await mgr.locator('#newTransferModal').waitFor({ state: 'hidden', timeout: 10000 })
  const t = await newestTransfer(mgr)
  S.tr2 = t
  const mid = await dashUi(mgr)
  await mgr.goto(APP + '/transfers')
  await settle(mgr)
  await clickButton(mgr, 'Confirm', await tagScope(mgr, 'main table tbody tr', t.reference))
  await waitFor(mgr, async () => (await apiGet(mgr, `/transfers/${t.id}`)).body.status === 'READY', 'not READY')
  await clickButton(mgr, 'Validate', await tagScope(mgr, 'main table tbody tr', t.reference))
  await clickButton(mgr, 'Validate Transfer', '#validateModal')
  await waitFor(mgr, async () => (await apiGet(mgr, `/transfers/${t.id}`)).body.status === 'DONE', 'not DONE')
  const after = await dashUi(mgr)
  expect(mid.transfers === before.transfers + 1 && after.transfers === before.transfers, `scheduled ${before.transfers} → ${mid.transfers} → ${after.transfers}`)
  return `${t.reference} (QA Steel 10 KG Receiving → Dispatch): Internal Transfers card ${before.transfers} → ${mid.transfers} → ${after.transfers}`
})

await test('DASH-001', 'Total Products in Stock = distinct products with stock > 0', mgr, async () => {
  const products = (await apiGet(mgr, '/products?limit=100')).body.data.filter((p) => p.status === 'ACTIVE')
  const computed = products.filter((p) => p.stock.onHand > 0).length
  const ui = await dashUi(mgr)
  const api = await dashApi(mgr)
  expect(ui.inStock === computed && api.totalProductsInStock === computed, `UI ${ui.inStock}, API ${api.totalProductsInStock}, computed ${computed}`)
  return `In Stock SKUs card ${ui.inStock} = API ${api.totalProductsInStock} = products with stock > 0 (${products.filter((p) => p.stock.onHand > 0).map((p) => `${p.sku} ${p.stock.onHand}`).join(', ')})`
})

await test('DASH-002', 'Low stock uses reorder levels (QA Copper 5 ≤ 10; QA Steel 19 ≤ 20 at Production)', mgr, async () => {
  const products = (await apiGet(mgr, '/products?limit=100')).body.data.filter((p) => p.status === 'ACTIVE')
  const computed = products.filter((p) => p.stock.onHand > 0 && p.stock.onHand <= p.reorderLevel).length
  const ui = await dashUi(mgr)
  const api = await dashApi(mgr)
  expect(ui.low === computed && api.lowStock === computed, `UI ${ui.low}, API ${api.lowStock}, computed ${computed}`)
  const copperCard = await tagScope(mgr, 'div.relative.rounded-xl', 'QA Copper')
  expect((await mgr.textContent(copperCard)).includes('Low'), 'QA Copper not shown as Low')
  await mgr.selectOption('#locationFilter', `loc:${S.locs.prod}`)
  await settle(mgr, 900)
  const scoped = await dashApi(mgr, `?locationId=${S.locs.prod}`)
  const alerts = (await apiGet(mgr, `/dashboard/stock-alerts?locationId=${S.locs.prod}`)).body.data
  const steelCard = await tagScope(mgr, 'div.relative.rounded-xl', 'QA Steel')
  expect(alerts.some((a) => a.product.sku === 'QA-STEEL-001' && a.status === 'LOW_STOCK' && a.quantity === 19), `scoped alerts ${fmt(alerts)}`)
  expect((await mgr.textContent(steelCard)).includes('Low'), 'QA Steel not Low in Production scope')
  await mgr.click('#resetFiltersBtn')
  return `Low chip ${ui.low} = API ${api.lowStock} = computed; QA Copper card "Low" (5 ≤ 10); Production-rack scope: QA Steel 19 ≤ 20 shown Low (scoped lowStock ${scoped.lowStock})`
})

await test('DASH-003', 'Out of stock: QA Bolts (0) is counted and listed', mgr, async () => {
  const products = (await apiGet(mgr, '/products?limit=100')).body.data.filter((p) => p.status === 'ACTIVE')
  const computed = products.filter((p) => p.stock.onHand === 0).length
  const ui = await dashUi(mgr)
  const card = await tagScope(mgr, 'div.relative.rounded-xl', 'QA Bolts')
  expect(ui.out === computed && (await mgr.textContent(card)).includes('Out of Stock'), `UI out ${ui.out}, computed ${computed}`)
  return `Depleted chip ${ui.out} = products with 0 stock (${computed}); QA Bolts card "Out of Stock"`
})

await test('DASH-KPI', 'All required KPI cards present and consistent with the API', mgr, async () => {
  const ui = await dashUi(mgr)
  const api = await dashApi(mgr)
  const text = await bodyText(mgr)
  for (const label of ['IN STOCK SKUS', 'INVENTORY RISK', 'PENDING RECEIPTS', 'PENDING DELIVERIES', 'INTERNAL TRANSFERS']) expect(text.toUpperCase().includes(label), `card ${label} missing`)
  expect(ui.inStock === api.totalProductsInStock && ui.low === api.lowStock && ui.out === api.outOfStock && ui.receipts === api.pendingReceipts && ui.deliveries === api.pendingDeliveries && ui.transfers === api.internalTransfersScheduled, `UI ${fmt(ui)} vs API ${fmt(api)}`)
  return `cards: In Stock SKUs ${ui.inStock}, Inventory Risk ${ui.risk} (${ui.low} Low / ${ui.out} Depleted), Pending Receipts ${ui.receipts}, Pending Deliveries ${ui.deliveries}, Internal Transfers ${ui.transfers} — all equal the API`
})

// ================================================================================================
// 24. DASHBOARD FILTERS
// ================================================================================================
async function opsCount(page) {
  await settle(page, 900)
  return waitFor(page, async () => {
    const t = (await page.textContent('#operationsCountBadge').catch(() => '')) ?? ''
    const m = t.match(/of\s+([\d,]+)/)
    if (m) return Number(m[1].replace(/,/g, ''))
    if (await page.isVisible('#noResultsState')) return 0
    return null
  }, 'operations count never shown').catch(() => 0)
}
async function opsRows(page) {
  return page.$$eval('#operationsTableBody tr.op-row', (trs) => trs.map((t) => t.innerText))
}
await test('DASH-F-WH', 'Filter: warehouse QA Main Warehouse', mgr, async () => {
  await dashUi(mgr)
  await mgr.selectOption('#locationFilter', `wh:${S.warehouseId}`)
  const n = await opsCount(mgr)
  const api = (await apiGet(mgr, `/dashboard/operations?warehouseId=${S.warehouseId}`)).body.pagination.total
  const k = await dashApi(mgr, `?warehouseId=${S.warehouseId}`)
  const ui = await mgr.evaluate(() => document.body.innerText)
  expect(n === api, `table ${n} vs API ${api}`)
  expect(ui.includes(String(k.pendingReceipts)), 'KPIs not shown')
  await mgr.click('#resetFiltersBtn')
  return `operations table ${n} rows = API ${api}; warehouse KPIs in stock ${k.totalProductsInStock}, low ${k.lowStock}, out ${k.outOfStock}`
})
await test('DASH-F-LOC', 'Filter: location QA Production Rack', mgr, async () => {
  await mgr.selectOption('#locationFilter', `loc:${S.locs.prod}`)
  const n = await opsCount(mgr)
  const api = (await apiGet(mgr, `/dashboard/operations?locationId=${S.locs.prod}`)).body.pagination.total
  const rows = await opsRows(mgr)
  expect(n === api && rows.every((r) => r.includes('QA Production Rack')), `table ${n} vs API ${api}; rows ${fmt(rows.map((r) => r.slice(0, 60)))}`)
  await mgr.click('#resetFiltersBtn')
  return `${n} rows, every row involves QA Production Rack (= API)`
})
await test('DASH-F-CAT', 'Filter: category QA Raw Materials', mgr, async () => {
  await mgr.selectOption('#categoryFilter', S.categoryId)
  const n = await opsCount(mgr)
  const api = (await apiGet(mgr, `/dashboard/operations?categoryId=${S.categoryId}`)).body.pagination.total
  const k = await dashApi(mgr, `?categoryId=${S.categoryId}`)
  expect(n === api, `table ${n} vs API ${api}`)
  expect(k.totalProducts === 3, `category products ${k.totalProducts}`)
  await mgr.click('#resetFiltersBtn')
  return `${n} rows (= API); category KPIs: ${k.totalProducts} products, ${k.totalProductsInStock} in stock, ${k.lowStock} low, ${k.outOfStock} out`
})
await test('DASH-F-TYPE', 'Filter: document type tabs Receipts / Delivery / Internal / Adjustments', mgr, async () => {
  const out = []
  const labels = { RECEIPT: 'Receipt', DELIVERY: 'Delivery', INTERNAL_TRANSFER: 'Internal', ADJUSTMENT: 'Adjustment' }
  for (const type of Object.keys(labels)) {
    await mgr.click(`#typeTabs button[data-type="${type}"]`)
    const n = await opsCount(mgr)
    const api = (await apiGet(mgr, `/dashboard/operations?documentType=${type}`)).body.pagination.total
    const rows = await opsRows(mgr)
    expect(n === api && rows.every((r) => r.includes(labels[type])), `${type}: table ${n} vs API ${api}`)
    out.push(`${type} ${n}`)
  }
  await mgr.click('#typeTabs button[data-type="All"]').catch(() => mgr.click('#resetFiltersBtn'))
  return out.join(', ') + ' — each equals the API, rows only of that type'
})
await test('DASH-F-STATUS', 'Filter: status DRAFT / WAITING / READY / DONE / CANCELED', mgr, async () => {
  const out = []
  for (const status of ['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED']) {
    await mgr.selectOption('#statusFilter', status)
    const n = await opsCount(mgr)
    const api = (await apiGet(mgr, `/dashboard/operations?status=${status}`)).body.pagination.total
    expect(n === api, `${status}: table ${n} vs API ${api}`)
    out.push(`${status} ${n}`)
  }
  await mgr.click('#resetFiltersBtn')
  return out.join(', ') + ' (each = API)'
})
await test('DASH-F-DATE', 'Filter: date range Today contains all QA operations', mgr, async () => {
  const all = await opsCount(mgr)
  await mgr.selectOption('#dateFilter', 'TODAY')
  const today = await opsCount(mgr)
  expect(today === all && today > 0, `today ${today} vs all ${all}`)
  await mgr.selectOption('#dateFilter', '30D')
  const month = await opsCount(mgr)
  expect(month === all, `30 days ${month}`)
  await mgr.click('#resetFiltersBtn')
  return `All Time ${all}, Today ${today}, Last 30 Days ${month}`
})
await test('DASH-PAGE', 'Operations table pagination (10 per page)', mgr, async () => {
  const total = await opsCount(mgr)
  if (total <= 10) throw new Blocked(`only ${total} operations — pagination needs > 10`)
  const first = await opsRows(mgr)
  await clickButton(mgr, 'Next', 'body')
  await settle(mgr, 700)
  const second = await opsRows(mgr)
  expect(second.length === total - 10 || second.length === 10, `page 2 has ${second.length} rows`)
  expect(second[0] !== first[0], 'page 2 shows the same rows')
  await clickButton(mgr, 'Previous', 'body')
  await settle(mgr, 700)
  expect((await opsRows(mgr))[0] === first[0], 'Previous did not return to page 1')
  return `${total} operations: page 1 = 10 rows, Next → ${second.length} rows, Previous → page 1`
})

// ================================================================================================
// 22. LEDGER / MOVE HISTORY
// ================================================================================================
const LEDGER_SEARCH = 'input[placeholder="Search stock movements by product, SKU or reference..."]'
async function ledgerUiCount(page) {
  await settle(page, 900)
  return readCount(page, /of ([\d,]+) ledger records/)
}
await test('LEDGER-001', 'Search "QA Steel"', mgr, async () => {
  await mgr.goto(APP + '/move-history')
  await settle(mgr)
  await mgr.fill(LEDGER_SEARCH, 'QA Steel')
  const n = await ledgerUiCount(mgr)
  const api = (await apiGet(mgr, '/ledger?search=QA%20Steel')).body.pagination.total
  const rows = await mgr.$$eval('main table tbody tr', (trs) => trs.map((t) => t.innerText))
  expect(n === api && n > 0 && rows.every((r) => r.includes('QA Steel')), `UI ${n} vs API ${api}`)
  return `${n} QA Steel movements (= API), every row is QA Steel`
})
await test('LEDGER-002', 'Search by SKU QA-STEEL-001', mgr, async () => {
  await mgr.fill(LEDGER_SEARCH, 'QA-STEEL-001')
  const n = await ledgerUiCount(mgr)
  const api = (await apiGet(mgr, '/ledger?productId=' + S.products.steel)).body.pagination.total
  expect(n === api, `UI ${n} vs API ${api}`)
  return `${n} rows = all ledger entries of QA Steel`
})
await test('LEDGER-003', 'Search by reference (receipt → 1 row, transfer → 2 rows)', mgr, async () => {
  await mgr.fill(LEDGER_SEARCH, S.rcpt1.ref)
  const a = await ledgerUiCount(mgr)
  await mgr.fill(LEDGER_SEARCH, S.tr1.reference)
  const b = await ledgerUiCount(mgr)
  const rows = await mgr.$$eval('main table tbody tr', (trs) => trs.map((t) => t.innerText))
  expect(a === 1 && b === 2 && rows.some((r) => r.includes('Transfer Out')) && rows.some((r) => r.includes('Transfer In')), `receipt ${a}, transfer ${b}`)
  await mgr.fill(LEDGER_SEARCH, 'WH/NOPE/999999')
  const none = await ledgerUiCount(mgr).catch(() => 0)
  await mgr.fill(LEDGER_SEARCH, '')
  return `${S.rcpt1.ref} → ${a} row; ${S.tr1.reference} → ${b} rows (Transfer Out + Transfer In); nonexistent → ${Number.isNaN(none) ? 0 : none}`
})
await test('LEDGER-004', 'Movement type filter (RECEIPT / DELIVERY / INTERNAL_TRANSFER / ADJUSTMENT)', mgr, async () => {
  const summary = (await apiGet(mgr, '/ledger/summary')).body.byMovementType
  const badge = { RECEIPT: 'Receipt', DELIVERY: 'Delivery', INTERNAL_TRANSFER: 'Internal Transfer', ADJUSTMENT: 'Inventory Adjustment' }
  const out = []
  for (const type of Object.keys(badge)) {
    await mgr.selectOption('#ledgerMovementType', type)
    const n = await ledgerUiCount(mgr)
    const rows = await mgr.$$eval('main table tbody tr', (trs) => trs.map((t) => t.innerText))
    expect(n === summary[type] && rows.every((r) => r.includes(badge[type])), `${type}: UI ${n} vs API ${summary[type]}`)
    out.push(`${type} ${n}`)
  }
  await mgr.selectOption('#ledgerMovementType', '')
  return out.join(', ') + ' — each = API, only that type shown'
})
await test('LEDGER-005', 'Date filter Today shows today\'s movements', mgr, async () => {
  const all = await ledgerUiCount(mgr)
  await mgr.selectOption('#ledgerDateRange', 'TODAY')
  const today = await ledgerUiCount(mgr)
  await mgr.selectOption('#ledgerDateRange', '')
  expect(today === all && today > 0, `today ${today}, all ${all}`)
  return `Today ${today} = All Time ${all}`
})
await test('LEDGER-006', 'Ledger is immutable (no edit/delete in UI or API)', mgr, async () => {
  const labels = await mgr.$$eval('main button, main a', (els) => els.map((e) => e.textContent.trim()))
  const risky = labels.filter((l) => /\b(edit|delete|remove)\b/i.test(l))
  const entry = (await apiGet(mgr, '/ledger?limit=1')).body.data[0]
  const patch = await apiRaw(mgr, 'PATCH', `/ledger/${entry.id}`, { quantity: 1 })
  const del = await apiRaw(mgr, 'DELETE', `/ledger/${entry.id}`)
  const post = await apiRaw(mgr, 'POST', '/ledger', { quantity: 1 })
  expect(risky.length === 0 && patch.status === 404 && del.status === 404 && post.status === 404, `buttons ${fmt(risky)}, PATCH ${patch.status}, DELETE ${del.status}, POST ${post.status}`)
  return 'no edit/delete controls on Move History; PATCH / DELETE / POST /ledger → 404 (no such routes; DB trigger also blocks UPDATE/DELETE)'
})
await test('LEDGER-PAGE', 'Move History pagination and inspector', mgr, async () => {
  const total = await ledgerUiCount(mgr)
  await mgr.click('main table tbody tr >> nth=0')
  await mgr.locator('#inspectorDrawer').waitFor({ state: 'visible' })
  const inspector = await mgr.textContent('#inspectorDrawer')
  expect(/WH\/(IN|OUT|TR|ADJ)\//.test(inspector) && inspector.includes('Performed By'), 'inspector does not show the entry')
  if (total <= 10) return `${total} movements (single page); inspector shows reference + Performed By`
  const first = (await mgr.$$eval('main table tbody tr', (trs) => trs.map((t) => t.innerText)))[0]
  await mgr.getByRole('button', { name: '2', exact: true }).click()
  await settle(mgr, 700)
  const second = (await mgr.$$eval('main table tbody tr', (trs) => trs.map((t) => t.innerText)))[0]
  expect(first !== second, 'page 2 identical to page 1')
  await mgr.getByRole('button', { name: '1', exact: true }).click()
  return `${total} movements; page 2 shows different rows; inspector shows reference + Performed By`
})

// ================================================================================================
// 27/28. DATA CONSISTENCY + LEDGER RECONCILIATION
// ================================================================================================
await test('RECON-001', 'Stock per product/location equals the sum of its ledger movements', mgr, async () => {
  const lines = []
  for (const p of PRODUCTS) {
    const s = await stock(mgr, p.key)
    for (const loc of ['rec', 'prod', 'disp']) {
      const net = (await ledger(mgr, `productId=${S.products[p.key]}&locationId=${S.locs[loc]}`)).reduce((a, e) => a + e.signedQuantity, 0)
      expect(Math.abs(net - s[loc]) < 1e-9, `${p.sku} @ ${loc}: ledger ${net} vs stock ${s[loc]}`)
      if (s[loc] || net) lines.push(`${p.sku}@${loc.toUpperCase()} ${s[loc]}`)
    }
  }
  await mgr.goto(APP + '/products')
  await settle(mgr)
  for (const p of PRODUCTS) {
    const s = await stock(mgr, p.key)
    const row = await mgr.textContent(await tagScope(mgr, '#productsTable tbody tr', p.sku))
    expect(row.includes(`${s.total.toLocaleString()} ${p.uom}`), `${p.sku} row "${row.slice(0, 80)}" vs ${s.total}`)
  }
  return `ledger net = stock for every product/location (${lines.join(', ')}); products page totals match`
})
await test('RECON-002', 'Expected final QA Steel: Receiving 55, Production 19, Dispatch 10 = 84 KG', mgr, async () => {
  // 100 − 30 (TR) − 5 (delivery DASH-005) − 10 (TR DASH-006) = 55 Receiving; 30 − 20 − 3 + 2 + 10 = 19 Production; 10 Dispatch
  const s = await stock(mgr, 'steel')
  expect(s.rec === 55 && s.prod === 19 && s.disp === 10 && s.total === 84, `stock ${fmt(s)}`)
  const c = await stock(mgr, 'copper')
  const b = await stock(mgr, 'bolts')
  expect(c.total === 5 && b.total === 0, `copper ${c.total}, bolts ${b.total}`)
  return `QA Steel Receiving 55 + Production 19 + Dispatch 10 = 84 KG (matches the arithmetic of every movement); QA Copper 5 KG; QA Bolts 0 PCS`
})

// ================================================================================================
// 25. NEGATIVE TESTS (manipulated requests the UI never sends)
// ================================================================================================
await test('NEG-001', 'Inactive product / inactive location cannot be used in documents', mgr, async () => {
  // Deactivate QA Bolts (no stock) through the product row menu, try it in a receipt, then reactivate
  await mgr.goto(APP + '/products')
  await settle(mgr)
  const row = await tagScope(mgr, '#productsTable tbody tr', 'QA-BOLTS-001')
  await mgr.locator(row).getByRole('button', { name: /more_horiz/ }).click()
  await clickButton(mgr, 'Deactivate', `#menu-row-${S.products.bolts}`)
  await waitFor(mgr, async () => (await apiGet(mgr, `/products/${S.products.bolts}`)).body.status === 'INACTIVE', 'product not deactivated')
  const rc = await apiRaw(mgr, 'POST', '/receipts', { supplierId: S.supplierId, warehouseId: S.warehouseId, locationId: S.locs.rec, items: [{ productId: S.products.bolts, quantity: 1 }] })
  const dl = await apiRaw(mgr, 'POST', '/deliveries', { customerId: S.customerId, warehouseId: S.warehouseId, sourceLocationId: S.locs.rec, items: [{ productId: S.products.bolts, quantity: 1 }] })
  await mgr.goto(APP + '/receipts/new')
  await settle(mgr)
  const offered = await mgr.evaluate(() => [...document.querySelectorAll('#productQuickSelect option')].some((o) => o.textContent.includes('QA-BOLTS-001')))
  await mgr.goto(APP + '/products')
  await settle(mgr)
  const row2 = await tagScope(mgr, '#productsTable tbody tr', 'QA-BOLTS-001')
  await mgr.locator(row2).getByRole('button', { name: /more_horiz/ }).click()
  await clickButton(mgr, 'Activate', `#menu-row-${S.products.bolts}`)
  await waitFor(mgr, async () => (await apiGet(mgr, `/products/${S.products.bolts}`)).body.status === 'ACTIVE', 'product not reactivated')
  // Inactive location: deactivate QA Dispatch Rack? It holds stock now → the backend must refuse
  const locOff = await apiRaw(mgr, 'PATCH', `/locations/${S.locs.disp}/status`, { status: 'INACTIVE' })
  expect(rc.status === 400 && dl.status === 400 && !offered, `receipt ${rc.status}, delivery ${dl.status}, offered ${offered}`)
  expect(locOff.status === 409, `deactivating a location that holds stock → ${locOff.status}`)
  return `QA Bolts deactivated via row menu: receipt → 400, delivery → 400, not offered on New Receipt; reactivated. Deactivating QA Dispatch Rack while it holds 10 KG → 409`
})
await test('NEG-002', 'Invalid supplier / location / cross-warehouse location / zero & negative quantities', mgr, async () => {
  const bad = '00000000-0000-4000-8000-000000000000'
  const base = { supplierId: S.supplierId, warehouseId: S.warehouseId, locationId: S.locs.rec, items: [{ productId: S.products.steel, quantity: 1 }] }
  const cases = {
    'receipt invalid supplier': await apiRaw(mgr, 'POST', '/receipts', { ...base, supplierId: bad }),
    'receipt invalid location': await apiRaw(mgr, 'POST', '/receipts', { ...base, locationId: bad }),
    'receipt location from another warehouse': await apiRaw(mgr, 'POST', '/receipts', { ...base, warehouseId: S.inactiveWarehouseId }),
    'receipt negative qty': await apiRaw(mgr, 'POST', '/receipts', { ...base, items: [{ productId: S.products.steel, quantity: -10 }] }),
    'delivery zero qty': await apiRaw(mgr, 'POST', '/deliveries', { customerId: S.customerId, warehouseId: S.warehouseId, sourceLocationId: S.locs.rec, items: [{ productId: S.products.steel, quantity: 0 }] }),
    'delivery invalid location': await apiRaw(mgr, 'POST', '/deliveries', { customerId: S.customerId, warehouseId: S.warehouseId, sourceLocationId: bad, items: [{ productId: S.products.steel, quantity: 1 }] }),
    'transfer invalid source': await apiRaw(mgr, 'POST', '/transfers', { sourceWarehouseId: S.warehouseId, sourceLocationId: bad, destinationWarehouseId: S.warehouseId, destinationLocationId: S.locs.prod, items: [{ productId: S.products.steel, quantity: 1 }] }),
    'transfer invalid destination': await apiRaw(mgr, 'POST', '/transfers', { sourceWarehouseId: S.warehouseId, sourceLocationId: S.locs.rec, destinationWarehouseId: S.warehouseId, destinationLocationId: bad, items: [{ productId: S.products.steel, quantity: 1 }] }),
    'adjustment invalid product': await apiRaw(mgr, 'POST', '/adjustments', { productId: bad, warehouseId: S.warehouseId, locationId: S.locs.rec, physicalQuantity: 1, reason: 'x' }),
    'adjustment invalid location': await apiRaw(mgr, 'POST', '/adjustments', { productId: S.products.steel, warehouseId: S.warehouseId, locationId: bad, physicalQuantity: 1, reason: 'x' }),
  }
  const failed = Object.entries(cases).filter(([, r]) => !(r.status >= 400 && r.status < 500))
  expect(failed.length === 0, `accepted: ${fmt(failed.map(([k, r]) => `${k} ${r.status}`))}`)
  return Object.entries(cases).map(([k, r]) => `${k} → ${r.status}`).join('; ')
})

// ================================================================================================
// 29. ROLES
// ================================================================================================
await test('ROLE-001', 'Warehouse Staff: manager-only controls hidden, forged requests refused', staff, async () => {
  await staff.goto(APP + '/warehouse')
  await settle(staff)
  const addWh = await buttonState(staff, 'Add Warehouse', 'body', false)
  await staff.goto(APP + '/adjustments')
  await settle(staff)
  const apply = await buttonState(staff, 'Apply', 'main table', true)
  await staff.goto(APP + '/products')
  await settle(staff)
  await staff.click('#btnManageCategories')
  await staff.locator('#categoriesDrawer').waitFor({ state: 'visible' })
  const catToggle = await staff.$('#categoriesDrawer [title="Deactivate category"]')
  const forged = {
    'create warehouse': await apiRaw(staff, 'POST', '/warehouses', { name: 'Staff WH', code: 'QA-STAFF-WH' }),
    'deactivate product': await apiRaw(staff, 'PATCH', `/products/${S.products.copper}/status`, { status: 'INACTIVE' }),
    'deactivate category': await apiRaw(staff, 'PATCH', `/categories/${S.categoryId}/status`, { status: 'INACTIVE' }),
    'apply adjustment': await apiRaw(staff, 'POST', `/adjustments/${S.adj1.id}/apply`),
    'add location': await apiRaw(staff, 'POST', `/warehouses/${S.warehouseId}/locations`, { name: 'Staff Rack', code: 'QA-STAFF-LOC' }),
  }
  const me = (await apiGet(staff, '/users/me')).body
  const allowed = await apiGet(staff, '/receipts?limit=1')
  expect(!addWh.found && !apply.found && !catToggle, `UI: add warehouse ${addWh.found}, apply ${apply.found}, category toggle ${Boolean(catToggle)}`)
  expect(Object.values(forged).every((r) => r.status === 403), `forged: ${fmt(Object.fromEntries(Object.entries(forged).map(([k, r]) => [k, r.status])))}`)
  expect(me.role === 'WAREHOUSE_STAFF' && allowed.status === 200, 'staff role/read access wrong')
  return `staff sees no Add Warehouse / Apply / category status controls; forged requests → ${Object.entries(forged).map(([k, r]) => `${k} ${r.status}`).join(', ')}; staff can read receipts (200)`
})
await test('ROLE-002', 'Warehouse Staff can perform operational work (create a receipt draft) — then cancel it', staff, async () => {
  await fillReceipt(staff, { supplierInline: false, location: 'QA Receiving Rack', sku: 'QA-COPPER-001', qty: 1 })
  const r = await saveReceiptDraft(staff)
  const x = (await apiGet(staff, `/receipts/${r.id}`)).body
  expect(x.createdBy.fullName === STAFF.name, `created by ${x.createdBy.fullName}`)
  await clickButton(staff, 'Cancel Receipt', 'body', { exact: false })
  await waitFor(staff, async () => (await apiGet(staff, `/receipts/${r.id}`)).body.status === 'CANCELED', 'not canceled')
  return `${r.ref} created by ${x.createdBy.fullName}, then canceled via "Cancel Receipt"`
})
await test('ROLE-003', 'Manager capabilities available', mgr, async () => {
  await mgr.goto(APP + '/warehouse')
  await settle(mgr)
  const addWh = await buttonState(mgr, 'Add Warehouse', 'body', false)
  await mgr.goto(APP + '/products')
  await settle(mgr)
  await mgr.click('#btnManageCategories')
  await mgr.locator(`#categoriesDrawer [data-category-name="${CAT.name}"]`).waitFor({ timeout: 10000 })
  const toggle = await mgr.locator('#categoriesDrawer [title="Deactivate category"]').count()
  expect(addWh.found && toggle > 0, `add warehouse ${addWh.found}, category toggles ${toggle}`)
  return 'manager sees Add Warehouse, category Deactivate, adjustment Apply (used in ADJ-002)'
})

// ================================================================================================
// 30/31/32. PERSISTENCE, NAVIGATION, SEARCH
// ================================================================================================
await test('PERSIST-001', 'Data persists across reloads and navigation', mgr, async () => {
  const checks = [
    ['/products', ['QA-STEEL-001', 'QA-COPPER-001', 'QA-BOLTS-001']],
    ['/warehouse', ['QA-WH-001']],
    ['/receipts', [S.rcpt1.ref, S.rcpt2.ref, S.rcpt3.ref]],
    ['/deliveries', [S.dl1.reference, S.dlShort.reference, S.dl2.reference]],
    ['/transfers', [S.tr1.reference, S.trShort.reference, S.tr2.reference]],
    ['/adjustments', [S.adj1.reference, S.adjStale.reference]],
    ['/move-history', [S.rcpt3.ref, S.tr2.reference]],
    ['/dashboard', ['QA Copper']],
  ]
  for (const [path, texts] of checks) {
    await mgr.goto(APP + path)
    await settle(mgr)
    await mgr.reload()
    await settle(mgr)
    for (const t of texts) await waitText(mgr, t).catch(() => { throw new Error(`${path}: "${t}" not shown after reload`) })
  }
  await mgr.goBack()
  await settle(mgr)
  return `after reload: ${checks.map(([p]) => p).join(', ')} all show their QA records; back navigation works`
})
await test('NAV-001', 'Main navigation: every item loads its page without errors', mgr, async () => {
  const items = [['Dashboard', '/dashboard'], ['Products', '/products'], ['Receipts', '/receipts'], ['Deliveries', '/deliveries'], ['Transfers', '/transfers'], ['Adjustments', '/adjustments'], ['Move History', '/move-history'], ['Warehouse', '/warehouse']]
  const visited = []
  for (const [label, path] of items) {
    await mgr.goto(APP + '/products')
    await settle(mgr, 400)
    await clickButton(mgr, label, 'nav', { exact: true }).catch(() => clickButton(mgr, label, 'header', { exact: true }))
    await mgr.waitForURL(`**${path}`, { timeout: 10000 })
    await settle(mgr, 400)
    visited.push(path)
  }
  await mgr.goto(APP + '/products')
  await settle(mgr)
  await mgr.click('[title="Profile"]')
  await mgr.waitForURL('**/profile', { timeout: 10000 })
  await waitText(mgr, MGR.email)
  await mgr.goBack()
  await mgr.waitForURL('**/products')
  return `nav → ${visited.join(', ')}; user badge → /profile (shows ${MGR.email}); back → /products`
})
await test('SEARCH-001', 'List searches: exact, partial, nonexistent, cleared, combined with a filter', mgr, async () => {
  await mgr.goto(APP + '/receipts')
  await settle(mgr)
  await mgr.fill('#receiptsSearchInput', S.rcpt1.ref)
  await settle(mgr, 800)
  const exact = await mgr.$$eval('#receiptsTableBody tr', (t) => t.length)
  await mgr.fill('#receiptsSearchInput', 'WH/IN')
  await settle(mgr, 800)
  const partial = await mgr.$$eval('#receiptsTableBody tr', (t) => t.length)
  await mgr.selectOption('#receiptFilterStatus', 'DONE')
  await settle(mgr, 800)
  const combined = await mgr.$$eval('#receiptsTableBody tr', (t) => t.map((r) => r.innerText))
  await mgr.fill('#receiptsSearchInput', 'NO-SUCH-REF')
  await settle(mgr, 800)
  const none = (await bodyText(mgr)).match(/No receipts[^\n]*/)?.[0]
  await mgr.fill('#receiptsSearchInput', '')
  await mgr.selectOption('#receiptFilterStatus', '')
  const doneApi = (await apiGet(mgr, '/receipts?status=DONE&search=WH%2FIN')).body.pagination.total
  expect(exact === 1 && partial >= 3 && combined.length === doneApi && combined.every((r) => /Done/i.test(r)) && none, `exact ${exact}, partial ${partial}, combined ${combined.length}/${doneApi}, none "${none}"`)
  await mgr.goto(APP + '/adjustments')
  await settle(mgr)
  await mgr.fill('#reconciliationSearch', 'QA-BOLTS')
  await settle(mgr, 800)
  const adjRows = await mgr.$$eval('main table tbody tr', (t) => t.map((r) => r.innerText))
  expect(adjRows.length === 1 && adjRows[0].includes('QA Bolts'), `adjustment search rows ${adjRows.length}`)
  return `receipts: exact ref → ${exact}, "WH/IN" → ${partial}, + status DONE → ${combined.length} (= API), nonexistent → "${none}"; adjustments "QA-BOLTS" → 1`
})

// ================================================================================================
const counts = writeReport({ app: APP, started, finished: new Date(), accounts: [MGR.email, STAFF.email] })
await browser.close()
process.exitCode = counts.FAIL ? 1 : 0
