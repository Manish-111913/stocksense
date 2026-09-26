# StockSense E2E Test Report

```text
Environment:
Frontend: http://localhost:5173 (Vite dev server, real browser: Microsoft Edge via Playwright)
Backend:  http://localhost:4100/api (NestJS, proxied by the frontend at /api)
Database: PostgreSQL 17 (Docker container stocksense-db, database "stocksense") — real database, QA data kept
Run:      2026-09-26T08:43:38.138Z → 2026-09-26T08:47:37.528Z

Total Tests: 83
Passed:      83
Failed:      0
Fixed:       5 (found while preparing the run, fixed and verified before the final run — see "Failures found and fixed")
Blocked:     0

ENVIRONMENT & BASELINE               PASS (2/2)
AUTH                                 PASS (6/6)
CATEGORIES                           PASS (4/4)
PRODUCTS                             PASS (8/8)
WAREHOUSES                           PASS (4/4)
LOCATIONS                            PASS (5/5)
INVENTORY                            PASS (1/1)
RECEIPTS                             PASS (4/4)
TRANSFERS                            PASS (4/4)
DELIVERIES                           PASS (7/7)
ADJUSTMENTS                          PASS (6/6)
END-TO-END SCENARIO (section 38)     PASS (1/1)
DASHBOARD                            PASS (7/7)
DASHBOARD FILTERS & PAGINATION       PASS (7/7)
LEDGER                               PASS (7/7)
DATA CONSISTENCY                     PASS (2/2)
NEGATIVE TESTS                       PASS (2/2)
ROLE SECURITY                        PASS (3/3)
REFRESH / PERSISTENCE                PASS (1/1)
NAVIGATION                           PASS (1/1)
SEARCH / FILTERS                     PASS (1/1)
```

## Test accounts (kept)

| Role | Name | Email | Password |
|---|---|---|---|
| INVENTORY_MANAGER | QA Inventory Manager | qa.inventory.manager@example.com | Qa@2026StockSense! |
| WAREHOUSE_STAFF | QA Warehouse Staff | qa.warehouse.staff@example.com | Qa@2026StockSense! |

## Every test with evidence

Screenshots: `screenshots/<Test ID>.png` (taken at the end of each test).

### ENVIRONMENT & BASELINE

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| ENV-001 | Discover the running application (login page, API health) | **PASS** | frontend http://localhost:5173 → unauthenticated /dashboard redirects to /login; API docs via proxy 200 |
| BASE-001 | Record baseline dashboard values (UI and API) | **PASS** | UI {"inStock":0,"risk":0,"low":0,"out":0,"receipts":0,"deliveries":0,"transfers":0}; API totalProducts=0; ledger movements=0 |

### AUTH

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| AUTH-SETUP-1 | Create QA Inventory Manager via Sign Up (first account = INVENTORY_MANAGER) | **PASS** | created; /users/me → QA Inventory Manager <qa.inventory.manager@example.com> role INVENTORY_MANAGER; landed on /dashboard |
| AUTH-SETUP-2 | Create QA Warehouse Staff via Sign Up (later accounts = WAREHOUSE_STAFF) | **PASS** | created; role WAREHOUSE_STAFF; signup request with role=INVENTORY_MANAGER rejected (400) |
| AUTH-004 | Logout from Profile, protected pages need auth afterwards | **PASS** | Confirm Log Out → /login; session cleared; /dashboard redirects to /login; API 401 |
| AUTH-002 | Invalid password is rejected with a meaningful message | **PASS** | alert: "Invalid email or password"; still on /login; not authenticated |
| AUTH-003 | Unknown email fails safely (no crash, no internals, no account enumeration) | **PASS** | alert: "Invalid email or password" (identical to wrong-password message); still on /login |
| AUTH-001 | Login with valid credentials → Dashboard with navigation | **PASS** | redirected to /dashboard; nav shows Dashboard/Products/Receipts/Deliveries/Transfers/Adjustments/Warehouse/Move History; badge shows QA Inventory Manager |

### CATEGORIES

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| CAT-001 | Create category "QA Raw Materials" with description | **PASS** | toast "Category created"; listed in drawer + #filterCategory; API status ACTIVE, description saved |
| CAT-002 | Duplicate category name is rejected | **PASS** | error: "A category with this name already exists"; still exactly 1 category |
| CAT-003 | Edit category description, persists after refresh | **PASS** | description now "Test category for StockSense end-to-end validation (updated by QA)" in UI after reload and in API |
| CAT-004 | Deactivate category (hidden from new products), then reactivate | **PASS** | Deactivate → Inactive (not offered on Add Product) → Activate → Active |

