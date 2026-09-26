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
