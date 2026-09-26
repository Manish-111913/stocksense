import { Navigate, Route, Routes } from 'react-router'
import { GuestOnly, RequireAuth } from './auth/RouteGuards.tsx'
import { AuthFlowProvider } from './context/AuthFlowProvider.tsx'
import AppLayout from './layouts/AppLayout.tsx'
import AuthLayout from './layouts/AuthLayout.tsx'
import AdjustmentsPage from './pages/adjustments/AdjustmentsPage.tsx'
import DashboardPage from './pages/dashboard/DashboardPage.tsx'
import DeliveriesPage from './pages/deliveries/DeliveriesPage.tsx'
import MoveHistoryPage from './pages/move-history/MoveHistoryPage.tsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx'
import AddProductPage from './pages/products/AddProductPage.tsx'
import ProductDetailPage from './pages/products/ProductDetailPage.tsx'
import ProductsListPage from './pages/products/ProductsListPage.tsx'
import NewReceiptPage from './pages/receipts/NewReceiptPage.tsx'
import ReceiptsPage from './pages/receipts/ReceiptsPage.tsx'
import ProfilePage from './pages/profile/ProfilePage.tsx'
import ResetPasswordPage from './pages/ResetPasswordPage.tsx'
import SignInPage from './pages/SignInPage.tsx'
import SignUpPage from './pages/SignUpPage.tsx'
import TransfersPage from './pages/transfers/TransfersPage.tsx'
import VerifyOtpPage from './pages/VerifyOtpPage.tsx'
import WarehousePage from './pages/warehouse/WarehousePage.tsx'
import { ROUTES } from './routes.ts'

export default function App() {
  return (
    <AuthFlowProvider>
      <Routes>
        <Route
          element={
            <GuestOnly>
              <AuthLayout />
            </GuestOnly>
          }
        >
          <Route element={<SignUpPage />} path={ROUTES.signup} />
          <Route element={<SignInPage />} path={ROUTES.login} />
          <Route element={<ForgotPasswordPage />} path={ROUTES.forgotPassword} />
          <Route element={<VerifyOtpPage />} path={ROUTES.verifyOtp} />
          <Route element={<ResetPasswordPage />} path={ROUTES.resetPassword} />
        </Route>
        <Route element={<RequireAuth><DashboardPage /></RequireAuth>} path={ROUTES.dashboard} />
        <Route element={<RequireAuth><MoveHistoryPage /></RequireAuth>} path={ROUTES.moveHistory} />
        <Route element={<RequireAuth><WarehousePage /></RequireAuth>} path={ROUTES.warehouse} />
        <Route element={<RequireAuth><ProfilePage /></RequireAuth>} path={ROUTES.profile} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route element={<ProductsListPage />} path={ROUTES.products} />
          <Route element={<AddProductPage />} path={ROUTES.productNew} />
          <Route element={<ProductDetailPage />} path="/products/:id" />
          <Route element={<ReceiptsPage />} path={ROUTES.receipts} />
          <Route element={<NewReceiptPage />} path={ROUTES.receiptNew} />
          <Route element={<DeliveriesPage />} path={ROUTES.deliveries} />
          <Route element={<TransfersPage />} path={ROUTES.transfers} />
          <Route element={<AdjustmentsPage />} path={ROUTES.adjustments} />
        </Route>
        {/* Sign In is the initial view */}
        <Route element={<Navigate replace to={ROUTES.login} />} path="*" />
      </Routes>
    </AuthFlowProvider>
  )
}
