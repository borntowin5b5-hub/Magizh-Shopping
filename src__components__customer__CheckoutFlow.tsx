import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Coins,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Truck,
  Plus,
  Receipt,
  Sparkles,
  Smartphone,
  Building,
  Banknote,
  Clock,
} from 'lucide-react';
import { StorageService } from './src__services__storage';
import {
  calculateMaxRedemption,
  validateCoinRedemption,
  processCoinDeduction,
  calculateRewardCoins,
} from './src__services__rewardsEngine';
import {
  User,
  Address,
  CartItem,
  Coupon,
  Order,
  PaymentMethod,
  B5CoinAccount,
} from './src__types__index';

interface CheckoutFlowProps {
  coupon?: Coupon;
  onOrderSuccess: (order: Order) => void;
  onCancel: () => void;
}

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({
  coupon,
  onOrderSuccess,
  onCancel,
}) => {
  const currentUser: User = StorageService.getCurrentUser();
  const cart: CartItem[] = StorageService.getCart();
  const coinRules = StorageService.getCoinRules();
  const [coinAccount, setCoinAccount] = useState<B5CoinAccount>(
    StorageService.getCoinAccount(currentUser.id)
  );

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>(currentUser.addresses || []);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses.find((a) => a.isDefault)?.id || addresses[0]?.id || ''
  );
  const [showNewAddressModal, setShowNewAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    name: currentUser.name,
    phone: currentUser.mobile,
    district: 'Chennai',
    state: 'Tamil Nadu',
    addressLine: '',
    pinCode: '600020',
    landmark: '',
  });

  // Calculate pricing
  const merchandiseSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  let couponDiscount = 0;
  if (coupon && merchandiseSubtotal >= coupon.minOrderValue) {
    if (coupon.discountType === 'fixed') {
      couponDiscount = coupon.discountValue;
    } else {
      const discount = (merchandiseSubtotal * coupon.discountValue) / 100;
      couponDiscount = coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
    }
  }

  // Eligible amount for coin redemption (merchandise subtotal after discount, excluding delivery/taxes)
  const eligibleAmount = Math.max(0, merchandiseSubtotal - couponDiscount);
  const deliveryCharge = eligibleAmount >= 500 || eligibleAmount === 0 ? 0 : 40;
  const taxAmount = 0; // Included in MRP

  // B5 Coin Redemption Calculation
  const { maxCapAllowed, maxRedeemableCoins } = calculateMaxRedemption(
    eligibleAmount,
    coinAccount.availableBalance,
    coinRules.maxRedemptionCapPercentage
  );

  // User selected coins to redeem (Defaults to maximum allowable or 0)
  const [coinsToRedeem, setCoinsToRedeem] = useState<number>(maxRedeemableCoins);
  const [redemptionError, setRedemptionError] = useState<string>('');

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  // Recalculate if values change
  useEffect(() => {
    const val = validateCoinRedemption(
      coinsToRedeem,
      eligibleAmount,
      coinAccount.availableBalance,
      coinRules.maxRedemptionCapPercentage
    );
    if (!val.valid) {
      setRedemptionError(val.error || 'Invalid coin amount');
    } else {
      setRedemptionError('');
    }
  }, [coinsToRedeem, eligibleAmount, coinAccount.availableBalance, coinRules.maxRedemptionCapPercentage]);

  // Final Calculations
  const coinDiscountAmount = Math.min(coinsToRedeem, maxRedeemableCoins);
  const finalPayableAmount = Math.max(0, eligibleAmount - coinDiscountAmount + deliveryCharge);
  const estimatedRewardCoins = calculateRewardCoins(eligibleAmount, coinRules);

  const handleApplyMaxCoins = () => {
    setCoinsToRedeem(maxRedeemableCoins);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.addressLine || !newAddress.pinCode) return;

    const createdAddress: Address = {
      id: `addr-${Date.now()}`,
      name: newAddress.name || currentUser.name,
      phone: newAddress.phone || currentUser.mobile,
      addressLine: newAddress.addressLine || '',
      district: newAddress.district || 'Chennai',
      pinCode: newAddress.pinCode || '',
      state: 'Tamil Nadu',
      isDefault: addresses.length === 0,
      landmark: newAddress.landmark,
    };

    const updated = [...addresses, createdAddress];
    setAddresses(updated);
    setSelectedAddressId(createdAddress.id);

    // Save to user
    const updatedUser = { ...currentUser, addresses: updated };
    StorageService.saveUser(updatedUser);
    setShowNewAddressModal(false);
  };

  const handlePlaceOrder = () => {
    const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
    if (!selectedAddress) {
      alert('Please select or add a delivery address');
      return;
    }

    if (redemptionError) {
      alert(redemptionError);
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      // 1. Process coin deduction atomically
      const deductionResult = processCoinDeduction(
        coinAccount,
        coinsToRedeem,
        eligibleAmount,
        '',
        coinRules.maxRedemptionCapPercentage
      );

      if (!deductionResult.success) {
        setIsProcessing(false);
        alert(deductionResult.error || 'Failed to redeem coins');
        return;
      }

      const uniqueOrderNumber = `MAG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      // 2. Save updated coin account & ledger
      if (deductionResult.transaction) {
        deductionResult.transaction.orderNumber = uniqueOrderNumber;
        StorageService.recordCoinTransaction(deductionResult.transaction);
      }
      StorageService.saveCoinAccount(deductionResult.updatedAccount);
      setCoinAccount(deductionResult.updatedAccount);

      // 3. Assemble and create Order
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: uniqueOrderNumber,
        customerId: currentUser.id,
        customerName: currentUser.name,
        customerPhone: currentUser.mobile,
        shippingAddress: selectedAddress,
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          variantWeight: item.variantWeight,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          image: item.image,
        })),
        merchandiseSubtotal,
        couponCode: coupon?.code,
        couponDiscount,
        eligibleMerchandiseAmount: eligibleAmount,
        coinsRedeemed: coinsToRedeem,
        coinDiscountAmount,
        deliveryCharge,
        taxAmount,
        finalPayableAmount,
        paymentMethod,
        paymentStatus: 'Paid', // In demo mock mode, automatically marks as paid
        orderStatus: 'Confirmed',
        rewardCoinsEarned: estimatedRewardCoins,
        rewardCoinsCredited: false, // credited upon order delivery/completion!
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timeline: [
          {
            status: 'Confirmed',
            timestamp: new Date().toISOString(),
            note: `Order placed successfully. Mock payment of ₹${finalPayableAmount} verified via ${paymentMethod}.`,
          },
        ],
      };

      StorageService.createOrder(newOrder);
      StorageService.clearCart();
      setIsProcessing(false);
      setConfirmedOrder(newOrder);
      onOrderSuccess(newOrder);
    }, 800);
  };

  // If order confirmed, show celebration & receipt view
  if (confirmedOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 text-center space-y-6 animate-in zoom-in-95">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-wider text-b5-700 bg-b5-100 px-3 py-1 rounded-full">
            Payment Verified &bull; Order Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-darkbrown-900 mt-2">
            Nandri! Order #{confirmedOrder.orderNumber} Placed
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            We are preparing your fresh farm millets and organic groceries for dispatch.
          </p>
        </div>

        {/* Order Receipt Box */}
        <div className="bg-white rounded-3xl border border-cream-300 p-5 sm:p-6 text-left shadow-card space-y-4">
          <div className="flex justify-between items-center border-b border-cream-200 pb-3">
            <div>
              <span className="text-xs text-gray-500">Order Number</span>
              <p className="text-sm font-black font-mono text-darkbrown-900">
                {confirmedOrder.orderNumber}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">Estimated Delivery</span>
              <p className="text-xs font-bold text-emerald-800">2-3 Business Days</p>
            </div>
          </div>

          {/* Items brief */}
          <div className="space-y-2 border-b border-cream-200 pb-3">
            {confirmedOrder.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-darkbrown-900 font-semibold truncate max-w-[200px] sm:max-w-xs">
                  {it.quantity}x {it.name} ({it.variantWeight})
                </span>
                <span className="font-bold text-darkbrown-800">₹{it.total}</span>
              </div>
            ))}
          </div>

          {/* Pricing summary */}
          <div className="space-y-1.5 text-xs text-gray-700 border-b border-cream-200 pb-3">
            <div className="flex justify-between">
              <span>Merchandise Subtotal</span>
              <span className="font-bold">₹{confirmedOrder.merchandiseSubtotal}</span>
            </div>
            {confirmedOrder.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon ({confirmedOrder.couponCode})</span>
                <span>-₹{confirmedOrder.couponDiscount}</span>
              </div>
            )}
            {confirmedOrder.coinsRedeemed > 0 && (
              <div className="flex justify-between text-b5-700 font-bold">
                <span>B5 Coins Redeemed (1 Coin = ₹1)</span>
                <span>-₹{confirmedOrder.coinsRedeemed}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Charge</span>
              <span>{confirmedOrder.deliveryCharge === 0 ? 'FREE' : `₹${confirmedOrder.deliveryCharge}`}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-darkbrown-900 pt-1">
              <span>Amount Paid via {confirmedOrder.paymentMethod}</span>
              <span className="text-magizh-900">₹{confirmedOrder.finalPayableAmount}</span>
            </div>
          </div>

          {/* Rewards Notice */}
          <div className="bg-gradient-to-r from-b5-50 to-amber-50 border border-b5-200 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-b5-600 text-white flex items-center justify-center shrink-0 shadow-inner">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-black text-b5-900 block">
                +{confirmedOrder.rewardCoinsEarned} B5 Coins Pending!
              </span>
              <span className="text-darkbrown-700">
                Reward coins will be credited into your wallet as soon as the package is delivered.
              </span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="text-xs text-gray-600">
            <span className="font-bold text-darkbrown-900 block">Delivering To:</span>
            <p>{confirmedOrder.shippingAddress.name} ({confirmedOrder.shippingAddress.phone})</p>
            <p>{confirmedOrder.shippingAddress.addressLine}, {confirmedOrder.shippingAddress.district} - {confirmedOrder.shippingAddress.pinCode}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onOrderSuccess(confirmedOrder)}
            className="flex-1 py-3 bg-magizh-800 hover:bg-magizh-900 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>Track Live Order Status</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-28 space-y-6">
      {/* Checkout Progress Stepper */}
      <div className="bg-white rounded-2xl border border-cream-300 p-4 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-bold text-darkbrown-900">
          <div className="flex items-center gap-1.5 text-magizh-800">
            <span className="w-5 h-5 rounded-full bg-magizh-800 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Cart</span>
          </div>
          <div className="h-0.5 w-8 bg-magizh-700" />
          <div className="flex items-center gap-1.5 text-magizh-800 font-extrabold">
            <span className="w-5 h-5 rounded-full bg-magizh-800 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Address & B5 Coins</span>
          </div>
          <div className="h-0.5 w-8 bg-cream-300" />
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="w-5 h-5 rounded-full bg-cream-300 text-gray-600 flex items-center justify-center text-[10px]">3</span>
            <span>Payment</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Address & Payment Selection */}
        <div className="lg:col-span-2 space-y-5">
          {/* Step 6: Select Delivery Address */}
          <div className="bg-white rounded-2xl border border-cream-300 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-cream-200 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-magizh-700" />
                <h3 className="text-xs sm:text-sm font-extrabold text-darkbrown-900 uppercase tracking-tight">
                  Delivery Address
                </h3>
              </div>
              <button
                onClick={() => setShowNewAddressModal(true)}
                className="text-xs font-bold text-magizh-800 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New</span>
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 mb-2">No saved address found</p>
                <button
                  onClick={() => setShowNewAddressModal(true)}
                  className="px-4 py-2 bg-magizh-800 text-white rounded-xl text-xs font-bold"
                >
                  Add Address Now
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-magizh-700 bg-magizh-50/60 ring-2 ring-magizh-600/30'
                        : 'border-cream-300 hover:border-cream-400 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 text-magizh-700 focus:ring-magizh-600"
                      />
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-darkbrown-900">{addr.name}</span>
                          <span className="text-gray-500 font-mono">({addr.phone})</span>
                          {addr.isDefault && (
                            <span className="bg-cream-200 text-darkbrown-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-0.5">{addr.addressLine}</p>
                        <p className="text-gray-500 text-[11px]">
                          {addr.district}, {addr.state} - <span className="font-mono font-bold">{addr.pinCode}</span>
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Step 8: B5 COIN REDEMPTION ENGINE */}
          <div className="bg-gradient-to-br from-b5-50 via-white to-amber-50 rounded-2xl border-2 border-b5-300 p-4 sm:p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-b5-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-b5-600 text-white flex items-center justify-center font-black shadow-sm">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-b5-900 uppercase tracking-tight">
                    Redeem B5 Coins
                  </h3>
                  <span className="text-[11px] text-darkbrown-700 block">
                    1 B5 Coin = ₹1 Redemption Discount
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Your Balance</span>
                <span className="text-sm font-black text-b5-700">
                  {coinAccount.availableBalance} Coins
                </span>
              </div>
            </div>

            {/* Crucial 50% Cap Rule Explanation Card */}
            <div className="bg-white/80 rounded-xl p-3 border border-b5-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-600">Eligible Merchandise Amount:</span>
                <span className="font-extrabold text-darkbrown-900 font-mono">₹{eligibleAmount}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-600">Max Redemption Limit ({coinRules.maxRedemptionCapPercentage}% Cap):</span>
                <span className="font-extrabold text-b5-800 font-mono">₹{maxCapAllowed}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] pt-1 border-t border-cream-200">
                <span className="font-bold text-darkbrown-900">Maximum Coins You Can Spend Now:</span>
                <span className="font-black text-emerald-800 font-mono text-xs">
                  {maxRedeemableCoins} Coins (₹{maxRedeemableCoins})
                </span>
              </div>
            </div>

            {/* Slider & Input Controls */}
            {maxRedeemableCoins > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-darkbrown-800">
                    Coins to Redeem:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-b5-800">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={maxRedeemableCoins}
                      value={coinsToRedeem}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setCoinsToRedeem(Math.max(0, val));
                      }}
                      className="w-24 text-center font-mono font-bold text-sm py-1 border border-b5-300 rounded-lg focus:ring-2 focus:ring-b5-600 focus:outline-none"
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={maxRedeemableCoins}
                  value={coinsToRedeem}
                  onChange={(e) => setCoinsToRedeem(Number(e.target.value))}
                  className="w-full accent-b5-600 cursor-pointer"
                />

                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleApplyMaxCoins}
                    className="flex-1 py-1.5 bg-b5-600 hover:bg-b5-700 text-white rounded-lg font-bold shadow-2xs transition-all"
                  >
                    Use Max ({maxRedeemableCoins} Coins)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoinsToRedeem(Math.floor(maxRedeemableCoins / 2))}
                    className="flex-1 py-1.5 bg-cream-200 hover:bg-cream-300 text-darkbrown-900 rounded-lg font-semibold transition-all"
                  >
                    Use 50% ({Math.floor(maxRedeemableCoins / 2)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoinsToRedeem(0)}
                    className="px-3 py-1.5 border border-cream-300 hover:bg-cream-100 text-gray-600 rounded-lg font-semibold"
                  >
                    Clear
                  </button>
                </div>

                {redemptionError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{redemptionError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  {coinAccount.availableBalance === 0
                    ? 'You currently have 0 B5 Coins. Place this order to start earning reward coins!'
                    : 'Eligible merchandise subtotal is ₹0.'}
                </span>
              </div>
            )}
          </div>

          {/* Step 9: Choose Payment Method */}
          <div className="bg-white rounded-2xl border border-cream-300 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-cream-200 pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-magizh-700" />
                <h3 className="text-xs sm:text-sm font-extrabold text-darkbrown-900 uppercase tracking-tight">
                  Choose Payment Method
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Mock Mode Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'UPI', label: 'UPI (GPay, PhonePe, Paytm)', icon: Smartphone },
                { id: 'Card', label: 'Credit / Debit Card', icon: CreditCard },
                { id: 'NetBanking', label: 'Net Banking (All Banks)', icon: Building },
                { id: 'Cash on Delivery', label: 'Cash on Delivery', icon: Banknote },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-magizh-700 bg-magizh-50 ring-2 ring-magizh-600/30 font-bold'
                        : 'border-cream-300 hover:border-cream-400 bg-white text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={isSelected}
                      onChange={() => setPaymentMethod(m.id as PaymentMethod)}
                      className="text-magizh-700 focus:ring-magizh-600"
                    />
                    <Icon className="w-4 h-4 text-magizh-800 shrink-0" />
                    <span className="text-xs text-darkbrown-900">{m.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="text-[11px] text-gray-500 bg-cream-50 p-2.5 rounded-xl border border-cream-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                256-bit secure mock payment transaction. No real credit/debit card charge in demo environment.
              </span>
            </div>
          </div>
        </div>

        {/* Right: Order Summary & Confirm Button */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-cream-300 p-4 sm:p-5 shadow-2xs space-y-4 sticky top-20">
            <h3 className="text-xs font-black text-darkbrown-900 uppercase tracking-tight border-b border-cream-200 pb-2">
              Payment Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Merchandise Subtotal</span>
                <span className="font-bold text-darkbrown-900">₹{merchandiseSubtotal}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({coupon?.code})</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Eligible Merchandise</span>
                <span className="font-bold text-darkbrown-900">₹{eligibleAmount}</span>
              </div>

              {coinsToRedeem > 0 && (
                <div className="flex justify-between text-b5-700 font-black">
                  <span>B5 Coins Redeemed</span>
                  <span>-₹{coinDiscountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge</span>
                <span>{deliveryCharge === 0 ? <strong className="text-emerald-700">FREE</strong> : `₹${deliveryCharge}`}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Taxes & GST</span>
                <span className="text-gray-400">Included</span>
              </div>

              <div className="border-t border-cream-200 pt-2.5 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-black text-darkbrown-900 block">Final Payable Amount</span>
                  <span className="text-[10px] text-gray-500">via {paymentMethod}</span>
                </div>
                <span className="text-xl font-black text-magizh-900">
                  ₹{finalPayableAmount}
                </span>
              </div>
            </div>

            {/* Estimated Reward Coins Pill */}
            <div className="bg-gradient-to-r from-b5-50 to-amber-50 border border-b5-200 rounded-xl p-2.5 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-b5-600 shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-b5-900">+{estimatedRewardCoins} B5 Coins</span> will be credited after order delivery.
              </div>
            </div>

            {/* Confirm Order Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isProcessing || !!redemptionError || addresses.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-magizh-700 via-magizh-800 to-magizh-900 hover:from-magizh-800 hover:to-magizh-950 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <span>Confirm Order &bull; Pay ₹{finalPayableAmount}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={onCancel}
              className="w-full text-center text-xs text-gray-500 hover:text-darkbrown-800 font-semibold"
            >
              Return to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Add New Address Modal */}
      {showNewAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkbrown-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-cream-300 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-darkbrown-900">Add New Delivery Address</h3>

            <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-darkbrown-800 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={newAddress.name}
                  onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-darkbrown-800 mb-1">Mobile Phone (10 digits)</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="w-full p-2 border border-cream-300 rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-darkbrown-800 mb-1">Address (Street, Door No, Area)</label>
                <textarea
                  rows={2}
                  value={newAddress.addressLine}
                  onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                  placeholder="e.g. 14, North Car Street"
                  className="w-full p-2 border border-cream-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-darkbrown-800 mb-1">District</label>
                  <select
                    value={newAddress.district}
                    onChange={(e) => setNewAddress({ ...newAddress, district: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-xl"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Madurai">Madurai</option>
                    <option value="Salem">Salem</option>
                    <option value="Tiruchirappalli">Tiruchirappalli</option>
                    <option value="Tirunelveli">Tirunelveli</option>
                    <option value="Erode">Erode</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-darkbrown-800 mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newAddress.pinCode}
                    onChange={(e) => setNewAddress({ ...newAddress, pinCode: e.target.value })}
                    className="w-full p-2 border border-cream-300 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-darkbrown-800 mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  value={newAddress.landmark}
                  onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                  placeholder="Near Temple / School"
                  className="w-full p-2 border border-cream-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewAddressModal(false)}
                  className="flex-1 py-2 bg-cream-100 hover:bg-cream-200 text-darkbrown-800 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-magizh-800 hover:bg-magizh-900 text-white rounded-xl font-bold"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
