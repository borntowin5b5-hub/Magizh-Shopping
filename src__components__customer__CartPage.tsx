import React, { useState, useEffect } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, Check, Sparkles, AlertCircle } from 'lucide-react';
import { StorageService, subscribe } from '../../services/storage';
import { CartItem, Coupon } from '../../types';

interface CartPageProps {
  onProceedToCheckout: (coupon?: Coupon) => void;
  onContinueShopping: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  onProceedToCheckout,
  onContinueShopping,
}) => {
  const [cart, setCart] = useState<CartItem[]>(StorageService.getCart());
  const [coupons, setCoupons] = useState<Coupon[]>(StorageService.getCoupons());
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    const unsub = subscribe('cartChanged', (newCart: CartItem[]) => {
      setCart(newCart);
    });
    return () => unsub();
  }, []);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalOriginal = cart.reduce((acc, item) => acc + item.originalPrice * item.quantity, 0);
  const productSavings = totalOriginal - subtotal;

  // Calculate coupon discount
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (subtotal < appliedCoupon.minOrderValue) {
      // invalid now
      setAppliedCoupon(null);
      setCouponError(`Min order value of ₹${appliedCoupon.minOrderValue} required for ${appliedCoupon.code}`);
    } else {
      if (appliedCoupon.discountType === 'fixed') {
        couponDiscount = appliedCoupon.discountValue;
      } else {
        const percentAmount = (subtotal * appliedCoupon.discountValue) / 100;
        couponDiscount = appliedCoupon.maxDiscount
          ? Math.min(percentAmount, appliedCoupon.maxDiscount)
          : percentAmount;
      }
    }
  }

  const eligibleAmount = Math.max(0, subtotal - couponDiscount);
  const deliveryCharge = eligibleAmount >= 500 || eligibleAmount === 0 ? 0 : 40;
  const grandTotal = eligibleAmount + deliveryCharge;

  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    setCouponError('');

    if (!code) return;

    const coupon = coupons.find((c) => c.code === code && c.active);
    if (!coupon) {
      setCouponError('Invalid or expired coupon code');
      return;
    }

    if (subtotal < coupon.minOrderValue) {
      setCouponError(`Add items worth ₹${coupon.minOrderValue - subtotal} more to apply ${code}`);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponCode('');
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-20 h-20 bg-cream-200 rounded-full flex items-center justify-center mx-auto text-magizh-800">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-extrabold text-darkbrown-900">Your Shopping Cart is Empty</h2>
        <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
          Explore our range of traditional millets, stone-ground podi varieties, and natural cold pressed oils.
        </p>
        <button
          onClick={onContinueShopping}
          className="mt-2 inline-flex items-center gap-2 px-6 py-3 bg-magizh-800 hover:bg-magizh-900 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all"
        >
          <span>Start Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-6">
      <div className="flex items-center justify-between border-b border-cream-300 pb-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-darkbrown-900">
            Shopping Cart ({cart.reduce((a, b) => a + b.quantity, 0)} Items)
          </h1>
          <p className="text-xs text-gray-500">Step 4 of Purchase Flow: Review Cart & Offers</p>
        </div>
        <button
          onClick={() => StorageService.clearCart()}
          className="text-xs text-red-600 hover:underline font-semibold"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-2 space-y-3">
          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.variantWeight}`}
              className="bg-white rounded-2xl border border-cream-300 p-3.5 sm:p-4 shadow-2xs flex gap-3.5 items-center"
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl bg-cream-50 shrink-0"
              />

              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-magizh-800 uppercase tracking-wider block">
                  {item.category}
                </span>
                <h3 className="font-extrabold text-xs sm:text-sm text-darkbrown-900 truncate">
                  {item.name}
                </h3>
                <p className="text-xs font-semibold text-gray-500 mt-0.5">
                  Pack: <span className="text-darkbrown-800">{item.variantWeight}</span>
                </p>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-sm sm:text-base font-black text-magizh-900">
                    ₹{item.price * item.quantity}
                  </span>
                  {item.originalPrice > item.price && (
                    <span className="text-xs text-gray-400 line-through">
                      ₹{item.originalPrice * item.quantity}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 font-medium">
                    (₹{item.price} each)
                  </span>
                </div>
              </div>

              {/* Quantity Controls & Delete */}
              <div className="flex flex-col items-end gap-3 shrink-0">
                <button
                  onClick={() => StorageService.updateCartQuantity(item.productId, item.variantWeight, 0)}
                  className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center border border-cream-300 rounded-xl bg-cream-50 overflow-hidden">
                  <button
                    onClick={() =>
                      StorageService.updateCartQuantity(item.productId, item.variantWeight, item.quantity - 1)
                    }
                    className="p-1.5 hover:bg-cream-200 text-darkbrown-800"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2.5 text-xs font-bold text-darkbrown-900 font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      StorageService.updateCartQuantity(item.productId, item.variantWeight, item.quantity + 1)
                    }
                    className="p-1.5 hover:bg-cream-200 text-darkbrown-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Savings Highlight */}
          {productSavings > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You are saving ₹{productSavings} on original MRP with Magizh direct prices!</span>
            </div>
          )}
        </div>

        {/* Right: Coupon & Order Summary */}
        <div className="space-y-4">
          {/* Coupon Code Box */}
          <div className="bg-white rounded-2xl border border-cream-300 p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-b5-600" />
              <h2 className="text-xs font-extrabold text-darkbrown-900 uppercase tracking-tight">
                Apply Coupon Code
              </h2>
            </div>

            {appliedCoupon ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-emerald-800 font-mono">
                    {appliedCoupon.code}
                  </span>
                  <p className="text-[11px] text-emerald-700">
                    Saved ₹{couponDiscount} with this coupon!
                  </p>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 px-3 py-2 text-xs border border-cream-300 rounded-xl uppercase font-mono font-bold focus:ring-2 focus:ring-magizh-700 focus:outline-none"
                  />
                  <button
                    onClick={() => handleApplyCoupon()}
                    className="px-4 py-2 bg-magizh-800 hover:bg-magizh-900 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Apply
                  </button>
                </div>

                {couponError && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{couponError}</span>
                  </p>
                )}

                {/* Available Coupons list */}
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Available Offers:
                  </p>
                  <div className="space-y-1.5">
                    {coupons.map((c) => (
                      <div
                        key={c.code}
                        onClick={() => handleApplyCoupon(c.code)}
                        className="p-2 border border-dashed border-b5-300 rounded-xl bg-b5-50/50 hover:bg-b5-50 cursor-pointer text-xs flex justify-between items-center transition-colors"
                      >
                        <div>
                          <span className="font-mono font-black text-b5-800 text-[11px]">
                            {c.code}
                          </span>
                          <p className="text-[10px] text-gray-600">{c.description}</p>
                        </div>
                        <span className="text-[10px] font-bold text-b5-700 hover:underline">
                          Tap to Apply
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="bg-white rounded-2xl border border-cream-300 p-4 shadow-2xs space-y-3">
            <h2 className="text-xs font-extrabold text-darkbrown-900 uppercase tracking-tight border-b border-cream-200 pb-2">
              Order Breakdown
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Merchandise Subtotal</span>
                <span className="font-bold text-darkbrown-900">₹{subtotal}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Eligible Merchandise for B5 Coins</span>
                <span className="font-bold text-b5-800">₹{eligibleAmount}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Delivery Charges</span>
                <span>
                  {deliveryCharge === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE (Above ₹500)</span>
                  ) : (
                    <span className="font-bold text-darkbrown-900">₹40</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Taxes & GST (Included in MRP)</span>
                <span className="text-gray-400">₹0 extra</span>
              </div>

              <div className="border-t border-cream-200 pt-2 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-black text-darkbrown-900 block">Subtotal Payable</span>
                  <span className="text-[10px] text-b5-700 font-bold">
                    B5 Coin redemption (up to 50%) applied at next step
                  </span>
                </div>
                <span className="text-lg font-black text-magizh-900">
                  ₹{grandTotal}
                </span>
              </div>
            </div>

            <button
              onClick={() => onProceedToCheckout(appliedCoupon || undefined)}
              className="w-full py-3 bg-gradient-to-r from-b5-600 to-b5-700 hover:from-b5-700 hover:to-b5-800 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
