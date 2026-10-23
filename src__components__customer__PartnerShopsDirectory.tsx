import React, { useState, useEffect } from 'react';
import {
  Store,
  MapPin,
  Search,
  Coins,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Receipt,
  AlertCircle,
  X,
  Phone,
  Sparkles,
} from 'lucide-react';
import { StorageService, subscribe } from './src__services__storage';
import { PartnerShop, PartnerLocalTransaction, User } from './src__types__index';

interface PartnerShopsDirectoryProps {
  onBackToShopping: () => void;
}

export const PartnerShopsDirectory: React.FC<PartnerShopsDirectoryProps> = ({ onBackToShopping }) => {
  const currentUser: User = StorageService.getCurrentUser();
  const [partners, setPartners] = useState<PartnerShop[]>(StorageService.getApprovedPartners());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [coinBalance, setCoinBalance] = useState(
    StorageService.getCoinAccount(currentUser.id).availableBalance
  );

  // In-Store Pay Modal State
  const [activeShopForPay, setActiveShopForPay] = useState<PartnerShop | null>(null);
  const [billAmount, setBillAmount] = useState<number>(500);
  const [coinsToRedeem, setCoinsToRedeem] = useState<number>(0);
  const [completedTxn, setCompletedTxn] = useState<PartnerLocalTransaction | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribe('partnersChanged', () => {
      setPartners(StorageService.getApprovedPartners());
    });
    const unsubCoin = subscribe('coinAccountChanged', () => {
      setCoinBalance(StorageService.getCoinAccount(currentUser.id).availableBalance);
    });
    return () => {
      unsub();
      unsubCoin();
    };
  }, [currentUser.id]);

  const districts = ['All', ...new Set(partners.map((p) => p.district))];

  const filteredPartners = partners.filter((p) => {
    const matchesSearch =
      p.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partnerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pinCode.includes(searchQuery) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDistrict = selectedDistrict === 'All' || p.district === selectedDistrict;
    return matchesSearch && matchesDistrict;
  });

  // Calculate local redemption cap for the active shop
  const partnerCapPercent = activeShopForPay
    ? Math.min(50, activeShopForPay.partnerRedemptionCapPercentage || 50)
    : 50;
  const maxCapAmount = Math.floor(billAmount * (partnerCapPercent / 100));
  const maxSpendableCoins = Math.min(coinBalance, maxCapAmount);

  const handleOpenPay = (shop: PartnerShop) => {
    setActiveShopForPay(shop);
    setBillAmount(500);
    const initialCoins = Math.min(coinBalance, Math.floor(500 * (Math.min(50, shop.partnerRedemptionCapPercentage || 50) / 100)));
    setCoinsToRedeem(initialCoins);
    setCompletedTxn(null);
    setPayError(null);
  };

  const handleBillAmountChange = (amount: number) => {
    setBillAmount(amount);
    const newMaxCap = Math.floor(amount * (partnerCapPercent / 100));
    setCoinsToRedeem(Math.min(coinBalance, newMaxCap));
  };

  const handleAuthorizeLocalPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopForPay) return;
    setPayError(null);

    try {
      const txn = StorageService.processLocalPartnerTransaction(
        activeShopForPay.id,
        currentUser.id,
        billAmount,
        coinsToRedeem
      );
      setCompletedTxn(txn);
      setCoinBalance(StorageService.getCoinAccount(currentUser.id).availableBalance);
    } catch (err: any) {
      setPayError(err.message || 'Payment processing failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-6">
      {/* Directory Banner Header */}
      <div className="bg-gradient-to-r from-magizh-900 via-magizh-800 to-darkbrown-900 text-white rounded-3xl p-5 sm:p-7 shadow-card border border-magizh-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-b5-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Authorized Franchise Network
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              Magizh Partner Shops Directory
            </h1>
            <p className="text-xs text-cream-200 mt-1 max-w-md">
              Visit approved partner organic grocery stores across Tamil Nadu. Redeem your B5 Coins in-store (up to 50% cap) and pay the rest in cash or UPI.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-center shrink-0">
            <span className="text-[10px] text-cream-200 uppercase font-bold block">Your Available Coins</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <Coins className="w-5 h-5 text-b5-400" />
              <span className="text-2xl font-black text-white font-mono">{coinBalance}</span>
            </div>
            <span className="text-[10px] text-amber-300 font-bold block">1 B5 Coin = ₹1 Discount</span>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search partner store by name, area, or PIN code..."
              className="w-full pl-10 pr-3 py-2 text-xs text-darkbrown-900 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-magizh-400"
            />
          </div>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full px-3 py-2 text-xs text-darkbrown-900 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-magizh-400 font-bold"
          >
            {districts.map((d) => (
              <option key={d} value={d}>
                {d === 'All' ? 'All Districts' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Partner Shops List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-extrabold text-darkbrown-900">
            Approved Stores Near You ({filteredPartners.length})
          </h2>
          <button
            onClick={onBackToShopping}
            className="text-xs font-bold text-magizh-800 hover:underline"
          >
            &larr; Return to Online Shopping
          </button>
        </div>

        {filteredPartners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-cream-300 p-8 text-center text-xs text-gray-500">
            No partner shops found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPartners.map((shop) => (
              <div
                key={shop.id}
                className="bg-white rounded-3xl border border-cream-300 hover:border-magizh-500/50 p-5 shadow-2xs hover:shadow-soft transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-darkbrown-900 leading-tight">
                          {shop.shopName}
                        </h3>
                        <span className="font-mono text-[10px] text-gray-500 font-bold">
                          Partner ID: {shop.partnerCode}
                        </span>
                      </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                      Approved Store
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 flex items-start gap-1.5">
                    <MapPin className="w-4 h-4 text-magizh-700 shrink-0 mt-0.5" />
                    <span>{shop.address}, {shop.district} - <strong>{shop.pinCode}</strong></span>
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="bg-b5-50 text-b5-800 border border-b5-200 px-2 py-0.5 rounded-lg font-bold">
                      Redeem up to {shop.partnerRedemptionCapPercentage || 50}% Coins
                    </span>
                    <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      {shop.specialCoinBonusMultiplier || 1.5}x Coin Bonus
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-cream-200 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>+91 {shop.mobile}</span>
                  </div>

                  <button
                    onClick={() => handleOpenPay(shop)}
                    className="px-4 py-2 bg-gradient-to-r from-b5-600 to-b5-700 hover:from-b5-700 hover:to-b5-800 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Pay In-Store with Coins</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-Store Payment Modal */}
      {activeShopForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkbrown-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-cream-300 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-magizh-900 to-magizh-800 text-white p-5 relative">
              <button
                onClick={() => setActiveShopForPay(null)}
                className="absolute top-4 right-4 text-cream-200 hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-b5-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-b5-300">
                  Local In-Store Transaction
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">{activeShopForPay.shopName}</h3>
              <p className="text-xs text-cream-200">
                Partner Code: {activeShopForPay.partnerCode} &bull; {activeShopForPay.district}
              </p>
            </div>

            {completedTxn ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-darkbrown-900">
                    Payment Authorized & Completed!
                  </h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Receipt Number: <strong>{completedTxn.receiptNumber}</strong>
                  </p>
                </div>

                <div className="bg-cream-50 p-4 rounded-2xl border border-cream-200 text-xs space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Purchase Value:</span>
                    <span className="font-bold">₹{completedTxn.eligiblePurchaseAmount}</span>
                  </div>
                  <div className="flex justify-between text-b5-700 font-black">
                    <span>B5 Coins Redeemed (1 Coin = ₹1):</span>
                    <span>-₹{completedTxn.coinsRedeemed}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-magizh-900 pt-2 border-t border-cream-300">
                    <span>Net Cash / UPI Paid at Counter:</span>
                    <span>₹{completedTxn.netCashPaid}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  This transaction is recorded in your central wallet ledger and the partner shop's settlement report.
                </p>

                <button
                  onClick={() => setActiveShopForPay(null)}
                  className="w-full py-2.5 bg-magizh-800 hover:bg-magizh-900 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Close Receipt
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthorizeLocalPayment} className="p-5 space-y-4 text-xs">
                {payError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{payError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-darkbrown-900 mb-1">
                    Store Purchase Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={billAmount}
                    onChange={(e) => handleBillAmountChange(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 border border-cream-300 rounded-xl text-base font-black font-mono focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                    required
                  />
                </div>

                {/* Cap Details Card */}
                <div className="bg-gradient-to-br from-b5-50 to-amber-50 p-3.5 rounded-2xl border border-b5-200 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-600">Store Redemption Cap:</span>
                    <span className="font-extrabold text-b5-900 font-mono">{partnerCapPercent}% Maximum</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-gray-600">Maximum Coins Permitted (Cap Limit):</span>
                    <span className="font-black text-darkbrown-900 font-mono">₹{maxCapAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-b5-200/60">
                    <span className="font-bold text-darkbrown-900">Your Spendable Coin Limit:</span>
                    <span className="font-black text-emerald-800 font-mono">
                      {maxSpendableCoins} B5 Coins (= ₹{maxSpendableCoins})
                    </span>
                  </div>
                </div>

                {/* Coin Slider */}
                {maxSpendableCoins > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-darkbrown-900">Coins to Redeem:</span>
                      <span className="font-black text-b5-700 font-mono text-sm">
                        {coinsToRedeem} B5
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={maxSpendableCoins}
                      value={coinsToRedeem}
                      onChange={(e) => setCoinsToRedeem(Number(e.target.value))}
                      className="w-full accent-b5-600 cursor-pointer"
                    />

                    <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                      <span>0 Coins</span>
                      <button
                        type="button"
                        onClick={() => setCoinsToRedeem(maxSpendableCoins)}
                        className="text-b5-700 font-bold hover:underline"
                      >
                        Use Max ({maxSpendableCoins})
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    You have 0 B5 Coins available to redeem for this purchase.
                  </p>
                )}

                {/* Final Bill Breakdown */}
                <div className="p-3 bg-cream-50 rounded-2xl border border-cream-200 space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Purchase Subtotal:</span>
                    <span>₹{billAmount}</span>
                  </div>
                  <div className="flex justify-between text-b5-700 font-bold">
                    <span>B5 Coins Discount:</span>
                    <span>-₹{coinsToRedeem}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-magizh-900 pt-1 border-t border-cream-300">
                    <span>Remaining Amount to Pay at Counter:</span>
                    <span>₹{Math.max(0, billAmount - coinsToRedeem)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-magizh-700 to-magizh-900 hover:from-magizh-800 hover:to-magizh-950 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize & Deduct {coinsToRedeem} B5 Coins</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
