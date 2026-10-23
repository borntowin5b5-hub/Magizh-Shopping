// Core B5 Coin Rewards Engine & Verification Rules
import { B5CoinAccount, B5Transaction, CoinRuleConfig, Order, OrderStatus } from './src__types__index';

export const DEFAULT_COIN_RULES: CoinRuleConfig = {
  coinToInrRate: 1, // 1 B5 Coin = ₹1
  maxRedemptionCapPercentage: 50, // 50% maximum coin redemption rule
  earningPercentage: 5, // 5% coin back on eligible merchandise
  minQualifyingOrderAmount: 200, // Min ₹200 to earn coins
  maxRewardPerOrder: 500, // Maximum 500 coins earned per order
  expiryDays: 365,
  referralRewardCoins: 50, // 50 B5 Coins for qualified referral
  enablePartnerBonus: true,
};

/**
 * Calculates the maximum allowable coin redemption for a given eligible merchandise amount.
 * RULE: A customer can use B5 Coins to pay for a maximum of 50% (or configured cap %) of the eligible merchandise subtotal.
 * Must NOT exceed available coin balance.
 */
export function calculateMaxRedemption(
  eligibleMerchandiseAmount: number,
  availableCoins: number,
  capPercentage: number = DEFAULT_COIN_RULES.maxRedemptionCapPercentage
): {
  maxCapAllowed: number;
  maxRedeemableCoins: number;
  cappedByPercentage: boolean;
  cappedByBalance: boolean;
} {
  if (eligibleMerchandiseAmount <= 0 || availableCoins <= 0) {
    return {
      maxCapAllowed: 0,
      maxRedeemableCoins: 0,
      cappedByPercentage: false,
      cappedByBalance: availableCoins <= 0,
    };
  }

  // 50% cap of eligible merchandise amount (rounded down to whole coin)
  const maxCapAllowed = Math.floor(eligibleMerchandiseAmount * (capPercentage / 100));
  const maxRedeemableCoins = Math.min(availableCoins, maxCapAllowed);

  return {
    maxCapAllowed,
    maxRedeemableCoins,
    cappedByPercentage: availableCoins >= maxCapAllowed,
    cappedByBalance: availableCoins < maxCapAllowed,
  };
}

/**
 * Validates a requested coin redemption against order amount and customer balance.
 * Returns { valid: boolean, error?: string, approvedCoins: number }
 */
export function validateCoinRedemption(
  requestedCoins: number,
  eligibleMerchandiseAmount: number,
  availableCoins: number,
  capPercentage: number = DEFAULT_COIN_RULES.maxRedemptionCapPercentage
): { valid: boolean; error?: string; approvedCoins: number } {
  if (requestedCoins < 0) {
    return { valid: false, error: 'Redemption coins cannot be negative', approvedCoins: 0 };
  }

  if (requestedCoins === 0) {
    return { valid: true, approvedCoins: 0 };
  }

  if (requestedCoins > availableCoins) {
    return {
      valid: false,
      error: `Insufficient B5 Coins. You requested ${requestedCoins} but only have ${availableCoins} available.`,
      approvedCoins: 0,
    };
  }

  const { maxCapAllowed } = calculateMaxRedemption(eligibleMerchandiseAmount, availableCoins, capPercentage);

  if (requestedCoins > maxCapAllowed) {
    return {
      valid: false,
      error: `Redemption exceeds the ${capPercentage}% cap. For an eligible amount of ₹${eligibleMerchandiseAmount}, maximum allowable redemption is ${maxCapAllowed} B5 Coins.`,
      approvedCoins: maxCapAllowed,
    };
  }

  return {
    valid: true,
    approvedCoins: requestedCoins,
  };
}

/**
 * Calculates reward coins for an order based on configured rules.
 */
export function calculateRewardCoins(
  eligibleAmount: number,
  rules: CoinRuleConfig = DEFAULT_COIN_RULES,
  isPartnerShop: boolean = false
): number {
  if (eligibleAmount < rules.minQualifyingOrderAmount) {
    return 0;
  }

  let effectiveRate = rules.earningPercentage;
  if (isPartnerShop && rules.enablePartnerBonus) {
    effectiveRate = effectiveRate * 1.5; // 1.5x bonus for partner transactions
  }

  const earned = Math.floor(eligibleAmount * (effectiveRate / 100));
  return Math.min(earned, rules.maxRewardPerOrder);
}

/**
 * Atomic simulation: Deducts coins during order checkout.
 * Throws error or returns failure if balance is inadequate or redemption exceeds cap.
 */
export function processCoinDeduction(
  account: B5CoinAccount,
  coinsToDeduct: number,
  eligibleMerchandiseAmount: number,
  orderNumber: string,
  capPercentage: number = 50
): {
  success: boolean;
  updatedAccount: B5CoinAccount;
  transaction?: B5Transaction;
  error?: string;
} {
  const validation = validateCoinRedemption(
    coinsToDeduct,
    eligibleMerchandiseAmount,
    account.availableBalance,
    capPercentage
  );

  if (!validation.valid) {
    return {
      success: false,
      updatedAccount: account,
      error: validation.error,
    };
  }

  if (coinsToDeduct === 0) {
    return {
      success: true,
      updatedAccount: account,
    };
  }

  const newAvailable = account.availableBalance - coinsToDeduct;
  const newRedeemed = account.totalRedeemed + coinsToDeduct;

  const transaction: B5Transaction = {
    id: `TXN-COIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    customerId: account.customerId,
    orderNumber,
    type: 'debit',
    amount: coinsToDeduct,
    reason: `Redeemed on Order #${orderNumber} (₹${coinsToDeduct} discount applied)`,
    timestamp: new Date().toISOString(),
    balanceAfter: newAvailable,
    status: 'completed',
  };

  const updatedAccount: B5CoinAccount = {
    ...account,
    availableBalance: newAvailable,
    totalRedeemed: newRedeemed,
  };

  return {
    success: true,
    updatedAccount,
    transaction,
  };
}