### PRODUCTS

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| PROD-C-steel | Create product QA Steel (QA-STEEL-001) | **PASS** | detail page: QA Steel / QA-STEEL-001 / categoryQA Raw Materials / KG (Kilograms) / reorder 20 KG / Active; listed on /products |
| PROD-C-copper | Create product QA Copper (QA-COPPER-001) | **PASS** | detail page: QA Copper / QA-COPPER-001 / categoryQA Raw Materials / KG (Kilograms) / reorder 10 KG / Active; listed on /products |
| PROD-C-bolts | Create product QA Bolts (QA-BOLTS-001) | **PASS** | detail page: QA Bolts / QA-BOLTS-001 / categoryQA Raw Materials / PCS (Pieces) / reorder 5 PCS / Active; listed on /products |
| PROD-001 | Duplicate SKU QA-STEEL-001 is rejected | **PASS** | error: " SKU QA-STEEL-001 already exists"; still 1 product with SKU QA-STEEL-001 |
| PROD-002 | Search "QA Steel" shows only matching products | **PASS** | 1 row(s), all "QA Steel" |
| PROD-003 | Search by SKU QA-STEEL-001 | **PASS** | exactly 1 row (QA-STEEL-001); nonexistent SKU → "No products match your filters"; cleared |
| PROD-004 | Negative reorder level is rejected (UI and API) | **PASS** | UI field normalised -5 → "0"; API POST reorderLevel -5 → 400 (["reorderLevel must not be less than 0"]) |
| PROD-N01 | Empty product name / invalid category are rejected | **PASS** | name  " Product name is required."; invalid category → 400 "Category not found" |

### WAREHOUSES

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| WH-C01 | Create warehouse QA Main Warehouse (QA-WH-001) | **PASS** | row shows QA Main Warehouse / QA-WH-001 / Active; API id 3e574b50 |
| WH-001 | Duplicate warehouse code is rejected | **PASS** |  "New FacilityAdd WarehousecloseWarehouse NameWarehouse Codeerror Warehouse code QA-WH-001 already existsAddress / Notes (optional)CancelCreate Warehouse"; still 1 warehouse |
| WH-N01 | Warehouse with empty name is rejected | **PASS** | form stayed open with validation (New FacilityAdd WarehousecloseWarehouse Nameerror Warehouse name is required); nothing created |
| WH-002 | Deactivated warehouse cannot be used for new documents | **PASS** | QA-WH-TMP → Inactive; New Receipt warehouse options: ["Select warehouse...","QA Main Warehouse (QA-WH-001)"] |

### LOCATIONS

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| LOC-C-rec | Create location QA Receiving Rack (QA-REC-001) | **PASS** | listed under QA Main Warehouse as QA Receiving Rack / QA-REC-001 / Active |
| LOC-C-prod | Create location QA Production Rack (QA-PROD-001) | **PASS** | listed under QA Main Warehouse as QA Production Rack / QA-PROD-001 / Active |
| LOC-C-disp | Create location QA Dispatch Rack (QA-DISP-001) | **PASS** | listed under QA Main Warehouse as QA Dispatch Rack / QA-DISP-001 / Active |
| LOC-001 | Duplicate location code in the same warehouse is rejected | **PASS** | duplicate rejected, still 1 QA-REC-001; location for a nonexistent warehouse → 404 |
| LOC-002 | Locations appear under the correct warehouse | **PASS** | inspector for QA Main Warehouse lists QA-REC-001, QA-PROD-001, QA-DISP-001; API agrees |

### INVENTORY

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| INV-001 | Inventory baseline for the new QA products (all 0) | **PASS** | QA-STEEL-001=0, QA-COPPER-001=0, QA-BOLTS-001=0 (UI rows show 0 + Out of Stock) |

