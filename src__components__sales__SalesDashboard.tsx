import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  TrendingUp,
  Package,
  Coins,
  MapPin,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { StorageService, subscribe } from '../../services/storage';
import { Order, Product, PartnerShop } from '../../types';

export const SalesDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(StorageService.getOrders());
  const [products, setProducts] = useState<Product[]>(StorageService.getProducts());
  const [partners, setPartners] = useState<PartnerShop[]>(StorageService.getPartners());
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribe('ordersChanged', (newOrders: Order[]) => {
      setOrders(newOrders);
    });
    return () => unsub();
  }, []);

  // Aggregated Sales Metrics
  const totalOrdersCount = orders.length;
  const completedOrders = orders.filter((o) => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered');
  const cancelledOrders = orders.filter((o) => o.orderStatus === 'Cancelled');
  const pendingOrders = orders.filter((o) => o.orderStatus !== 'Completed' && o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled');

  const grossSales = orders
    .filter((o) => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + o.merchandiseSubtotal, 0);

  const netSales = orders
    .filter((o) => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + o.finalPayableAmount, 0);

  const totalCoinsRedeemed = orders
    .filter((o) => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + o.coinsRedeemed, 0);

  const totalCoinsEarned = orders
    .filter((o) => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + o.rewardCoinsEarned, 0);

  // District Breakdown
  const districtMap: Record<string, { count: number; sales: number }> = {};
  orders.forEach((o) => {
    const dist = o.shippingAddress?.district || 'Chennai';
    if (!districtMap[dist]) districtMap[dist] = { count: 0, sales: 0 };
    districtMap[dist].count += 1;
    districtMap[dist].sales += o.finalPayableAmount;
  });

  // Product-wise sales breakdown
  const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (o.orderStatus !== 'Cancelled') {
      o.items.forEach((it) => {
        if (!productMap[it.name]) {
          productMap[it.name] = { name: it.name, quantity: 0, revenue: 0 };
        }
        productMap[it.name].quantity += it.quantity;
        productMap[it.name].revenue += it.total;
      });
    }
  });

  const handleExportCSV = () => {
    const rows = [
      ['Order Number', 'Date', 'Customer', 'District', 'Subtotal', 'Coins Redeemed', 'Final Paid', 'Status'],
      ...orders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleDateString(),
        o.customerName,
        o.shippingAddress?.district || 'Chennai',
        o.merchandiseSubtotal,
        o.coinsRedeemed,
        o.finalPayableAmount,
        o.orderStatus,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `magizh_sales_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice('Exported sales ledger report to CSV successfully!');
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-6">
      {/* Sales Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cream-300 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-black text-darkbrown-900">
              Sales & Territory Analytics
            </h1>
            <span className="text-xs bg-magizh-100 text-magizh-900 border border-magizh-300 font-extrabold px-2 py-0.5 rounded-full">
              Live Ecosystem Data
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Real-time orders, merchandise volume, coin redemption ratio, and district heatmaps
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex bg-white border border-cream-300 rounded-xl p-0.5 text-xs font-semibold">
            {(['daily', 'weekly', 'monthly', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded-lg capitalize transition-all ${
                  timeframe === t
                    ? 'bg-magizh-800 text-white font-bold'
                    : 'text-gray-600 hover:text-darkbrown-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-magizh-800 hover:bg-magizh-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
          <span className="text-[11px] text-gray-500 font-semibold block">Gross Merchandise Sales</span>
          <span className="text-xl sm:text-2xl font-black text-darkbrown-900 mt-1 block">
            ₹{grossSales.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
            Before coupon & coin deduction
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
          <span className="text-[11px] text-gray-500 font-semibold block">Net Paid Revenue</span>
          <span className="text-xl sm:text-2xl font-black text-magizh-900 mt-1 block">
            ₹{netSales.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-gray-500 font-semibold mt-1 block">
            Realized cash collection
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
          <span className="text-[11px] text-gray-500 font-semibold block">Orders Breakdown</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-black text-darkbrown-900">
              {totalOrdersCount}
            </span>
            <span className="text-[11px] text-gray-400">total</span>
          </div>
          <div className="flex gap-2 text-[10px] mt-1 font-bold">
            <span className="text-emerald-700">{completedOrders.length} Completed</span>
            <span className="text-amber-700">{pendingOrders.length} Pending</span>
            <span className="text-red-600">{cancelledOrders.length} Cancelled</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-2xs">
          <span className="text-[11px] text-gray-500 font-semibold block">B5 Coins Balance Flow</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-black text-b5-700">
              {totalCoinsRedeemed}
            </span>
            <span className="text-[11px] text-gray-400">redeemed</span>
          </div>
          <span className="text-[10px] text-purple-700 font-bold mt-1 block">
            +{totalCoinsEarned} Coins credited on delivery
          </span>
        </div>
      </div>

      {/* Grid: District-wise Sales & Product-wise Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District-wise & PIN Performance */}
        <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-cream-200 pb-3">
            <MapPin className="w-4 h-4 text-magizh-700" />
            <h3 className="text-sm font-extrabold text-darkbrown-900">
              District-Wise Order Distribution
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.entries(districtMap).map(([district, stats]) => {
              const percent = Math.round((stats.sales / (netSales || 1)) * 100);
              return (
                <div key={district} className="space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-darkbrown-900">{district} ({stats.count} orders)</span>
                    <span className="text-magizh-900 font-mono">₹{stats.sales} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-cream-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-magizh-700 h-full rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product-Wise Sales */}
        <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-cream-200 pb-3">
            <Package className="w-4 h-4 text-b5-600" />
            <h3 className="text-sm font-extrabold text-darkbrown-900">
              Top Selling Products
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.values(productMap).map((prod) => (
              <div
                key={prod.name}
                className="flex items-center justify-between p-2.5 bg-cream-50/50 rounded-xl border border-cream-200"
              >
                <div>
                  <span className="font-bold text-darkbrown-900 block truncate max-w-[220px]">
                    {prod.name}
                  </span>
                  <span className="text-[11px] text-gray-500 font-semibold">
                    {prod.quantity} units fulfilled
                  </span>
                </div>
                <span className="font-black text-magizh-900 font-mono">
                  ₹{prod.revenue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Partner Performance Summary */}
      <div className="bg-white rounded-3xl border border-cream-300 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-cream-200 pb-3">
          <h3 className="text-sm font-extrabold text-darkbrown-900">
            Partner Store Network Performance
          </h3>
          <span className="text-xs text-gray-500">Commission & sales summary</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {partners.map((ptr) => (
            <div
              key={ptr.id}
              className="p-3.5 border border-cream-200 rounded-2xl bg-cream-50/30 space-y-1.5"
            >
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-darkbrown-900 truncate">{ptr.shopName}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                  {ptr.district}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Partner Code: {ptr.partnerCode}</p>
              <div className="flex justify-between pt-1 border-t border-cream-200 font-bold">
                <span className="text-gray-600">Total Sales:</span>
                <span className="text-magizh-900 font-mono">₹{ptr.totalSales}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
