import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { AuthModal } from './components/common/AuthModal';
import { HomePage } from './components/customer/HomePage';
import { ProductDetailModal } from './components/customer/ProductDetailModal';
import { CartPage } from './components/customer/CartPage';
import { CheckoutFlow } from './components/customer/CheckoutFlow';
import { OrderHistoryAndTracking } from './components/customer/OrderHistoryAndTracking';
import { B5CoinWalletPage } from './components/customer/B5CoinWalletPage';
import { CustomerAccount } from './components/customer/CustomerAccount';
import { PartnerDashboard } from './components/partner/PartnerDashboard';
import { ReferralDashboard } from './components/referral/ReferralDashboard';
import { SalesDashboard } from './components/sales/SalesDashboard';
import { AdminPanel } from './components/admin/AdminPanel';
import { PartnerShopsDirectory } from './components/customer/PartnerShopsDirectory';
import { PartnerAuthGuard } from './components/common/PartnerAuthGuard';
import { AdminAuthGuard } from './components/common/AdminAuthGuard';
import { StorageService, subscribe } from './services/storage';
import { Product, WeightVariant, Coupon, Order, User } from './types';
import { Store, Shield, TrendingUp, Sparkles, Heart, ExternalLink } from 'lucide-react';

// Path-to-Route Mapper
export const getRouteFromPath = (pathname: string): string => {
  const p = (pathname || '/').toLowerCase().trim();
  if (p === '/admin' || p.startsWith('/admin/')) return 'admin';
  if (p === '/partner' || p.startsWith('/partner/')) return 'partner';
  if (p === '/referral' || p.startsWith('/referral/') || p === '/sales' || p.startsWith('/sales/')) return 'referral';
  if (p === '/cart' || p.startsWith('/cart/')) return 'cart';
  if (p === '/checkout' || p.startsWith('/checkout/')) return 'checkout';
  if (p === '/orders' || p.startsWith('/orders/')) return 'orders';
  if (p === '/wallet' || p.startsWith('/wallet/')) return 'wallet';
  if (p === '/account' || p.startsWith('/account/')) return 'account';
  if (p === '/partner-shops' || p.startsWith('/partner-shops/')) return 'partner-shops';
  if (p === '/categories' || p.startsWith('/categories/')) return 'categories';
  return 'home';
};

