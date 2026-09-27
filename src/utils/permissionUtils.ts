/**
 * Permission Utilities - Minimal constants
 */

/**
 * Tooltip message when buy/sell is disabled
 */
export const BUY_SELL_DISABLED_MESSAGE = 'You do not have permission to buy/sell. Contact your administrator.';

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
 * Dispatch custom event to notify components of user data updates
 */
export const dispatchUserDataUpdate = () => {
  window.dispatchEvent(new Event('userDataUpdated'));
};
