# Tech Stack & Build System

## Core Technologies
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **React**: 18.x with hooks
- **Styling**: Tailwind CSS 3.x
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth (Google OAuth, Email/Password)
- **Mobile**: Capacitor 6.x (Android)

## Key Libraries
- `@supabase/supabase-js` - Database and auth client
- `zustand` - Global state management
- `framer-motion` - Animations
- `lucide-react` - Icons
- `@tiptap/react` - Rich text editor
- `jspdf`, `docx` - Document export
- `reactflow` - (Legacy, being phased out)

## Common Commands
```bash
# Development
npm run dev          # Start dev server (localhost:3000)

# Build
npm run build        # Production build
npm run start        # Start production server

# Linting
npm run lint         # ESLint check

# Mobile (Capacitor)
npx cap sync android # Sync web assets to Android
npx cap open android # Open in Android Studio
```

## Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
GEMINI_API_KEY=
```

## Build Output
- Web: Deployed to Vercel
- Android: Static export to `out/`, then Capacitor builds APK
