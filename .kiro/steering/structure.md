# Project Structure

## Directory Layout
```
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home - garden list
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── api/               # API routes
│   │   └── spellcheck/    # AI spell check endpoint
│   ├── auth/callback/     # OAuth callback handler
│   └── bahce/[id]/        # Garden routes
│       ├── page.tsx       # Canvas view
│       ├── projeler/      # Projects list view
│       └── editor/[nodeId]/ # Node editor
│
├── components/            # React components
│   ├── bahce/            # Garden-related components
│   ├── canvas/           # Infinite canvas & tree nodes
│   ├── editor/           # Text editor components
│   └── layout/           # Layout components (Sidebar)
│
├── lib/                   # Shared utilities
│   ├── types.ts          # TypeScript interfaces
│   ├── supabaseClient.ts # Supabase client singleton
│   ├── config.ts         # API URL configuration
│   └── store/
│       └── useStore.ts   # Zustand global store
│
├── android/              # Capacitor Android project
├── docs/                 # Documentation (PRD.md)
├── tasarim_taslagi/      # Design drafts (excluded from build)
└── assets/, icons/       # Static assets
```

## Routing Pattern
- `/` - Home page with garden cards
- `/auth/callback` - OAuth redirect handler
- `/bahce/[id]` - Garden canvas view
- `/bahce/[id]/projeler` - Garden projects list view
- `/bahce/[id]/editor/[nodeId]` - Full-page node editor

## Key Patterns
- **Client Components**: Most pages use `'use client'` for interactivity
- **Path Aliases**: Use `@/` for imports (e.g., `@/lib/store/useStore`)
- **State**: Zustand store in `lib/store/useStore.ts` manages all global state
- **Database**: All Supabase operations go through the store actions
- **Styling**: Tailwind utility classes, custom theme colors (leaf, branch, soil, sky)
