import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Coins,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { StorageService, subscribe } from './src__services__storage';
import {
  creditOrderCompletionReward,
  processOrderCancellationReversal,
} from './src__services__rewardsEngine';
import { Order, OrderStatus, User } from './src__types__index';

interface OrderHistoryAndTrackingProps {
  onContinueShopping: () => void;
  selectedOrderId?: string;
}

const ORDER_STATUS_STEPS: OrderStatus[] = [
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Completed',
];

export const OrderHistoryAndTracking: React.FC<OrderHistoryAndTrackingProps> = ({
  onContinueShopping,
  selectedOrderId,
}) => {
  const currentUser: User = StorageService.getCurrentUser();
  const [orders, setOrders] = useState<Order[]>(
    StorageService.getOrders().filter((o) => o.customerId === currentUser.id)
  );
  const [expandedOrderId, setExpandedOrderId] = useState<string>(
    selectedOrderId || orders[0]?.id || ''
  );
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribe('ordersChanged', () => {
      setOrders(StorageService.getOrders().filter((o) => o.customerId === currentUser.id));
    });
    return () => unsub();
  }, [currentUser.id]);

  const handleStepForwardStatus = (order: Order) => {
    const currentIndex = ORDER_STATUS_STEPS.indexOf(order.orderStatus);
    if (currentIndex < ORDER_STATUS_STEPS.length - 1) {
      const nextStatus = ORDER_STATUS_STEPS[currentIndex + 1];
      const updatedOrder = StorageService.updateOrderStatus(
        order.id,
        nextStatus,
        `Status transitioned to ${nextStatus}`
      );

      // If moved to 'Completed', credit reward coins
      if (nextStatus === 'Completed' && updatedOrder && !updatedOrder.rewardCoinsCredited) {
        const coinAccount = StorageService.getCoinAccount(currentUser.id);
        const rewardResult = creditOrderCompletionReward(coinAccount, updatedOrder);
        if (rewardResult.success) {
          StorageService.saveCoinAccount(rewardResult.updatedAccount);
          if (rewardResult.transaction) {
            StorageService.recordCoinTransaction(rewardResult.transaction);
          }
          StorageService.createOrder(rewardResult.orderUpdated); // Update order record
          setActionNotice(`🎉 Order Completed! Credited ${updatedOrder.rewardCoinsEarned} B5 Coins to customer wallet!`);
        }
      } else {
        setActionNotice(`Order status advanced to "${nextStatus}"`);
      }

      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleCancelOrder = (order: Order) => {
    if (order.orderStatus === 'Cancelled') return;

    if (!confirm(`Are you sure you want to cancel Order #${order.orderNumber}? Any redeemed B5 Coins will be reversed to your balance.`)) {
      return;
    }

    // Update order status to Cancelled
    const updatedOrder = StorageService.updateOrderStatus(
      order.id,
      'Cancelled',
      'Cancelled by customer. Initiated coin reversal.'
    );

    if (updatedOrder) {
      // Process coin reversal
      const coinAccount = StorageService.getCoinAccount(currentUser.id);
      const reversalResult = processOrderCancellationReversal(coinAccount, updatedOrder);

      StorageService.saveCoinAccount(reversalResult.updatedAccount);
      reversalResult.transactions.forEach((tx) => StorageService.recordCoinTransaction(tx));

      setActionNotice(`Order #${order.orderNumber} Cancelled. Reversed ${order.coinsRedeemed} B5 Coins to wallet.`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Completed':
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Shipped':
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Confirmed':
      case 'Processing':
      case 'Packed':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Cancelled':
      case 'Refunded':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream-300 pb-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-darkbrown-900">
            Order History & Tracking
          </h1>
          <p className="text-xs text-gray-500">
            Track package delivery timelines and rewards status
          </p>
        </div>
        <button
          onClick={onContinueShopping}
          className="text-xs font-bold text-magizh-800 hover:underline"
        >
          Explore Catalog
        </button>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-cream-300 p-8 text-center space-y-3">
          <Package className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-darkbrown-900">No orders placed yet</h3>
          <p className="text-xs text-gray-500">Your completed purchases will appear here with live tracking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const currentStepIdx = ORDER_STATUS_STEPS.indexOf(order.orderStatus);

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-cream-300 overflow-hidden shadow-2xs hover:shadow-soft transition-all"
              >
                {/* Order Summary Strip */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? '' : order.id)}
                  className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer bg-cream-50/50 hover:bg-cream-100/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-magizh-100 text-magizh-800 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs sm:text-sm text-darkbrown-900">
                          {order.orderNumber}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getStatusBadge(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} &bull; {order.items.length} items
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs font-black text-magizh-900 block">
                        ₹{order.finalPayableAmount}
                      </span>
                      {order.coinsRedeemed > 0 && (
                        <span className="text-[10px] text-b5-700 font-bold">
                          -₹{order.coinsRedeemed} B5 Coins
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 border-t border-cream-200 space-y-6 animate-in fade-in">
                    {/* Live Tracking Visual Stepper */}
                    {order.orderStatus !== 'Cancelled' && (
                      <div className="bg-cream-50/80 p-4 rounded-2xl border border-cream-200">
                        <h4 className="text-xs font-extrabold text-darkbrown-900 uppercase tracking-tight mb-3">
                          Live Shipment Tracking
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-[10px]">
                          {ORDER_STATUS_STEPS.map((step, idx) => {
                            const isDone = currentStepIdx >= idx;
                            const isCurrent = order.orderStatus === step;

                            return (
                              <div key={step} className="flex flex-col items-center">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold mb-1 transition-all ${
                                    isDone
                                      ? 'bg-magizh-700 text-white shadow-sm'
                                      : 'bg-cream-300 text-gray-500'
                                  } ${isCurrent ? 'ring-4 ring-magizh-200 scale-110' : ''}`}
                                >
                                  {isDone ? '✓' : idx + 1}
                                </div>
                                <span
                                  className={`leading-tight ${
                                    isCurrent
                                      ? 'font-black text-magizh-900'
                                      : isDone
                                      ? 'font-bold text-darkbrown-800'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Demo Status Transition Helper Button */}
                        {currentStepIdx < ORDER_STATUS_STEPS.length - 1 && (
                          <div className="mt-4 pt-3 border-t border-cream-300/80 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-gray-500 italic">
                              Demo Simulator: Step order status forward to test reward coin triggers:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStepForwardStatus(order)}
                              className="px-3 py-1 bg-magizh-800 hover:bg-magizh-900 text-white rounded-lg text-xs font-bold transition-all"
                            >
                              Advance to "{ORDER_STATUS_STEPS[currentStepIdx + 1]}" &rarr;
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Items Purchased */}
                    <div>
                      <h4 className="text-xs font-extrabold text-darkbrown-900 uppercase tracking-tight mb-2">
                        Items in this Order
                      </h4>
                      <div className="space-y-2">
                        {order.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 bg-cream-50/50 rounded-xl border border-cream-200 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={it.image}
                                alt={it.name}
                                className="w-10 h-10 object-cover rounded-lg bg-white shrink-0"
                              />
                              <div>
                                <span className="font-bold text-darkbrown-900 block truncate max-w-xs">
                                  {it.name}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  Pack: {it.variantWeight} &bull; Qty: {it.quantity}
                                </span>
                              </div>
                            </div>
                            <span className="font-black text-darkbrown-800">
                              ₹{it.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping & Payment Meta */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                        <span className="font-bold text-darkbrown-900 block mb-1">
                          Delivery Address:
                        </span>
                        <p className="text-gray-700">{order.shippingAddress.name} ({order.shippingAddress.phone})</p>
                        <p className="text-gray-600">{order.shippingAddress.addressLine}</p>
                        <p className="text-gray-600">{order.shippingAddress.district} - {order.shippingAddress.pinCode}</p>
                      </div>

                      <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                        <span className="font-bold text-darkbrown-900 block mb-1">
                          Payment Breakdown:
                        </span>
                        <div className="space-y-1 text-[11px] text-gray-600">
                          <div className="flex justify-between">
                            <span>Merchandise Subtotal:</span>
                            <span className="font-bold">₹{order.merchandiseSubtotal}</span>
                          </div>
                          {order.coinsRedeemed > 0 && (
                            <div className="flex justify-between text-b5-700 font-bold">
                              <span>B5 Coins Discount:</span>
                              <span>-₹{order.coinsRedeemed}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-darkbrown-900 font-black pt-1 border-t border-cream-300">
                            <span>Paid via {order.paymentMethod}:</span>
                            <span className="text-magizh-900">₹{order.finalPayableAmount}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reward Coins Status */}
                    <div className="p-3 bg-b5-50 border border-b5-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-b5-600 shrink-0" />
                        <div>
                          <span className="font-bold text-b5-900">
                            Reward: {order.rewardCoinsEarned} B5 Coins
                          </span>
                          <p className="text-[10px] text-darkbrown-700">
                            {order.rewardCoinsCredited
                              ? '✓ Successfully credited into customer wallet upon order completion'
                              : 'Pending delivery completion'}
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        order.rewardCoinsCredited ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.rewardCoinsCredited ? 'Credited' : 'Pending'}
                      </span>
                    </div>

                    {/* Cancellation Action */}
                    {order.orderStatus !== 'Cancelled' && order.orderStatus !== 'Completed' && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(order)}
                          className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Cancel Order & Reverse Coins</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