### RECEIPTS

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| RECEIPT-004 | Receipt quantity 0 and -10 are rejected | **PASS** | supplier created inline with email/phone; 0: "Every line needs a received quantity greater than 0 (up to 3 decimals)."; -10: "Every line needs a received quantity greater than 0 (up to 3 decimals)."; API qty 0 → 400 |
| RECEIPT-001 | Create receipt: QA Steel 100 KG → QA Receiving Rack | **PASS** | reference WH/IN/000001; badge "Draft"; 1 line QA Steel × 100; pending receipts 0 → 1 |
| RECEIPT-002 | Validate receipt → DONE, stock +100, ledger RECEIPT entry | **PASS** | status DONE; QA Steel 0 → 100 KG (Receiving 100); ledger RECEIPT IN 100 (0 → 100) by QA Inventory Manager; products + move history show it; pending receipts back to 0 |
| RECEIPT-003 | Validating the DONE receipt again does not move stock twice | **PASS** | no Validate button on the DONE receipt; forced repeat request → 200 alreadyCompleted, stockChanges []; stock still 100, 1 ledger row |

### TRANSFERS

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| TRANSFER-004 | Same source and destination location is rejected | **PASS** | warning "Source and destination locations cannot be identical. Please pick distinct internal locations."; Save Draft disabled; API → 400 SOURCE_DESTINATION_SAME |
| TRANSFER-001 | Create transfer QA Steel 30 KG: Receiving → Production | **PASS** | WH/TR/000001 DRAFT, QA Receiving Rack → QA Production Rack, 30 KG; scheduled transfers 0 → 1 |
| TRANSFER-002 | Confirm + validate transfer: Receiving 70, Production 30, total unchanged, 2 ledger rows | **PASS** | DONE; Receiving 100 → 70, Production 0 → 30, total 100; ledger OUT QA-REC-001 (100→70) + IN QA-PROD-001 (0→30) both WH/TR/000001; scheduled back to 0 |
| TRANSFER-003 | Transfer of 1000 KG (insufficient stock) cannot move stock | **PASS** | WH/TR/000002 → WAITING ("Short: 1 line26 Sept 2026by QA Inventory ManagerinventoryCheck Availabilityblock"), no Validate button; forced validate → 409 "Transfer WH/TR/000002 is WAITING. Only READY transfers can be validated."; stock + ledger unchanged; then canceled via UI |

### DELIVERIES

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| DELIVERY-N01 | Delivery quantity 0 and -5 are rejected | **PASS** | customer created inline with email/phone; quantities 0, -5 → "Every line needs a quantity greater than 0" |
| DELIVERY-001 | Create delivery QA Steel 20 KG from QA Production Rack | **PASS** | WH/OUT/000001 "Draft", QA Steel × 20 KG; pending deliveries 0 → 1 |
| DELIVERY-002 | Confirm + Pick: picked recorded, stock NOT decreased | **PASS** | status "Ready"; picked by QA Inventory Manager at 2026-09-26T08:44:37.801Z; Production still 30 |
| DELIVERY-003 | Pack: packed recorded, stock still unchanged | **PASS** | status "Ready"; packed by QA Inventory Manager at 2026-09-26T08:44:37.994Z; Production still 30 |
| DELIVERY-004 | Validate delivery → DONE, Production 30 → 10, ledger OUT 20 | **PASS** | DONE ("Done"); Production 30 → 10; ledger DELIVERY OUT 20 (30→10); pending deliveries back to 0 |
| DELIVERY-006 | Validating the DONE delivery again does not deduct twice | **PASS** | no Validate button on DONE; forced repeat → 200 alreadyCompleted; stock unchanged; still 1 ledger row |
| DELIVERY-005 | Delivery larger than available stock is blocked | **PASS** | WH/OUT/000002 → WAITING (short 490 KG), no Pick/Validate; forced validate → 409; stock + ledger unchanged; canceled via "Cancel Order" |

