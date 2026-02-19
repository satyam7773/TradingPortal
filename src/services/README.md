# Services Architecture

This directory contains the API service layer for the trading application. We use a **modular architecture** to keep the codebase scalable and maintainable.

## Structure

```
services/
├── apiClient.ts              # Base HTTP client with interceptors
├── authService.ts            # Authentication APIs
├── userManagementService.ts  # User management APIs
├── api.types.ts             # TypeScript types for API responses
└── index.ts                 # Barrel export for easy imports
```

## Why This Architecture?

### ❌ Problems with Monolithic API Service:
- **500+ API methods** in one file = unmaintainable
- Hard to find specific APIs
- Slow file loading and TypeScript checking
- Difficult to work on collaboratively (merge conflicts)
- No clear separation of concerns

### ✅ Benefits of Modular Services:
- **Organized by feature** (auth, user management, trading, etc.)
- Easy to find and maintain specific APIs
- Better performance (smaller files)
- Better TypeScript IntelliSense
- Easy to add new features
- Better team collaboration
- Each service is independently testable

## How to Use

### Import services:
```typescript
import { authService, userManagementService } from '@/services'

// Use in component
const response = await authService.login({ username, password })
const userConfig = await userManagementService.fetchUserConfig(userId)
```

### Create a new service:

1. **Create service file** (e.g., `tradingService.ts`):
```typescript
import { apiClient } from './apiClient'

class TradingService {
  private readonly baseUrl = '/trading'

  async placeOrder(orderData: any) {
    return await apiClient.post(`${this.baseUrl}/order`, orderData)
  }

  async getOrders() {
    return await apiClient.get(`${this.baseUrl}/orders`)
  }
}

export const tradingService = new TradingService()
export default tradingService
```

2. **Export in index.ts**:
```typescript
export { tradingService } from './tradingService'
```

3. **Use in your component**:
```typescript
import { tradingService } from '@/services'

const orders = await tradingService.getOrders()
```

## Available Services

### 1. **apiClient** (Base HTTP Client)
- Common HTTP client with interceptors
- Handles authentication automatically
- Adds requestTimestamp to all requests
- Handles token refresh on 401

Methods:
- `apiClient.get(url, config)`
- `apiClient.post(url, data, config)`
- `apiClient.put(url, data, config)`
- `apiClient.patch(url, data, config)`
- `apiClient.delete(url, config)`

### 2. **authService** (Authentication)
- `login(credentials)` - Login user
- `logout()` - Logout user
- `refreshToken(token)` - Refresh auth token
- `changePassword(data)` - Change password
- `resetPassword(email)` - Reset password

### 3. **userManagementService** (User Management)
- `fetchUserConfig(userId)` - Get user configuration
- `createUser(userData)` - Create new user
- `updateUser(userId, data)` - Update user
- `deleteUser(userId)` - Delete user
- `getUserList(pagination)` - Get user list

## Adding More Services

As you build more features, create new service files:

- `tradingService.ts` - Trading operations (orders, positions, trades)
- `marketDataService.ts` - Market data and quotes
- `reportsService.ts` - Reports and analytics
- `adminService.ts` - Admin operations
- `notificationService.ts` - Notifications
- `portfolioService.ts` - Portfolio management
- etc.

## Best Practices

1. **One service per feature domain** - Keep related APIs together
2. **Use TypeScript** - Define proper types for requests/responses
3. **Handle errors in components** - Let services throw errors, handle in UI
4. **Keep services stateless** - Don't store state in service classes
5. **Use async/await** - All service methods should be async
6. **Add JSDoc comments** - Document what each method does
7. **Export singleton instances** - Use `export const serviceName = new ServiceClass()`

## Migration from Old API Service

If you have existing code using the old `apiService`:

**Before:**
```typescript
import apiService from '@/services/api'
await apiService.login(credentials)
```

**After:**
```typescript
import { authService } from '@/services'
await authService.login(credentials)
```

The old `api.ts` file can be gradually phased out as you migrate APIs to the new modular services.
