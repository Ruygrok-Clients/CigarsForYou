import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { RewardsCartProvider } from './context/RewardsCartContext';
import { LocationProvider } from './context/LocationContext';
import { AgeGateProvider } from './context/AgeGateContext';
import { ClosingSoonProvider } from './context/ClosingSoonContext';
import { ToastProvider } from './components/Toast';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AgeGateModal } from './components/AgeGateModal';
import { ClosingSoonModal } from './components/ClosingSoonModal';
import { ClerkGraceModal } from './components/ClerkGraceModal';
import { FinalCallModal } from './components/FinalCallModal';
import { LoadingScreen } from './components/LoadingScreen';
import { ScrollToTop } from './components/ScrollToTop';
import { AnalyticsRouteListener } from './components/AnalyticsRouteListener';
import { SocialProofToast } from './components/SocialProofToast';
import { useAgeGate } from './context/AgeGateContext';
import { useSitePresence } from './hooks/useSitePresence';

import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CigarettesPage } from './pages/CigarettesPage';
import { AccessoriesPage } from './pages/AccessoriesPage';
import { CartPage } from './pages/CartPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AccountPage } from './pages/AccountPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LegalPage } from './pages/LegalPage';
import { AgeRestrictedPage } from './pages/AgeRestrictedPage';
import { AboutUsPage } from './pages/AboutUsPage';
import { ContactUsPage } from './pages/ContactUsPage';
import { PartnershipsPage } from './pages/PartnershipsPage';
import { NewsPage } from './pages/NewsPage';
import { NewsArticlePage } from './pages/NewsArticlePage';

// Admin Portal Imports
import { AdminContextProvider } from './pages/admin/AdminContext';
import { AdminGuard } from './pages/admin/AdminGuard';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminStockNotifications } from './pages/admin/AdminStockNotifications';
import { AdminEnquiries } from './pages/admin/AdminEnquiries';
import { AdminMarketing } from './pages/admin/AdminMarketing';
import { AdminRewards } from './pages/admin/AdminRewards';
import { AdminNews } from './pages/admin/AdminNews';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminOperationalSystems } from './pages/admin/AdminOperationalSystems';

const queryClient = new QueryClient();

function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAgeVerified } = useAgeGate();
  const isAdminPath = location.pathname.startsWith('/admin');
  const [showLoading, setShowLoading] = useState(true);
  const trackSitePresence = !isAdminPath && !showLoading && isAgeVerified;

  useSitePresence(trackSitePresence);

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
      {!isAdminPath && !showLoading && <ClosingSoonModal />}
      {!isAdminPath && !showLoading && <ClerkGraceModal />}
      {!isAdminPath && !showLoading && <FinalCallModal />}
      {!isAdminPath && !showLoading && <AgeGateModal />}
      {!isAdminPath && !showLoading && isAgeVerified && <SocialProofToast />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AgeGateProvider>
          <ClosingSoonProvider>
          <LocationProvider>
          <CartProvider>
          <RewardsCartProvider>
            <ToastProvider>
              <AdminContextProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <AnalyticsRouteListener />
                  <LayoutWrapper>
                    <Routes>
                      {/* Public Storefront Routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/shop" element={<ShopPage />} />
                      <Route path="/shop/:brandSlug" element={<ShopPage />} />
                      <Route path="/product/:slug" element={<ProductDetailPage />} />
                      <Route path="/cigarettes" element={<CigarettesPage />} />
                      <Route path="/cigarettes/:brandSlug" element={<CigarettesPage />} />
                      <Route path="/accessories" element={<AccessoriesPage />} />
                      <Route path="/accessories/:categorySlug" element={<AccessoriesPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout-details" element={<CustomerDetailsPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
                      <Route path="/account" element={<AccountPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/terms" element={<LegalPage />} />
                      <Route path="/privacy" element={<LegalPage />} />
                      <Route path="/cookies" element={<LegalPage />} />
                      <Route path="/refund-policy" element={<LegalPage />} />
                      <Route path="/compliance" element={<LegalPage />} />
                      <Route path="/about" element={<AboutUsPage />} />
                      <Route path="/news" element={<NewsPage />} />
                      <Route path="/news/:slug" element={<NewsArticlePage />} />
                      <Route path="/partnerships" element={<PartnershipsPage />} />
                      <Route path="/contact" element={<ContactUsPage />} />
                      <Route path="/age-restricted" element={<AgeRestrictedPage />} />

                      {/* Hidden Admin Portal Routes */}
                      <Route path="/admin/login" element={<AdminLoginPage />} />
                      <Route element={<AdminGuard />}>
                        <Route element={<AdminLayout />}>
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="/admin/orders" element={<AdminOrders />} />
                          <Route path="/admin/operational-systems" element={<AdminOperationalSystems />} />
                          <Route path="/admin/products" element={<AdminProducts />} />
                          <Route path="/admin/stock-notifications" element={<AdminStockNotifications />} />
                          <Route path="/admin/enquiries" element={<AdminEnquiries />} />
                          <Route path="/admin/marketing" element={<AdminMarketing />} />
                          <Route path="/admin/rewards" element={<AdminRewards />} />
                          <Route path="/admin/news" element={<AdminNews />} />
                          <Route path="/admin/settings" element={<AdminSettings />} />
                        </Route>
                      </Route>
                    </Routes>
                  </LayoutWrapper>
                </BrowserRouter>
              </AdminContextProvider>
            </ToastProvider>
          </RewardsCartProvider>
          </CartProvider>
          </LocationProvider>
          </ClosingSoonProvider>
        </AgeGateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