### ADJUSTMENTS

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| ADJ-005 | Negative physical quantity -5 is rejected | **PASS** | UI: "Enter a count of 0 or more."; API physicalQuantity -5 → 400; nothing created |
| ADJ-001 | Create adjustment: Production recorded 10 (backend), physical 7 → difference -3 | **PASS** | WH/ADJ/000001 READY; modal showed recorded "RECORDED (SYSTEM) 10 KG PHYSICAL COUNT *", diff "RECORDED (SYSTEM) 10 KG PHYSIC"; API recorded 10 / physical 7 / difference -3 (client-sent recorded/difference rejected 400) |
| ADJ-002 | Apply adjustment → Production 7, ledger ADJUSTMENT_OUT 3 (10 → 7) | **PASS** | DONE (row "Applied"); Production 10 → 7; total 77; ledger ADJUSTMENT_OUT 3 (10→7) |
| ADJ-003 | Positive adjustment: recorded 7, physical 9 → +2, ADJUSTMENT_IN 2 | **PASS** | WH/ADJ/000002: recorded 7, physical 9, difference +2 → applied; Production 9; ledger ADJUSTMENT_IN 2 (7→9) |
| ADJ-004 | Zero physical quantity is accepted (QA Bolts at Dispatch Rack: 0 → 0, no ledger row) | **PASS** | WH/ADJ/000003: 0 counted accepted, applied → DONE; no ledger row (nothing moved) |
| ADJ-CONC | Stale adjustment (stock changed by a receipt) is rejected, stock not overwritten | **PASS** | WH/ADJ/000004 recorded 9; receipt WH/IN/000002 +10 → Production 19; row "Stale", modal "Stock changed since this count was recorded — now 19 KG.", Apply disabled; forced apply → 409 STOCK_CHANGED_SINCE_ADJUSTMENT; stock stays 19, no ledger row; adjustment canceled via UI |

### END-TO-END SCENARIO (section 38)

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| E2E-SCENARIO | Scenario checkpoint: Receiving 70, Production 7, total 77; ledger sequence; dashboard | **PASS** | Receiving 70 + Production 7 = 77 KG (UI + API); ledger RECEIPT:IN:100, INTERNAL_TRANSFER:IN:30, INTERNAL_TRANSFER:OUT:-30, DELIVERY:OUT:-20, ADJUSTMENT:ADJUSTMENT_OUT:-3 (net 77); Move History 5 rows; dashboard in-stock 1, low 0, out 2 |

### DASHBOARD

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| DASH-004 | Pending receipts: +1 when a receipt is created, -1 when validated (QA Copper 5 KG) | **PASS** | WH/IN/000003: Pending Receipts card 0 → 1 (draft) → 0 (validated) |
| DASH-005 | Pending deliveries: +1 when created, -1 when completed | **PASS** | WH/OUT/000003 (QA Steel 5 KG from Receiving, via list buttons Confirm/Pick/Pack/Validate): Pending Deliveries card 0 → 1 → 0 |
| DASH-006 | Scheduled transfers: +1 when created, -1 when validated | **PASS** | WH/TR/000003 (QA Steel 10 KG Receiving → Dispatch): Internal Transfers card 0 → 1 → 0 |
| DASH-001 | Total Products in Stock = distinct products with stock > 0 | **PASS** | In Stock SKUs card 2 = API 2 = products with stock > 0 (QA-COPPER-001 5, QA-STEEL-001 84) |
| DASH-002 | Low stock uses reorder levels (QA Copper 5 ≤ 10; QA Steel 19 ≤ 20 at Production) | **PASS** | Low chip 1 = API 1 = computed; QA Copper card "Low" (5 ≤ 10); Production-rack scope: QA Steel 19 ≤ 20 shown Low (scoped lowStock 1) |
| DASH-003 | Out of stock: QA Bolts (0) is counted and listed | **PASS** | Depleted chip 1 = products with 0 stock (1); QA Bolts card "Out of Stock" |
| DASH-KPI | All required KPI cards present and consistent with the API | **PASS** | cards: In Stock SKUs 2, Inventory Risk 2 (1 Low / 1 Depleted), Pending Receipts 0, Pending Deliveries 0, Internal Transfers 0 — all equal the API |

### DASHBOARD FILTERS & PAGINATION

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| DASH-F-WH | Filter: warehouse QA Main Warehouse | **PASS** | operations table 13 rows = API 13; warehouse KPIs in stock 2, low 1, out 1 |
| DASH-F-LOC | Filter: location QA Production Rack | **PASS** | 8 rows, every row involves QA Production Rack (= API) |
| DASH-F-CAT | Filter: category QA Raw Materials | **PASS** | 13 rows (= API); category KPIs: 3 products, 2 in stock, 1 low, 1 out |
| DASH-F-TYPE | Filter: document type tabs Receipts / Delivery / Internal / Adjustments | **PASS** | RECEIPT 3, DELIVERY 3, INTERNAL_TRANSFER 3, ADJUSTMENT 4 — each equals the API, rows only of that type |
| DASH-F-STATUS | Filter: status DRAFT / WAITING / READY / DONE / CANCELED | **PASS** | DRAFT 0, WAITING 0, READY 0, DONE 10, CANCELED 3 (each = API) |
| DASH-F-DATE | Filter: date range Today contains all QA operations | **PASS** | All Time 13, Today 13, Last 30 Days 13 |
| DASH-PAGE | Operations table pagination (10 per page) | **PASS** | 13 operations: page 1 = 10 rows, Next → 3 rows, Previous → page 1 |