// Route-to-Path Mapper
export const getPathFromRoute = (route: string): string => {
  switch (route) {
    case 'admin':
    case 'admin-orders':
    case 'test-suite':
      return '/admin';
    case 'partner':
    case 'partner-orders':
    case 'partner-inventory':
      return '/partner';
    case 'referral':
    case 'sales':
      return '/referral';
    case 'cart':
      return '/cart';
    case 'checkout':
      return '/checkout';
    case 'orders':
      return '/orders';
    case 'wallet':
      return '/wallet';
    case 'account':
      return '/account';
    case 'partner-shops':
      return '/partner-shops';
    case 'categories':
      return '/categories';
    case 'home':
    default:
      return '/';
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(StorageService.getCurrentUser());
  
  // Initialize route directly from browser URL so refreshing opens the exact route
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getRouteFromPath(window.location.pathname);
    }
    return 'home';
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutCoupon, setCheckoutCoupon] = useState<Coupon | undefined>(undefined);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cartCount, setCartCount] = useState(
    StorageService.getCart().reduce((acc, it) => acc + it.quantity, 0)
  );
  const [coinBalance, setCoinBalance] = useState(
    StorageService.getCoinAccount(currentUser.id).availableBalance
  );

  // Sync tab navigation with browser history
  const navigateTo = (tab: string) => {
    setCurrentTab(tab);
    const targetPath = getPathFromRoute(tab);
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ tab }, '', targetPath);
    }
  };

  // Browser Back / Forward Button Listener
  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteFromPath(window.location.pathname);
      setCurrentTab(route);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync storage subscriptions
  useEffect(() => {
    const unsubUser = subscribe('currentUserChanged', (u: User) => {
      setCurrentUser(u);
      setCoinBalance(StorageService.getCoinAccount(u.id).availableBalance);
    });
    const unsubCart = subscribe('cartChanged', (c) => {
      setCartCount(c.reduce((acc: number, it: any) => acc + it.quantity, 0));
    });
    const unsubCoin = subscribe('coinAccountChanged', () => {
      setCoinBalance(StorageService.getCoinAccount(currentUser.id).availableBalance);
    });

    return () => {
      unsubUser();
      unsubCart();
      unsubCoin();
    };
  }, [currentUser.id]);

  const handleAddToCart = (product: Product, variant: WeightVariant, quantity: number) => {
    StorageService.addToCart({
      productId: product.id,
      variantWeight: variant.weight,
      quantity,
      price: variant.price,
      originalPrice: variant.originalPrice,
      name: product.name,
      image: product.images[0],
      category: product.category,
    });
  };

  const handleBuyNow = (product: Product, variant: WeightVariant, quantity: number) => {
    handleAddToCart(product, variant, quantity);
    setSelectedProduct(null);
    navigateTo('checkout');
  };

  const handleProceedToCheckout = (coupon?: Coupon) => {
    setCheckoutCoupon(coupon);
    navigateTo('checkout');
  };

  const handleOrderSuccess = (order: Order) => {
    navigateTo('orders');
  };

  // Render Page Content based on Route & Role Guard
  const renderContent = () => {
    // 4. /admin — Admin Login and Administration Dashboard
    if (currentTab === 'admin' || currentTab === 'admin-orders' || currentTab === 'test-suite') {
      return (
        <AdminAuthGuard
          currentUser={currentUser}
          onLoginSuccess={(adminUser) => {
            setCurrentUser(adminUser);
            setCoinBalance(StorageService.getCoinAccount(adminUser.id).availableBalance);
          }}
          onNavigateStorefront={() => navigateTo('home')}
        >
          <AdminPanel />
        </AdminAuthGuard>
      );
    }

    // 2. /partner — Partner Login and Partner Dashboard
    if (currentTab === 'partner' || currentTab === 'partner-orders' || currentTab === 'partner-inventory') {
      return (
        <PartnerAuthGuard
          currentUser={currentUser}
          onLoginSuccess={(partnerUser) => {
            setCurrentUser(partnerUser);
            setCoinBalance(StorageService.getCoinAccount(partnerUser.id).availableBalance);
          }}
          onNavigateStorefront={() => navigateTo('home')}
        >
          <PartnerDashboard />
        </PartnerAuthGuard>
      );
    }

    // 3. /referral — Sales / Referral Leader Login and Dashboard
    if (currentTab === 'referral' || currentTab === 'sales') {
      return (
        <div className="space-y-6">
          <ReferralDashboard />
        </div>
      );
    }

    // 1. / — Customer Shopping Website and Sub-Views
    switch (currentTab) {
      case 'cart':
        return (
          <CartPage
            onProceedToCheckout={handleProceedToCheckout}
            onContinueShopping={() => navigateTo('home')}
          />
        );
      case 'checkout':
        return (
          <CheckoutFlow
            coupon={checkoutCoupon}
            onOrderSuccess={handleOrderSuccess}
            onCancel={() => navigateTo('cart')}
          />
        );
      case 'orders':
        return <OrderHistoryAndTracking onContinueShopping={() => navigateTo('home')} />;
      case 'wallet':
        return (
          <B5CoinWalletPage
            onStartShopping={() => navigateTo('home')}
            onNavigateReferral={() => navigateTo('referral')}
          />
        );
      case 'account':
        return (
          <CustomerAccount
            onNavigateOrders={() => navigateTo('orders')}
            onNavigateWallet={() => navigateTo('wallet')}
            onNavigateReferral={() => navigateTo('referral')}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        );
      case 'partner-shops':
        return <PartnerShopsDirectory onBackToShopping={() => navigateTo('home')} />;
      case 'categories':
      case 'home':
      default:
        return (
          <HomePage
            onSelectProduct={(p) => setSelectedProduct(p)}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onNavigateCategory={() => navigateTo('home')}
            onNavigatePartnerShops={() => navigateTo('partner-shops')}
          />
        );
    }
  };

  const relatedProducts = selectedProduct
    ? StorageService.getProducts().filter((p) => p.id !== selectedProduct.id && p.category === selectedProduct.category)
    : [];

  const isCustomerView =
    currentTab !== 'admin' &&
    currentTab !== 'partner' &&
    currentTab !== 'partner-orders' &&
    currentTab !== 'partner-inventory' &&
    currentTab !== 'admin-orders';

  return (
    <div className="min-h-screen flex flex-col bg-cream-100 text-darkbrown-900 selection:bg-magizh-100 selection:text-magizh-900">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => navigateTo(tab)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Dynamic View */}
      <main className="flex-1 w-full">{renderContent()}</main>

      {/* Customer Footer with Direct Route Links */}
      {isCustomerView && (
        <footer className="mt-12 bg-white border-t border-cream-300 py-10 px-4 pb-24 md:pb-10 text-darkbrown-900">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-magizh-800 text-white flex items-center justify-center font-black">
                  M
                </div>
                <span className="font-extrabold text-base tracking-tight text-magizh-900">
                  MAGIZH SHOPPING
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Modern Indian e-commerce celebrating traditional Tamil Nadu millets, stone-ground podis, wood-pressed virgin oils, and natural soaps with 100% genuine B5 Coin rewards.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-darkbrown-900 mb-3">
                Shopping Categories
              </h4>
              <ul className="text-xs text-gray-600 space-y-2 font-medium">
                <li><button onClick={() => navigateTo('home')} className="hover:text-magizh-800">Traditional Millet Products</button></li>
                <li><button onClick={() => navigateTo('home')} className="hover:text-magizh-800">Stone Ground Podi Varieties</button></li>
                <li><button onClick={() => navigateTo('home')} className="hover:text-magizh-800">Chettinad Pickles &amp; Thokku</button></li>
                <li><button onClick={() => navigateTo('home')} className="hover:text-magizh-800">Vedic A2 Ghee &amp; Virgin Oils</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-darkbrown-900 mb-3">
                Customer Services
              </h4>
              <ul className="text-xs text-gray-600 space-y-2 font-medium">
                <li><button onClick={() => navigateTo('wallet')} className="hover:text-magizh-800">B5 Coin Wallet (1 Coin = ₹1)</button></li>
                <li><button onClick={() => navigateTo('partner-shops')} className="hover:text-magizh-800">In-Store Partner Shops</button></li>
                <li><button onClick={() => navigateTo('orders')} className="hover:text-magizh-800">Order History &amp; Tracking</button></li>
                <li><button onClick={() => navigateTo('account')} className="hover:text-magizh-800">Delivery Address Book</button></li>
              </ul>
            </div>

            {/* Portal Access Links */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-darkbrown-900 mb-3">
                Ecosystem Portals
              </h4>
              <ul className="text-xs space-y-2 font-semibold">
                <li>
                  <button
                    onClick={() => navigateTo('partner')}
                    className="flex items-center gap-1.5 text-blue-800 hover:text-blue-950 hover:underline"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Partner Portal (/partner)</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo('referral')}
                    className="flex items-center gap-1.5 text-purple-800 hover:text-purple-950 hover:underline"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Sales Leader Portal (/referral)</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateTo('admin')}
                    className="flex items-center gap-1.5 text-red-800 hover:text-red-950 hover:underline"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Console (/admin)</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-8 pt-4 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
            <p>&copy; {new Date().getFullYear()} Magizh Shopping &amp; B5 Coin Ecosystem. Pure Natural Living.</p>
            <p className="flex items-center gap-1">
              <span>50% B5 Coin Redemption Cap Strictly Enforced</span>
            </p>
          </div>
        </footer>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        relatedProducts={relatedProducts}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* Customer Registration & Login Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setCurrentUser(u);
          setCoinBalance(StorageService.getCoinAccount(u.id).availableBalance);
        }}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={(tab) => navigateTo(tab)}
        role={currentUser.role}
        cartCount={cartCount}
        coinBalance={coinBalance}
      />
    </div>
  );
}