/**
 * Atomic simulation: Reverses redeemed coins when an order is cancelled or refunded.
 */
export function processOrderCancellationReversal(
  account: B5CoinAccount,
  order: Order
): {
  updatedAccount: B5CoinAccount;
  transactions: B5Transaction[];
} {
  const transactions: B5Transaction[] = [];
  let updatedAccount = { ...account };

  // 1. If coins were redeemed on this order, reverse them back to customer balance
  if (order.coinsRedeemed > 0) {
    const restoredBalance = updatedAccount.availableBalance + order.coinsRedeemed;
    const reducedRedeemed = Math.max(0, updatedAccount.totalRedeemed - order.coinsRedeemed);

    const refundTxn: B5Transaction = {
      id: `TXN-REV-${Date.now()}-1`,
      customerId: account.customerId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'reversal',
      amount: order.coinsRedeemed,
      reason: `Refund: Order #${order.orderNumber} cancelled. Restored ${order.coinsRedeemed} B5 Coins.`,
      timestamp: new Date().toISOString(),
      balanceAfter: restoredBalance,
      status: 'completed',
    };

    transactions.push(refundTxn);
    updatedAccount = {
      ...updatedAccount,
      availableBalance: restoredBalance,
      totalRedeemed: reducedRedeemed,
    };
  }

  // 2. If reward coins were credited or pending, reverse them
  if (order.rewardCoinsCredited && order.rewardCoinsEarned > 0) {
    const adjustedAvailable = Math.max(0, updatedAccount.availableBalance - order.rewardCoinsEarned);
    const adjustedEarned = Math.max(0, updatedAccount.totalEarned - order.rewardCoinsEarned);
    const newReversed = updatedAccount.reversedBalance + order.rewardCoinsEarned;

    const clawbackTxn: B5Transaction = {
      id: `TXN-CLAW-${Date.now()}-2`,
      customerId: account.customerId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      type: 'reversal',
      amount: order.rewardCoinsEarned,
      reason: `Clawback: Order #${order.orderNumber} cancelled. Reversed ${order.rewardCoinsEarned} earned reward coins.`,
      timestamp: new Date().toISOString(),
      balanceAfter: adjustedAvailable,
      status: 'reversed',
    };

    transactions.push(clawbackTxn);
    updatedAccount = {
      ...updatedAccount,
      availableBalance: adjustedAvailable,
      totalEarned: adjustedEarned,
      reversedBalance: newReversed,
    };
  } else if (order.rewardCoinsEarned > 0 && !order.rewardCoinsCredited) {
    // If they were pending, remove from pending balance
    updatedAccount = {
      ...updatedAccount,
      pendingBalance: Math.max(0, updatedAccount.pendingBalance - order.rewardCoinsEarned),
    };
  }

  return {
    updatedAccount,
    transactions,
  };
}

/**
 * Credits reward coins when an order transitions to 'Delivered' or 'Completed'.
 * Enforces duplicate credit prevention.
 */
export function creditOrderCompletionReward(
  account: B5CoinAccount,
  order: Order
): {
  success: boolean;
  updatedAccount: B5CoinAccount;
  transaction?: B5Transaction;
  orderUpdated: Order;
  message: string;
} {
  if (order.rewardCoinsCredited) {
    return {
      success: false,
      updatedAccount: account,
      orderUpdated: order,
      message: `Reward coins already credited for Order #${order.orderNumber}`,
    };
  }

  if (order.rewardCoinsEarned <= 0) {
    return {
      success: false,
      updatedAccount: account,
      orderUpdated: order,
      message: `Order #${order.orderNumber} does not have eligible reward coins`,
    };
  }

  const coinsToCredit = order.rewardCoinsEarned;
  const newAvailable = account.availableBalance + coinsToCredit;
  const newEarned = account.totalEarned + coinsToCredit;
  const newPending = Math.max(0, account.pendingBalance - coinsToCredit);

  const transaction: B5Transaction = {
    id: `TXN-REWARD-${Date.now()}`,
    customerId: account.customerId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    type: 'credit',
    amount: coinsToCredit,
    reason: `Reward: Completed purchase #${order.orderNumber} credited ${coinsToCredit} B5 Coins`,
    timestamp: new Date().toISOString(),
    balanceAfter: newAvailable,
    status: 'completed',
  };

  const updatedAccount: B5CoinAccount = {
    ...account,
    availableBalance: newAvailable,
    totalEarned: newEarned,
    pendingBalance: newPending,
  };

  const orderUpdated: Order = {
    ...order,
    rewardCoinsCredited: true,
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    updatedAccount,
    transaction,
    orderUpdated,
    message: `Successfully credited ${coinsToCredit} B5 Coins for completed Order #${order.orderNumber}`,
  };
}
