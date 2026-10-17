/**
 * Permission Utilities - Minimal constants
 */

/**
 * Tooltip message when buy/sell is disabled
 */
export const BUY_SELL_DISABLED_MESSAGE = 'You do not have permission to buy/sell. Contact your administrator.';

/**
 * Tooltip message when delete trade is disabled
 */
export const DELETE_TRADE_DISABLED_MESSAGE = 'You do not have permission to delete trades. Contact your administrator.';

/**
 * Tooltip message when manual order is disabled
 */
export const MANUAL_ORDER_DISABLED_MESSAGE = 'You do not have permission to create manual orders. Contact your administrator.';

/**
 * Check if user has market trade rights from localStorage
 * Use this ONLY when Redux is not available (edge cases)
 */
export const hasMarketTradeRightFromStorage = (): boolean => {
  try {
    const userDataStr = localStorage.getItem('userData');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    return userData?.marketTradeRight === true;
  } catch {
    return false;
  }
};

/**
 * Check if user has delete trade permission from localStorage
 * Use this ONLY when Redux is not available (edge cases)
 */
export const hasDeleteTradeFromStorage = (): boolean => {
  try {
    const userDataStr = localStorage.getItem('userData');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    return userData?.deleteTrade === true;
  } catch {
    return false;
  }
};

/**
 * Check if user has manual order permission from localStorage
 * Use this ONLY when Redux is not available (edge cases)
 */
export const hasManualOrderFromStorage = (): boolean => {
  try {
    const userDataStr = localStorage.getItem('userData');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    return userData?.manualOrder === true;
  } catch {
    return false;
  }
};

/**
 * Check if user has pending to success permission from localStorage
 * Use this ONLY when Redux is not available (edge cases)
 */
export const hasPendingToSuccessFromStorage = (): boolean => {
  try {
    const userDataStr = localStorage.getItem('userData');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    return userData?.pendingToSuccess === true;
  } catch {
    return false;
  }
};

/**
 * Dispatch custom event to notify components of user data updates
 */
export const dispatchUserDataUpdate = () => {
  window.dispatchEvent(new Event('userDataUpdated'));
};
