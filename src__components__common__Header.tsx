import React, { useState, useEffect } from 'react';
import { ShoppingBag, Coins, User as UserIcon, Shield, Store, TrendingUp, Menu, X, Bell } from 'lucide-react';
import { StorageService, subscribe } from './src__services__storage';
import { User, UserRole } from './src__types__index';

interface HeaderProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onNavigate, onOpenAuth }) => {
  const [currentUser, setCurrentUser] = useState<User>(StorageService.getCurrentUser());
  const [coinAccount, setCoinAccount] = useState(StorageService.getCoinAccount(currentUser.id));
  const [cartCount, setCartCount] = useState(
    StorageService.getCart().reduce((acc, item) => acc + item.quantity, 0)
  );
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    const unsubUser = subscribe('currentUserChanged', (user: User) => {
      setCurrentUser(user);
      setCoinAccount(StorageService.getCoinAccount(user.id));
    });
    const unsubCoin = subscribe('coinAccountChanged', () => {
      setCoinAccount(StorageService.getCoinAccount(currentUser.id));
    });
    const unsubCart = subscribe('cartChanged', (cart) => {
      setCartCount(cart.reduce((acc: number, item: any) => acc + item.quantity, 0));
    });

    return () => {
      unsubUser();
      unsubCoin();
      unsubCart();
    };
  }, [currentUser.id]);

  const handleRoleSwitch = (role: UserRole) => {
    const newUser = StorageService.switchRole(role);
    setCurrentUser(newUser);
    setShowRoleMenu(false);
    if (role === 'admin') onNavigate('admin');
    else if (role === 'partner') onNavigate('partner');
    else if (role === 'sales') onNavigate('sales');
    else onNavigate('home');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin Hub', color: 'bg-red-800 text-white' };
      case 'partner':
        return { label: 'Partner Shop', color: 'bg-blue-800 text-white' };
      case 'sales':
        return { label: 'Sales Leader', color: 'bg-purple-800 text-white' };
      default:
        return { label: 'Customer', color: 'bg-magizh-800 text-white' };
    }
  };

  const roleInfo = getRoleBadge(currentUser.role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-cream-300 shadow-sm">
      {/* Top Brand & Announcement Bar */}
      <div className="bg-gradient-to-r from-magizh-900 via-magizh-800 to-darkbrown-900 text-white text-xs px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <span className="bg-b5-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            B5 Rewards
          </span>
          <span className="truncate">Earn up to 5% B5 Coins on all Traditional Millets & Oils!</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] shrink-0 font-medium">
          <button
            onClick={() => onNavigate('test-suite')}
            className="hidden md:inline-flex items-center gap-1 text-b5-300 hover:text-white underline underline-offset-2"
          >
            <span>Run Test Suite (15/15)</span>
          </button>
          <span className="text-cream-300">|</span>
          <span className="text-cream-200">1 B5 Coin = ₹1</span>
        </div>
      </div>

      {/* Main App Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-2 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-magizh-700 to-magizh-900 flex items-center justify-center text-white font-extrabold shadow-md border border-magizh-600/30 group-hover:scale-105 transition-transform">
            <span className="text-xl">M</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-magizh-900">
                MAGIZH
              </span>
              <span className="text-xs uppercase font-bold tracking-widest text-b5-700 bg-b5-100 px-1.5 py-0.5 rounded">
                SHOPPING
              </span>
            </div>
            <p className="text-[10px] text-darkbrown-700 font-medium -mt-1 tracking-tight">
              Pure Natural Living &bull; B5 Coin Ecosystem
            </p>
          </div>
        </div>

        {/* B5 Coin Wallet Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate('partner-shops')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-cream-100 hover:bg-cream-200 border border-cream-300 rounded-full text-xs font-bold text-darkbrown-800 transition-colors"
            title="Explore Local Partner Shops"
          >
            <Store className="w-3.5 h-3.5 text-blue-700" />
            <span>Partner Shops</span>
          </button>

          <button
            onClick={() => onNavigate('wallet')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-b5-50 to-amber-50 border border-b5-200 hover:border-b5-400 px-2.5 py-1.5 rounded-full shadow-sm hover:shadow transition-all group"
            title="Click to view B5 Coin Wallet"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-b5-500 to-b5-700 text-white flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div className="text-left pr-1">
              <span className="text-[10px] block font-semibold text-b5-800 leading-none">B5 Coins</span>
              <span className="text-xs font-black text-b5-700 leading-tight">
                {coinAccount.availableBalance}
              </span>
            </div>
          </button>

          {/* Cart Icon (Customer view) */}
          <button
            onClick={() => onNavigate('cart')}
            className="relative p-2 text-darkbrown-800 hover:text-magizh-800 hover:bg-cream-200 rounded-full transition-colors"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-b5-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* Role Switcher Pill / Quick Switch */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-all border ${roleInfo.color}`}
            >
              {currentUser.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
              {currentUser.role === 'partner' && <Store className="w-3.5 h-3.5" />}
              {currentUser.role === 'sales' && <TrendingUp className="w-3.5 h-3.5" />}
              {currentUser.role === 'customer' && <UserIcon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
              <span className="text-[10px] opacity-80">({roleInfo.label})</span>
            </button>

            {/* Role Dropdown Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-cream-300 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-cream-200">
                  <p className="text-xs font-bold text-darkbrown-900">{currentUser.name}</p>
                  <p className="text-[11px] text-gray-500 font-mono">{currentUser.customerCode}</p>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Switch Active Role
                  </div>
                  <button
                    onClick={() => handleRoleSwitch('customer')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-cream-100 ${
                      currentUser.role === 'customer' ? 'text-magizh-800 font-bold bg-magizh-50' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-magizh-700" />
                      1. Customer App
                    </span>
                    {currentUser.role === 'customer' && <span className="text-[10px] text-magizh-700 font-bold">Active</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch('partner')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-cream-100 ${
                      currentUser.role === 'partner' ? 'text-blue-800 font-bold bg-blue-50' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-blue-700" />
                      2. Partner Shop
                    </span>
                    {currentUser.role === 'partner' && <span className="text-[10px] text-blue-700 font-bold">Active</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch('sales')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-cream-100 ${
                      currentUser.role === 'sales' ? 'text-purple-800 font-bold bg-purple-50' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-700" />
                      3. Sales / Referral Leader
                    </span>
                    {currentUser.role === 'sales' && <span className="text-[10px] text-purple-700 font-bold">Active</span>}
                  </button>

                  <button
                    onClick={() => handleRoleSwitch('admin')}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-cream-100 ${
                      currentUser.role === 'admin' ? 'text-red-800 font-bold bg-red-50' : 'text-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-red-700" />
                      4. Admin Panel
                    </span>
                    {currentUser.role === 'admin' && <span className="text-[10px] text-red-700 font-bold">Active</span>}
                  </button>
                </div>

                <div className="border-t border-cream-200 pt-1 mt-1">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-b5-700 font-semibold hover:bg-cream-100 flex items-center gap-2"
                  >
                    Manage Profile & Demo Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
