/**
 * Redux Selectors for Auth State
 * Use these in components instead of accessing localStorage directly
 */

import { RootState } from '../index';

// Get the entire user object
export const selectUser = (state: RootState) => state.auth.user;

// Get market trade right
export const selectMarketTradeRight = (state: RootState) => 
  state.auth.user?.marketTradeRight ?? false;

// Get user ID
export const selectUserId = (state: RootState) => 
  state.auth.user?.userId ?? null;

// Get username
export const selectUsername = (state: RootState) => 
  state.auth.user?.username ?? null;

// Get role ID
export const selectRoleId = (state: RootState) => 
  state.auth.user?.roleId ?? null;

// Get token
export const selectToken = (state: RootState) => 
  state.auth.token;

// Get loading state
export const selectAuthLoading = (state: RootState) => 
  state.auth.loading;

// Get error
export const selectAuthError = (state: RootState) => 
  state.auth.error;

// Check if user is authenticated
export const selectIsAuthenticated = (state: RootState) => 
  !!state.auth.token && !!state.auth.user;

// Check if user is admin (roleId 1, 2, or 3)
export const selectIsAdmin = (state: RootState) => {
  const roleId = state.auth.user?.roleId;
  return roleId === 1 || roleId === 2 || roleId === 3;
};

// Check if it's first login
export const selectFirstLogin = (state: RootState) => 
  state.auth.user?.firstLogin ?? false;

// Check if change password flag is set
export const selectChangePasswordFlag = (state: RootState) => 
  state.auth.user?.changePasswordFlag ?? false;
