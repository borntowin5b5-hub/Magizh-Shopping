import React, { useState, useEffect } from 'react';
import { Header } from './src__components__common__Header';
import { BottomNav } from './src__components__common__BottomNav';
import { AuthModal } from './src__components__common__AuthModal';
import { HomePage } from './src__components__customer__HomePage';
import { ProductDetailModal } from './src__components__customer__ProductDetailModal';
import { CartPage } from './src__components__customer__CartPage';
import { CheckoutFlow } from './src__components__customer__CheckoutFlow';
import { OrderHistoryAndTracking } from './src__components__customer__OrderHistoryAndTracking';
import { B5CoinWalletPage } from './src__components__customer__B5CoinWalletPage';
import { CustomerAccount } from './src__components__customer__CustomerAccount';
import { PartnerDashboard } from './src__components__partner__PartnerDashboard';
import { ReferralDashboard } from './src__components__referral__ReferralDashboard';
import { SalesDashboard } from './src__components__sales__SalesDashboard';
import { AdminPanel } from './src__components__admin__AdminPanel';
import { PartnerShopsDirectory } from './src__components__customer__PartnerShopsDirectory';
import { StorageService, subscribe } from './src__services__storage';
import { Product, WeightVariant, Coupon, Order, User, ProductCategory } from './src__types__index';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(StorageService.getCurrentUser());
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutCoupon, setCheckoutCoupon] = useState<Coupon | undefined>(undefined);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cartCount, setCartCount] = useState(
    StorageService.getCart().reduce((acc, it) => acc + it.quantity, 0)
  );
  const [coinBalance, setCoinBalance] = useState(
    StorageService.getCoinAccount(currentUser.id).availableBalance
  );

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
    setCurrentTab('checkout');
  };

  const handleProceedToCheckout = (coupon?: Coupon) => {
    setCheckoutCoupon(coupon);
    setCurrentTab('checkout');
  };

  const handleOrderSuccess = (order: Order) => {
    setCurrentTab('orders');
  };

  // Role Access Guard
  const renderContent = () => {
    // Admin Guard
    if (currentTab === 'admin' || currentTab === 'admin-orders') {
      if (currentUser.role !== 'admin') {
        return (
          <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-3xl border border-cream-300 text-center space-y-4 shadow-soft">
            <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
            <h2 className="text-lg font-black text-darkbrown-900">Admin Authentication Required</h2>
            <p className="text-xs text-gray-600">
              You are currently viewing as <strong>{currentUser.name}</strong> ({currentUser.role}).
              Switch to the Admin persona to access root catalog, ledger, and rules.
            </p>
            <button
              onClick={() => {
                const adminUser = StorageService.switchRole('admin');
                setCurrentUser(adminUser);
              }}
              className="px-5 py-2.5 bg-red-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-red-950 transition-all"
            >
              Switch to Admin Persona
            </button>
          </div>
        );
      }
      return <AdminPanel />;
    }

    // Partner Guard
    if (currentTab === 'partner' || currentTab === 'partner-orders' || currentTab === 'partner-inventory') {
      if (currentUser.role !== 'partner' && currentUser.role !== 'admin') {
        return (
          <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-3xl border border-cream-300 text-center space-y-4 shadow-soft">
            <ShieldAlert className="w-12 h-12 text-blue-600 mx-auto" />
            <h2 className="text-lg font-black text-darkbrown-900">Partner Shop Access</h2>
            <p className="text-xs text-gray-600">
              Dedicated area for authorized Magizh franchise partners and fulfillment hubs.
            </p>
            <button
              onClick={() => {
                const partnerUser = StorageService.switchRole('partner');
                setCurrentUser(partnerUser);
              }}
              className="px-5 py-2.5 bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-950 transition-all"
            >
              Switch to Partner Persona
            </button>
          </div>
        );
      }
      return <PartnerDashboard />;
    }

    // Sales Guard
    if (currentTab === 'sales') {
      return <SalesDashboard />;
    }

    // Direct Test Suite
    if (currentTab === 'test-suite') {
      return <AdminPanel />;
    }

    // Customer Views
    switch (currentTab) {
      case 'cart':
        return (
          <CartPage
            onProceedToCheckout={handleProceedToCheckout}
            onContinueShopping={() => setCurrentTab('home')}
          />
        );
      case 'checkout':
        return (
          <CheckoutFlow
            coupon={checkoutCoupon}
            onOrderSuccess={handleOrderSuccess}
            onCancel={() => setCurrentTab('cart')}
          />
        );
      case 'orders':
        return <OrderHistoryAndTracking onContinueShopping={() => setCurrentTab('home')} />;
      case 'wallet':
        return (
          <B5CoinWalletPage
            onStartShopping={() => setCurrentTab('home')}
            onNavigateReferral={() => setCurrentTab('referral')}
          />
        );
      case 'referral':
        return <ReferralDashboard />;
      case 'account':
        return (
          <CustomerAccount
            onNavigateOrders={() => setCurrentTab('orders')}
            onNavigateWallet={() => setCurrentTab('wallet')}
            onNavigateReferral={() => setCurrentTab('referral')}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        );
      case 'partner-shops':
        return <PartnerShopsDirectory onBackToShopping={() => setCurrentTab('home')} />;
      case 'categories':
      case 'home':
      default:
        return (
          <HomePage
            onSelectProduct={(p) => setSelectedProduct(p)}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onNavigateCategory={() => setCurrentTab('home')}
            onNavigatePartnerShops={() => setCurrentTab('partner-shops')}
          />
        );
    }
  };

  const relatedProducts = selectedProduct
    ? StorageService.getProducts().filter((p) => p.id !== selectedProduct.id && p.category === selectedProduct.category)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-cream-100 text-darkbrown-900 selection:bg-magizh-100 selection:text-magizh-900">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Dynamic View */}
      <main className="flex-1 w-full">{renderContent()}</main>

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
        onNavigate={(tab) => setCurrentTab(tab)}
        role={currentUser.role}
        cartCount={cartCount}
        coinBalance={coinBalance}
      />
    </div>
  );
}
