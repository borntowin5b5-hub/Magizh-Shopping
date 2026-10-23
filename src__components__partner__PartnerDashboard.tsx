import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  TrendingUp,
  Coins,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Plus,
  Edit2,
  DollarSign,
  UserCheck,
  Receipt,
  Search,
  Printer,
  X,
  CreditCard,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { StorageService, subscribe } from '../../services/storage';
import { PartnerShop, Order, Product, User, PartnerLocalTransaction } from '../../types';

export const PartnerDashboard: React.FC = () => {
  const currentUser: User = StorageService.getCurrentUser();
  const partners: PartnerShop[] = StorageService.getPartners();

  // Find matching partner or default to first partner
  const [activePartner, setActivePartner] = useState<PartnerShop>(
    partners.find((p) => p.mobile === currentUser.mobile || p.ownerName === currentUser.name) || partners[0]
  );

  const [orders, setOrders] = useState<Order[]>(StorageService.getOrders());
  const [products, setProducts] = useState<Product[]>(StorageService.getProducts());
  const [localTxs, setLocalTxs] = useState<PartnerLocalTransaction[]>(
    StorageService.getPartnerLocalTransactions(activePartner.id)
  );

  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'inventory' | 'settlement' | 'instore'
  >('overview');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // In-Store Billing POS State
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PartnerLocalTransaction | null>(null);

  const [posCustomerPhone, setPosCustomerPhone] = useState('9840123456');
  const [posCustomer, setPosCustomer] = useState<User | null>(null);
  const [posCustomerCoins, setPosCustomerCoins] = useState<number>(0);
  const [posBillAmount, setPosBillAmount] = useState<number>(600);
  const [posCoinsToRedeem, setPosCoinsToRedeem] = useState<number>(200);
  const [posSummary, setPosSummary] = useState('Native Cold-Pressed Gingelly Oil (1L), Karuppu Kavuni Millet (1kg)');
  const [posError, setPosError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribe('partnersChanged', (updatedPartners: PartnerShop[]) => {
      const current = updatedPartners.find((p) => p.id === activePartner.id) || updatedPartners[0];
      setActivePartner(current);
    });
    const unsubOrders = subscribe('ordersChanged', (updatedOrders: Order[]) => {
      setOrders(updatedOrders);
    });
    const unsubTxs = subscribe('partnerLocalTransactionsChanged', () => {
      setLocalTxs(StorageService.getPartnerLocalTransactions(activePartner.id));
    });

    return () => {
      unsub();
      unsubOrders();
      unsubTxs();
    };
  }, [activePartner.id]);

  // Lookup customer when phone changes in POS modal
  useEffect(() => {
    if (posCustomerPhone.trim().length >= 10) {
      const u = StorageService.findUserByMobile(posCustomerPhone.trim());
      if (u) {
        setPosCustomer(u);
        const acc = StorageService.getCoinAccount(u.id);
        setPosCustomerCoins(acc.availableBalance);
      } else {
        setPosCustomer(null);
        setPosCustomerCoins(0);
      }
    }
  }, [posCustomerPhone, isBillingModalOpen]);

  // Partner orders (routed or assigned to this partner)
  const partnerOrders = orders.filter((o) => !o.partnerId || o.partnerId === activePartner.id);

  const handleUpdateOrderStatus = (orderId: string, nextStatus: any) => {
    StorageService.updateOrderStatus(orderId, nextStatus, `Updated by Partner Shop: ${activePartner.shopName}`);
    setStatusNotice(`Order status advanced to "${nextStatus}"`);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleUpdateSpecialOffer = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.savePartner(activePartner);
    setStatusNotice('Partner B5 Coin promotional multiplier saved successfully!');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Process POS In-Store Transaction
  const handleProcessInStoreTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setPosError(null);

    if (posBillAmount <= 0) {
      setPosError('Bill amount must be greater than zero.');
      return;
    }

    const maxCap = Math.floor(posBillAmount * 0.5); // 50% system ceiling
    if (posCoinsToRedeem > maxCap) {
      setPosError(`Redemption exceeds the 50% ceiling (Max allowed: ${maxCap} B5 Coins = ₹${maxCap}).`);
      return;
    }

    if (posCoinsToRedeem > posCustomerCoins) {
      setPosError(`Customer has only ${posCustomerCoins} B5 Coins available.`);
      return;
    }

    const customerId = posCustomer?.id || `walkin-${Date.now()}`;

    try {
      const txn = StorageService.processLocalPartnerTransaction(
        activePartner.id,
        customerId,
        posBillAmount,
        posCoinsToRedeem
      );

      setIsBillingModalOpen(false);
      setSelectedReceipt(txn);
      setStatusNotice(`Receipt #${txn.receiptNumber} generated! ₹${txn.netCashPaid} collected.`);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err: any) {
      setPosError(err.message || 'Failed to process transaction');
    }
  };

  // Calculate POS real-time figures
  const maxCapAllowed = Math.floor(posBillAmount * 0.5);
  const effectiveCoinsRedeemed = Math.min(posCoinsToRedeem, maxCapAllowed, posCustomerCoins);
  const netCashToPay = Math.max(0, posBillAmount - effectiveCoinsRedeemed);
  const estimatedPartnerCommission = Math.round((netCashToPay * activePartner.commissionRate) / 100);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-6">
      {/* Partner Header Strip */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-card border border-blue-700/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
              <Store className="w-7 h-7 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold">{activePartner.shopName}</h1>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                    activePartner.status === 'approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {activePartner.status}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Owner: {activePartner.ownerName} &bull; ID: <span className="font-mono font-bold text-white">{activePartner.partnerCode}</span>
              </p>
              <p className="text-[11px] text-blue-300">
                {activePartner.address}, {activePartner.district} - {activePartner.pinCode}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setIsBillingModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-b5-500 to-amber-500 hover:from-b5-600 hover:to-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Receipt className="w-4 h-4" />
              <span>In-Store Coin Billing</span>
            </button>

            <div className="bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-right">
              <span className="text-[10px] text-blue-300 block font-bold uppercase">Commission Rate</span>
              <span className="text-sm font-black text-white">{activePartner.commissionRate}%</span>
            </div>
            <div className="bg-black/30 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-right">
              <span className="text-[10px] text-amber-300 block font-bold uppercase">B5 Bonus</span>
              <span className="text-sm font-black text-amber-400">{activePartner.specialCoinBonusMultiplier}x</span>
            </div>
          </div>
        </div>
      </div>

      {statusNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-cream-300 gap-4 text-xs font-bold overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 border-b-2 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'border-blue-800 text-blue-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Partner Overview &amp; Sales
        </button>
        <button
          onClick={() => setActiveTab('instore')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'instore'
              ? 'border-blue-800 text-blue-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>In-Store Receipts ({localTxs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'orders'
              ? 'border-blue-800 text-blue-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Online Fulfillment ({partnerOrders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-2.5 border-b-2 transition-all shrink-0 ${
            activeTab === 'inventory'
              ? 'border-blue-800 text-blue-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Store Inventory
        </button>
        <button
          onClick={() => setActiveTab('settlement')}
          className={`pb-2.5 border-b-2 transition-all shrink-0 ${
            activeTab === 'settlement'
              ? 'border-blue-800 text-blue-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          Settlement &amp; Payout
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-bold uppercase block">Total Merchandise Sales</span>
              <span className="text-lg sm:text-xl font-black text-darkbrown-900 mt-1 block">
                ₹{activePartner.totalSales.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">+14% this month</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-bold uppercase block">Commission Earned</span>
              <span className="text-lg sm:text-xl font-black text-blue-900 mt-1 block">
                ₹{activePartner.totalCommissionPaid.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-blue-600 font-bold mt-1 block">Rate: {activePartner.commissionRate}%</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-bold uppercase block">In-Store B5 Transactions</span>
              <span className="text-lg sm:text-xl font-black text-b5-700 mt-1 block">
                {localTxs.length}
              </span>
              <span className="text-[10px] text-gray-500 font-bold mt-1 block">1 B5 Coin = ₹1</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
              <span className="text-[11px] text-gray-500 font-bold uppercase block">Unsettled Payout</span>
              <span className="text-lg sm:text-xl font-black text-amber-800 mt-1 block">
                ₹{activePartner.unsettledAmount.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-amber-700 font-bold mt-1 block">Available for withdrawal</span>
            </div>
          </div>

          {/* Special Promotional Multiplier Form */}
          <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-2xs">
            <h3 className="text-sm font-extrabold text-darkbrown-900 border-b border-cream-200 pb-2 mb-3">
              Configure Store B5 Coin Multiplier &amp; Local Offer
            </h3>
            <form onSubmit={handleUpdateSpecialOffer} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
              <div>
                <label className="block text-gray-600 font-bold mb-1">Coin Multiplier (e.g. 1.5x, 2.0x)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={activePartner.specialCoinBonusMultiplier}
                  onChange={(e) =>
                    setActivePartner({
                      ...activePartner,
                      specialCoinBonusMultiplier: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 bg-cream-50 border border-cream-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-bold mb-1">Store Banner Headline</label>
                <input
                  type="text"
                  value={activePartner.shopName}
                  disabled
                  className="w-full p-2 bg-gray-100 border border-gray-300 rounded-xl text-gray-600"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold transition-all"
              >
                Save Store Campaign
              </button>
            </form>
          </div>
        </div>
      )}

      {/* In-Store Receipts Tab */}
      {activeTab === 'instore' && (
        <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cream-200 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-darkbrown-900">
                In-Store B5 Coin Counter &amp; Verified Receipts
              </h3>
              <p className="text-xs text-gray-500">
                Local purchases honoring the 50% redemption ceiling &bull; Instant atomic wallet deduction &bull; Printed receipts
              </p>
            </div>
            <button
              onClick={() => setIsBillingModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-b5-600 to-amber-600 hover:from-b5-700 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 self-start"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New In-Store Billing</span>
            </button>
          </div>

          {localTxs.length === 0 ? (
            <div className="text-center py-10">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No in-store transactions recorded yet.</p>
              <button
                onClick={() => setIsBillingModalOpen(true)}
                className="mt-3 px-3 py-1.5 bg-blue-800 text-white rounded-xl text-xs font-bold"
              >
                Create First In-Store Bill
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {localTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 border border-cream-300 rounded-2xl bg-cream-50/40 text-xs space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-darkbrown-900 font-mono">
                        {tx.receiptNumber}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.2 rounded-full uppercase">
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-gray-700">
                      Customer: <strong className="text-darkbrown-900">{tx.customerName}</strong> ({tx.customerPhone})
                    </p>
                    {tx.notes && (
                      <p className="text-[11px] text-gray-500 italic">
                        "{tx.notes}"
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 font-mono">
                      {new Date(tx.createdAt).toLocaleString()} &bull; Partner ID: {tx.partnerId}
                    </p>
                  </div>

                  <div className="flex sm:flex-col sm:items-end justify-between items-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-cream-200">
                    <div className="text-right">
                      <div className="font-black text-sm text-magizh-900">
                        Total Bill: ₹{tx.eligiblePurchaseAmount}
                      </div>
                      <div className="text-[11px] text-amber-700 font-bold">
                        B5 Coins: -{tx.coinsRedeemed} (₹{tx.coinsRedeemed})
                      </div>
                      <div className="text-xs font-black text-darkbrown-900">
                        Cash Paid: ₹{tx.netCashPaid}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold">
                        Partner Commission: +₹{tx.partnerCommissionEarned}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedReceipt(tx)}
                      className="px-3 py-1.5 bg-white hover:bg-cream-100 border border-cream-300 rounded-xl text-darkbrown-800 font-bold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-gray-600" />
                      <span>View Receipt</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-cream-200 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-darkbrown-900">
                Store Dispatch &amp; Fulfillment Orders
              </h3>
              <p className="text-xs text-gray-500">Advance order stages to update customer timeline</p>
            </div>
            <span className="text-xs font-mono font-bold text-gray-500">{partnerOrders.length} orders</span>
          </div>

          <div className="space-y-3">
            {partnerOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 border border-cream-300 rounded-2xl bg-cream-50/40 text-xs space-y-2.5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-darkbrown-900 text-sm">{ord.orderNumber}</span>
                    <p className="text-gray-600 text-[11px]">
                      Customer: {ord.customerName} ({ord.customerPhone})
                    </p>
                    <p className="text-gray-500 text-[10px]">{ord.shippingAddress?.addressLine}, {ord.shippingAddress?.district}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-900 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                    {ord.orderStatus}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-cream-200">
                  <span className="font-black text-magizh-900 text-xs">Total: ₹{ord.finalPayableAmount}</span>

                  <div className="flex gap-1.5">
                    {ord.orderStatus === 'Confirmed' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'Processing')}
                        className="px-2.5 py-1 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800"
                      >
                        Accept &amp; Process
                      </button>
                    )}
                    {ord.orderStatus === 'Processing' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'Packed')}
                        className="px-2.5 py-1 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800"
                      >
                        Mark as Packed
                      </button>
                    )}
                    {ord.orderStatus === 'Packed' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'Shipped')}
                        className="px-2.5 py-1 bg-indigo-700 text-white rounded-lg text-xs font-bold hover:bg-indigo-800"
                      >
                        Dispatch / Ship
                      </button>
                    )}
                    {ord.orderStatus === 'Shipped' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'Delivered')}
                        className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-cream-200 pb-3">
            <h3 className="text-sm font-extrabold text-darkbrown-900">
              Assigned Store Inventory &amp; Stock Control
            </h3>
            <span className="text-xs text-gray-500">Live store stock levels</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.slice(0, 9).map((prod) => (
              <div
                key={prod.id}
                className="p-3 border border-cream-300 rounded-2xl bg-cream-50/40 flex gap-3 items-center text-xs"
              >
                <img
                  src={prod.images[0]}
                  alt={prod.name}
                  className="w-14 h-14 object-cover rounded-xl bg-white shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-darkbrown-900 truncate">{prod.name}</h4>
                  <p className="text-[11px] text-gray-500">{prod.variants[0]?.weight}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-black text-magizh-900">₹{prod.variants[0]?.price}</span>
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Stock: {prod.variants[0]?.stock}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settlement Tab */}
      {activeTab === 'settlement' && (
        <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-cream-200 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-darkbrown-900">
                Partner Settlement &amp; Payout Report
              </h3>
              <p className="text-xs text-gray-500">Automated net commission accounting</p>
            </div>
            <button
              onClick={() => alert('Payout request sent to Magizh finance desk!')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all"
            >
              Request Payout (₹{activePartner.unsettledAmount.toLocaleString('en-IN')})
            </button>
          </div>

          <div className="p-4 bg-cream-50 rounded-2xl border border-cream-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Fulfilled Merchandise:</span>
              <span className="font-bold">₹{activePartner.totalSales.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contracted Partner Commission ({activePartner.commissionRate}%):</span>
              <span className="font-bold text-blue-900">₹{activePartner.totalCommissionPaid.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-bold pt-2 border-t border-cream-300 text-sm">
              <span>Current Unsettled Balance:</span>
              <span>₹{activePartner.unsettledAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. IN-STORE POS BILLING & COIN REDEMPTION MODAL */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 border border-cream-300 shadow-2xl my-6">
            <div className="flex justify-between items-center border-b border-cream-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-darkbrown-900 flex items-center gap-1.5">
                  <Receipt className="w-5 h-5 text-b5-600" />
                  <span>In-Store Coin Billing &amp; POS</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Redeem customer B5 Coins (max 50% of bill) and generate an official store receipt
                </p>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="p-1 hover:bg-cream-100 rounded-full text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {posError && (
              <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{posError}</span>
              </div>
            )}

            <form onSubmit={handleProcessInStoreTransaction} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Customer Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={posCustomerPhone}
                  onChange={(e) => setPosCustomerPhone(e.target.value)}
                  placeholder="9840123456"
                  className="w-full p-2.5 bg-cream-50/50 border border-cream-300 rounded-xl font-bold text-sm"
                />
                {posCustomer ? (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
                    <span>Verified: {posCustomer.name}</span>
                    <span className="bg-emerald-100 px-2 py-0.2 rounded-full">
                      Wallet: {posCustomerCoins} B5 Coins
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Enter customer phone to look up their B5 Coin wallet.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Total Merchandise Bill (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={posBillAmount}
                  onChange={(e) => setPosBillAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-cream-50/50 border border-cream-300 rounded-xl font-black text-magizh-900 text-base"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Purchased Items Summary</label>
                <input
                  type="text"
                  value={posSummary}
                  onChange={(e) => setPosSummary(e.target.value)}
                  placeholder="e.g. 1kg Foxtail Millet, 500ml Wood Pressed Sesame Oil"
                  className="w-full p-2 bg-cream-50/50 border border-cream-300 rounded-xl text-xs"
                />
              </div>

              {/* B5 Coin Redemption Slider & Max Cap Display */}
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-amber-950 flex items-center gap-1">
                    <Coins className="w-4 h-4 text-b5-600" />
                    <span>B5 Coins to Redeem</span>
                  </span>
                  <span className="font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full text-[10px]">
                    Max Cap: {maxCapAllowed} Coins (50%)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max={Math.min(maxCapAllowed, posCustomerCoins)}
                    value={posCoinsToRedeem}
                    onChange={(e) => setPosCoinsToRedeem(Number(e.target.value))}
                    className="flex-1 accent-b5-600"
                  />
                  <input
                    type="number"
                    min="0"
                    max={Math.min(maxCapAllowed, posCustomerCoins)}
                    value={posCoinsToRedeem}
                    onChange={(e) => setPosCoinsToRedeem(Number(e.target.value))}
                    className="w-20 p-1.5 bg-white border border-amber-300 rounded-lg text-center font-black text-amber-950 text-sm"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-amber-800">
                  <span>1 B5 Coin = ₹1 Discount</span>
                  <span>Available Balance: {posCustomerCoins} Coins</span>
                </div>
              </div>

              {/* Real-time Billing Breakdown */}
              <div className="bg-cream-100/70 p-3 rounded-2xl border border-cream-300 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-700">
                  <span>Gross Store Bill:</span>
                  <span className="font-bold">₹{posBillAmount}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>B5 Coin Discount ({effectiveCoinsRedeemed} Coins):</span>
                  <span>-₹{effectiveCoinsRedeemed}</span>
                </div>
                <div className="flex justify-between text-magizh-900 font-black text-sm pt-1.5 border-t border-cream-300">
                  <span>Net Cash / UPI to Collect:</span>
                  <span>₹{netCashToPay}</span>
                </div>
                <div className="flex justify-between text-blue-800 text-[11px] font-bold">
                  <span>Partner Commission Earned ({activePartner.commissionRate}%):</span>
                  <span>+₹{estimatedPartnerCommission}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setIsBillingModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-cream-100 border border-cream-300 rounded-xl font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-b5-600 to-amber-600 hover:from-b5-700 hover:to-amber-700 text-white rounded-xl font-extrabold flex items-center gap-1.5 shadow-md"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Generate Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. RECEIPT VIEW / PRINT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-cream-300 shadow-2xl text-xs font-mono">
            {/* Printable Receipt Paper Container */}
            <div className="border border-cream-300 p-5 rounded-2xl bg-cream-50/50 space-y-3">
              <div className="text-center border-b border-dashed border-gray-300 pb-3">
                <div className="w-10 h-10 bg-magizh-800 text-white font-extrabold rounded-xl mx-auto flex items-center justify-center text-lg mb-1 font-sans">
                  M
                </div>
                <h3 className="font-extrabold text-sm text-darkbrown-900 tracking-tight font-sans">
                  MAGIZH SHOPPING + B5 COIN
                </h3>
                <p className="text-[10px] text-gray-500 font-sans">
                  Authorized Partner Shop: {selectedReceipt.partnerName} ({selectedReceipt.partnerId})
                </p>
                <div className="mt-2 inline-block bg-cream-200 px-2.5 py-0.5 rounded text-[10px] font-black font-mono">
                  RECEIPT #{selectedReceipt.receiptNumber}
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-gray-700 border-b border-dashed border-gray-300 pb-2">
                <div className="flex justify-between">
                  <span>Date &amp; Time:</span>
                  <span>{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{selectedReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mobile:</span>
                  <span>{selectedReceipt.customerPhone}</span>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="space-y-1 text-[11px] border-b border-dashed border-gray-300 pb-2">
                  <span className="font-bold block text-gray-500 uppercase text-[9px] font-sans">Item Details</span>
                  <p className="text-gray-800">{selectedReceipt.notes}</p>
                </div>
              )}

              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between">
                  <span>Total Bill Amount:</span>
                  <span className="font-bold">₹{selectedReceipt.eligiblePurchaseAmount}</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>B5 Coins Redeemed:</span>
                  <span className="font-bold">-{selectedReceipt.coinsRedeemed} Coins</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>Coin Discount (₹1/coin):</span>
                  <span className="font-bold">-₹{selectedReceipt.coinsRedeemed}</span>
                </div>
                <div className="flex justify-between text-darkbrown-900 font-extrabold text-sm pt-2 border-t border-gray-300">
                  <span>Net Cash Paid:</span>
                  <span>₹{selectedReceipt.netCashPaid}</span>
                </div>
                <div className="flex justify-between text-blue-800 text-[10px] pt-1">
                  <span>Partner Commission:</span>
                  <span>₹{selectedReceipt.partnerCommissionEarned}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-gray-400 font-sans pt-2 border-t border-dashed border-gray-300">
                Thank you for shopping at Magizh! &bull; B5 Rewards Powered
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 font-sans">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-cream-100 hover:bg-cream-200 border border-cream-300 rounded-xl font-bold text-darkbrown-800 text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-5 py-2 bg-darkbrown-900 hover:bg-darkbrown-950 text-white rounded-xl font-extrabold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
