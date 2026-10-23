import React from 'react';
import { Home, Grid, ShoppingBag, Coins, User as UserIcon, Store, BarChart2, Shield, Share2, PackageCheck } from 'lucide-react';
import { UserRole } from '../../types';

interface BottomNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  role: UserRole;
  cartCount: number;
  coinBalance: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onNavigate,
  role,
  cartCount,
  coinBalance,
}) => {
  // Mobile navigation tabs adapted to role
  const getTabs = () => {
    if (role === 'partner') {
      return [
        { id: 'partner', label: 'Store', icon: Store },
        { id: 'partner-orders', label: 'Orders', icon: PackageCheck },
        { id: 'partner-inventory', label: 'Inventory', icon: Grid },
        { id: 'home', label: 'Shop View', icon: Home },
        { id: 'account', label: 'Profile', icon: UserIcon },
      ];
    }

    if (role === 'sales') {
      return [
        { id: 'sales', label: 'Overview', icon: BarChart2 },
        { id: 'referral', label: 'Levels 1-7', icon: Share2 },
        { id: 'home', label: 'Customer App', icon: Home },
        { id: 'wallet', label: 'B5 Coins', icon: Coins, badge: coinBalance },
        { id: 'account', label: 'Profile', icon: UserIcon },
      ];
    }

    if (role === 'admin') {
      return [
        { id: 'admin', label: 'Dashboard', icon: Shield },
        { id: 'admin-orders', label: 'Orders', icon: PackageCheck },
        { id: 'home', label: 'Storefront', icon: Home },
        { id: 'wallet', label: 'Ledger', icon: Coins },
        { id: 'account', label: 'Admin', icon: UserIcon },
      ];
    }

    // Default Customer Navigation
    return [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'categories', label: 'Categories', icon: Grid },
      { id: 'cart', label: 'Cart', icon: ShoppingBag, badge: cartCount },
      { id: 'wallet', label: 'B5 Wallet', icon: Coins, badge: coinBalance },
      { id: 'account', label: 'Account', icon: UserIcon },
    ];
  };

  const tabs = getTabs();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-cream-300 py-1.5 px-2 md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-magizh-800 font-bold scale-105'
                  : 'text-darkbrown-700/70 hover:text-darkbrown-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] text-magizh-800' : 'stroke-[1.8px]'}`} />
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-b5-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-4 text-center shadow-sm">
                    {tab.badge > 999 ? '999+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-magizh-900' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-magizh-700 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
