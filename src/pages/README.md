cred:
Super Admin
testsuperadmin - 123456
admin - 123456
master1 - 123456

open -na "/Applications/Google Chrome.app" --args --user-data-dir="/tmp/chrome-dev-data" --disable-web-security
s
# Pages Structure

This folder contains all the application pages organized by functionality for better maintainability and scalability.

## 📁 Folder Structure

```
pages/
├── index.ts                 # Main export file for all pages
├── auth/                    # Authentication related pages
│   ├── index.ts            # Auth pages exports
│   └── Login.tsx           # Login page
├── dashboard/               # Dashboard and home pages
│   ├── index.ts            # Dashboard pages exports
│   └── DashboardPage.tsx   # Main dashboard
├── trading/                 # Trading related pages
│   ├── index.ts            # Trading pages exports
│   ├── Markets.tsx         # Market watch/data
│   ├── Orders.tsx          # Order management
│   └── Portfolio.tsx       # Portfolio overview
├── user-management/         # User administration pages
│   ├── index.ts            # User management exports

│   └── UserList.tsx        # User listing and management
├── reports/                 # Reports and analytics pages
│   └── index.ts            # Reports exports (placeholder)
├── settings/                # Application settings pages
│   └── index.ts            # Settings exports (placeholder)
└── admin/                   # Admin tools and utilities
    ├── index.ts            # Admin pages exports
    ├── ApiTestPage.tsx     # API testing interface
    └── ComponentShowcase.tsx # Component showcase
```

## 🎯 Usage

Import pages using the organized structure:

```tsx
// Import specific pages
import { Login, DashboardPage } from './pages'

// Or import from specific categories
import { Markets, Orders, Portfolio } from './pages/trading'
import { UserList } from './pages/user-management'
```

## 📋 Categories

### **🔐 Auth** (`/auth`)
- Login page
- Future: Register, Forgot Password, etc.

### **📊 Dashboard** (`/dashboard`)
- Main dashboard
- Future: Custom dashboards, widgets, etc.

### **💹 Trading** (`/trading`)
- Markets (market watch, data)
- Orders (order management)
- Portfolio (holdings, P&L)
- Future: Charts, Analysis, etc.

### **👥 User Management** (`/user-management`)
- UserList (user management)
- Future: User roles, permissions, etc.

### **📈 Reports** (`/reports`)
- Future: Account summary, P&L reports, etc.

### **⚙️ Settings** (`/settings`)
- Future: App settings, preferences, etc.

### **🔧 Admin** (`/admin`)
- API testing tools
- Component showcase
- Future: System monitoring, logs, etc.

## 🚀 Adding New Pages

1. **Choose the appropriate category** or create a new one
2. **Create the component** in the category folder
3. **Export it** in the category's `index.ts`
4. **Add route** in `App.tsx`

Example:
```tsx
// 1. Create pages/reports/AccountSummary.tsx
// 2. Add to pages/reports/index.ts:
export { default as AccountSummary } from './AccountSummary'
// 3. Use in App.tsx:
import { AccountSummary } from './pages/reports'
```

This structure ensures scalability and maintainability as the application grows!