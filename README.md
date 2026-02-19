# Trading Portal — Modern Scaffold

What's included:
- React + Vite (TypeScript)
- Tailwind CSS v4 configuration (dark mode default via <html class="dark">)
- @tailwindcss/postcss in postcss.config.cjs
- Redux Toolkit + redux-saga structure with example slice and saga
- TanStack React Query + Framer Motion + Lucide icons
- Clean folder structure ready for an industry-level app:
  - store/slices, store/sagas, components/ui, components/layout, features, services, utils
- Animated dark-mode login page and a modern dashboard layout

To run:
1. `npm install`
2. `npm run dev`
3. Open http://localhost:5173

Notes:
- Auth is mocked via redux-saga and demo API. Replace `/api/auth/login` with your backend.
- Add additional tooling: ESLint, Prettier, Husky, CI as desired.
