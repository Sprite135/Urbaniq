import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from './layouts/MainLayout';
// import SeoHead from './components/SeoHead'; // Temporarily disabled - React 19 compatibility issue

// Lazy load components for code splitting
const Home = lazy(() => import('./features/catalog/Home'));
const ProductListPage = lazy(() => import('./features/catalog/ProductListPage'));
const ProductDetailPage = lazy(() => import('./features/catalog/ProductDetailPage'));
const CartPage = lazy(() => import('./features/cart/CartPage'));
const CheckoutPage = lazy(() => import('./features/checkout/CheckoutPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/ForgotPasswordPage'));
const VerifyEmailPage = lazy(() => import('./features/auth/VerifyEmailPage'));
const UserRoute = lazy(() => import('./features/auth/UserRoute'));
const AccountPage = lazy(() => import('./features/account/AccountPage'));
const ProfilePage = lazy(() => import('./features/account/ProfilePage'));
const OrdersPage = lazy(() => import('./features/orders/OrdersPage'));
const OrderDetailPage = lazy(() => import('./features/orders/OrderDetailPage'));
const WishlistPage = lazy(() => import('./features/wishlist/WishlistPage'));
const AdminRoute = lazy(() => import('./features/admin/AdminRoute'));
const AdminLayout = lazy(() => import('./features/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./features/admin/AdminDashboardPage'));
const ProductManagementPage = lazy(() => import('./features/admin/ProductManagementPage'));
const ProductFormPage = lazy(() => import('./features/admin/ProductFormPage'));
const AdminProductDetailPage = lazy(() => import('./features/admin/AdminProductDetailPage'));
const OrderManagementPage = lazy(() => import('./features/admin/OrderManagementPage'));
const AdminOrderDetailPage = lazy(() => import('./features/admin/AdminOrderDetailPage'));
const CategoryManagementPage = lazy(() => import('./features/admin/CategoryManagementPage'));
const CouponManagementPage = lazy(() => import('./features/admin/CouponManagementPage'));
const CouponAnalyticsPage = lazy(() => import('./features/admin/CouponAnalyticsPage'));
const UserManagementPage = lazy(() => import('./features/admin/UserManagementPage'));
const AdminLoginPage = lazy(() => import('./features/admin/AdminLoginPage'));

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d7b46a] border-t-transparent mx-auto"></div>
      <p className="mt-4 text-[#111827] dark:text-[#ece7dd]">Cargando...</p>
    </div>
  </div>
);

function App() {
  return (
    <>
      {/* <SeoHead /> */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Storefront Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="catalog" element={<ProductListPage />} />
            <Route path="product/:slug" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />

            <Route element={<UserRoute />}>
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
            </Route>
          </Route>

          {/* Admin Routes — protected by AdminRoute (requires Admin role) */}
          <Route path="/admin-login" element={<AdminLoginPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="products" element={<ProductManagementPage />} />
              <Route path="products/new" element={<ProductFormPage />} />
              <Route path="products/:id/edit" element={<ProductFormPage />} />
              <Route path="products/:productId" element={<AdminProductDetailPage />} />
              <Route path="orders" element={<OrderManagementPage />} />
              <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
              <Route path="categories" element={<CategoryManagementPage />} />
              <Route path="coupons" element={<CouponManagementPage />} />
              <Route path="coupons/analytics" element={<CouponAnalyticsPage />} />
              <Route path="users" element={<UserManagementPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <ToastContainer position="top-right" autoClose={2500} newestOnTop />
    </>
  );
}

export default App;