### LEDGER

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| LEDGER-001 | Search "QA Steel" | **PASS** | 10 QA Steel movements (= API), every row is QA Steel |
| LEDGER-002 | Search by SKU QA-STEEL-001 | **PASS** | 10 rows = all ledger entries of QA Steel |
| LEDGER-003 | Search by reference (receipt → 1 row, transfer → 2 rows) | **PASS** | WH/IN/000001 → 1 row; WH/TR/000001 → 2 rows (Transfer Out + Transfer In); nonexistent → 0 |
| LEDGER-004 | Movement type filter (RECEIPT / DELIVERY / INTERNAL_TRANSFER / ADJUSTMENT) | **PASS** | RECEIPT 3, DELIVERY 2, INTERNAL_TRANSFER 4, ADJUSTMENT 2 — each = API, only that type shown |
| LEDGER-005 | Date filter Today shows today's movements | **PASS** | Today 11 = All Time 11 |
| LEDGER-006 | Ledger is immutable (no edit/delete in UI or API) | **PASS** | no edit/delete controls on Move History; PATCH / DELETE / POST /ledger → 404 (no such routes; DB trigger also blocks UPDATE/DELETE) |
| LEDGER-PAGE | Move History pagination and inspector | **PASS** | 11 movements; page 2 shows different rows; inspector shows reference + Performed By |

### DATA CONSISTENCY

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| RECON-001 | Stock per product/location equals the sum of its ledger movements | **PASS** | ledger net = stock for every product/location (QA-STEEL-001@REC 55, QA-STEEL-001@PROD 19, QA-STEEL-001@DISP 10, QA-COPPER-001@REC 5); products page totals match |
| RECON-002 | Expected final QA Steel: Receiving 55, Production 19, Dispatch 10 = 84 KG | **PASS** | QA Steel Receiving 55 + Production 19 + Dispatch 10 = 84 KG (matches the arithmetic of every movement); QA Copper 5 KG; QA Bolts 0 PCS |

### NEGATIVE TESTS

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| NEG-001 | Inactive product / inactive location cannot be used in documents | **PASS** | QA Bolts deactivated via row menu: receipt → 400, delivery → 400, not offered on New Receipt; reactivated. Deactivating QA Dispatch Rack while it holds 10 KG → 409 |
| NEG-002 | Invalid supplier / location / cross-warehouse location / zero & negative quantities | **PASS** | receipt invalid supplier → 400; receipt invalid location → 400; receipt location from another warehouse → 400; receipt negative qty → 400; delivery zero qty → 400; delivery invalid location → 400; transfer invalid source → 400; transfer invalid destination → 400; adjustment invalid product → 400; adjustment invalid location → 400 |

### ROLE SECURITY

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| ROLE-001 | Warehouse Staff: manager-only controls hidden, forged requests refused | **PASS** | staff sees no Add Warehouse / Apply / category status controls; forged requests → create warehouse 403, deactivate product 403, deactivate category 403, apply adjustment 403, add location 403; staff can read receipts (200) |
| ROLE-002 | Warehouse Staff can perform operational work (create a receipt draft) — then cancel it | **PASS** | WH/IN/000004 created by QA Warehouse Staff, then canceled via "Cancel Receipt" |
| ROLE-003 | Manager capabilities available | **PASS** | manager sees Add Warehouse, category Deactivate, adjustment Apply (used in ADJ-002) |

### REFRESH / PERSISTENCE

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| PERSIST-001 | Data persists across reloads and navigation | **PASS** | after reload: /products, /warehouse, /receipts, /deliveries, /transfers, /adjustments, /move-history, /dashboard all show their QA records; back navigation works |

### NAVIGATION

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| NAV-001 | Main navigation: every item loads its page without errors | **PASS** | nav → /dashboard, /products, /receipts, /deliveries, /transfers, /adjustments, /move-history, /warehouse; user badge → /profile (shows qa.inventory.manager@example.com); back → /products |

### SEARCH / FILTERS

| Test ID | Test | Result | Evidence (observed) |
|---|---|---|---|
| SEARCH-001 | List searches: exact, partial, nonexistent, cleared, combined with a filter | **PASS** | receipts: exact ref → 1, "WH/IN" → 4, + status DONE → 3 (= API), nonexistent → "No receipts match your filters"; adjustments "QA-BOLTS" → 1 |

