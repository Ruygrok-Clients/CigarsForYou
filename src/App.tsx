import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AgeGateProvider } from './context/AgeGateContext';
import { ToastProvider } from './components/Toast';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AgeGateModal } from './components/AgeGateModal';
import { LoadingScreen } from './components/LoadingScreen';
import { ScrollToTop } from './components/ScrollToTop';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CigarettesPage } from './pages/CigarettesPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LegalPage } from './pages/LegalPage';
import { AgeRestrictedPage } from './pages/AgeRestrictedPage';

// Admin Portal Imports
import { AdminContextProvider } from './pages/admin/AdminContext';
import { AdminGuard } from './pages/admin/AdminGuard';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminStockNotifications } from './pages/admin/AdminStockNotifications';
import { AdminMarketing } from './pages/admin/AdminMarketing';
import { AdminSettings } from './pages/admin/AdminSettings';

const queryClient = new QueryClient();

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const [showLoading, setShowLoading] = useState(true);

  React.useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      document.body.classList.add('is-scrolling');
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true } as any);
      clearTimeout(scrollTimer);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isAdminPath && showLoading && (
        <LoadingScreen
          text="CIGARS FOR YOU"
          subtitle="FINEST HAND-ROLLED CUBAN SELECTION"
          minimumDuration={2200}
          isLoading={false}
          onComplete={() => setShowLoading(false)}
        />
      )}
      {!isAdminPath && <Navbar />}
      <main className={isAdminPath ? '' : 'storefront-main'} style={{ flex: 1 }}>{children}</main>
      {!isAdminPath && <Footer />}
      {!isAdminPath && !showLoading && <AgeGateModal />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AgeGateProvider>
          <CartProvider>
            <ToastProvider>
              <AdminContextProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <LayoutWrapper>
                    <Routes>
                      {/* Public Storefront Routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/shop" element={<ShopPage />} />
                      <Route path="/shop/:brandSlug" element={<ShopPage />} />
                      <Route path="/product/:slug" element={<ProductDetailPage />} />
                      <Route path="/cigarettes" element={<CigarettesPage />} />
                      <Route path="/cigarettes/:brandSlug" element={<CigarettesPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/account" element={<AccountPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/terms" element={<LegalPage />} />
                      <Route path="/privacy" element={<LegalPage />} />
                      <Route path="/refund-policy" element={<LegalPage />} />
                      <Route path="/age-restricted" element={<AgeRestrictedPage />} />

                      {/* Hidden Admin Portal Routes */}
                      <Route path="/admin/login" element={<AdminLoginPage />} />
                      <Route element={<AdminGuard />}>
                        <Route element={<AdminLayout />}>
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="/admin/orders" element={<AdminOrders />} />
                          <Route path="/admin/products" element={<AdminProducts />} />
                          <Route path="/admin/stock-notifications" element={<AdminStockNotifications />} />
                          <Route path="/admin/marketing" element={<AdminMarketing />} />
                          <Route path="/admin/settings" element={<AdminSettings />} />
                        </Route>
                      </Route>
                    </Routes>
                  </LayoutWrapper>
                </BrowserRouter>
              </AdminContextProvider>
            </ToastProvider>
          </CartProvider>
        </AgeGateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