## Failures found and fixed

These were found while mapping the UI against the QA specification, before the final run. Each was fixed, and the related tests were then run twice: on a throwaway database, then on the real application. All tests passed.

### FIX-1: Categories could not be edited, deactivated or given a description
- **Test IDs:** CAT-001, CAT-003, CAT-004
- **Problem:** The UI had no category management. The inline "New Category" form on Add Product only sent a name.
- **Steps to reproduce:** Products → look for a way to edit a category's description or deactivate it.
- **Expected:** Create a category with a description, edit it, and deactivate/reactivate it.
- **Actual:** Not possible in the UI. The backend endpoints existed, but no page called them.
- **Root cause:** Frontend. `updateCategory` / `setCategoryStatus` were defined in `src/api/products.ts` but never used.
- **Files changed:**
  - `frontend/src/pages/products/components/CategoriesDrawer.tsx` (new)
  - `frontend/src/pages/products/ProductsListPage.tsx`
  - `frontend/src/pages/products/AddProductPage.tsx`
- **Fix:**
  - A new "Categories" button on Products opens a drawer. It lists all categories and supports create (name + description), inline edit, and Activate/Deactivate for managers only.
  - The drawer keeps the category filter in sync.
  - The inline category form now has a description field.
- **Retest result:** CAT-001 to CAT-004 PASS. ROLE-001 (staff sees no status toggle) and ROLE-003 PASS.

### FIX-2: Supplier and customer email and phone could not be entered
- **Test IDs:** RECEIPT-004 (supplier), DELIVERY-N01 (customer)
- **Problem:** The inline "New Supplier" and "New Customer" forms only had name and code.
- **Expected:** QA-SUP-001 and QA-CUST-001 are created with email and phone.
- **Actual:** No fields for them.
- **Root cause:** Frontend forms were missing fields the backend DTOs already accept.
- **Files changed:**
  - `frontend/src/pages/receipts/NewReceiptPage.tsx`
  - `frontend/src/pages/deliveries/components/NewDeliveryView.tsx`
- **Fix:** Optional email and phone inputs, using the same validation rules as the backend.
- **Retest result:** The supplier and customer were saved with email and phone (verified through the API). PASS.

### FIX-3: Move History was missing from the main navigation
- **Test ID:** NAV-001
- **Problem:** The app shell and Dashboard nav had no Move History item.
- **Root cause:** Frontend navigation configuration.
- **Files changed:**
  - `frontend/src/layouts/AppLayout.tsx`
  - `frontend/src/pages/dashboard/data.ts`
- **Fix:** Added "Move History" to the nav tabs and the dock.
- **Retest result:** NAV-001 PASS; AUTH-001 confirms the item is visible.

### FIX-4: Logout could not be reached from Products, Receipts, Deliveries, Transfers or Adjustments
- **Test IDs:** AUTH-004, NAV-001
- **Problem:** The header user badge on these pages was not clickable. Logout is on the Profile page, so it could only be reached through the Dashboard.
- **Root cause:** Frontend. The badge had no handler.
- **Files changed:**
  - `frontend/src/layouts/AppLayout.tsx`
  - `frontend/src/pages/warehouse/WarehouseHeader.tsx`
  - `frontend/src/pages/profile/ProfileHeader.tsx`
  - `frontend/src/pages/dashboard/DashboardHeader.tsx`
- **Fix:** The badge opens Profile on click, Enter or Space.
- **Retest result:** NAV-001 PASS (badge → /profile); AUTH-004 PASS (logout).

### FIX-5: Two backend servers competing for port 4100 (environment)
- **Found:** Checking the backend logs after the run.
- **Problem:** Two `npm run start:dev` watchers were running. On every code change the second one failed with `EADDRINUSE :4100`, so an older build could have kept serving.
- **Root cause:** Environment. A duplicate dev server was started earlier in the session. It was not an application defect, and there were no application errors in the logs.
- **Fix:** Stopped both and started one clean watcher. Verified the API (401 without a token) and a QA manager login through the frontend.

### Not counted as failures
The first rehearsal on the throwaway database hit 5 bugs in the test script itself. These were wrong response-shape assumptions, a doubled query parameter, and two timing issues. They were fixed in `scripts/qa-e2e.mjs` and were not application defects.
