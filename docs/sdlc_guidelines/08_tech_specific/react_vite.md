# React and Vite Guidelines

- Document owner: Engineering
- Last reviewed: 2026-03-24
- Primary use: React 19 and Vite conventions for the admin dashboard and parent web app

## Purpose

Define frontend development standards for SBTM's React applications: the admin dashboard (`apps/admin-dashboard`) and the parent web app (`apps/parent-dashboard/web`). Both use React 19 with Vite as the build tool.

## Technology Stack

| Layer            | Technology                                            |
| ---------------- | ----------------------------------------------------- |
| Framework        | React 19                                              |
| Build tool       | Vite                                                  |
| Styling          | Tailwind CSS                                          |
| State management | React hooks + context (escalate to Zustand if needed) |
| HTTP client      | Fetch API or Axios                                    |
| Real-time        | Socket.IO client                                      |
| Type checking    | TypeScript (strict mode)                              |

## Project Structure

```
apps/admin-dashboard/src/
├── main.tsx              # Entry point
├── App.tsx               # Root component, router setup
├── components/           # Shared UI components
│   ├── ui/               # Primitives (Button, Input, Card)
│   └── layout/           # Layout components (Sidebar, Header)
├── features/             # Feature modules
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── hooks/
│   │   └── components/
│   ├── gps-tracking/
│   ├── emergency-alerts/
│   └── ...
├── hooks/                # Shared custom hooks
├── services/             # API client functions
├── types/                # Shared TypeScript types
├── utils/                # Utility functions
└── config/               # App configuration
```

## Component Conventions

- Use function components exclusively. No class components.
- Co-locate component-specific hooks, types, and styles within the feature directory.
- Prefer composition over prop drilling — use context or custom hooks for shared state.
- Keep components under 150 lines. Extract sub-components when a component grows beyond this.

```typescript
// Feature component
export function DashboardPage() {
  const { routes, isLoading } = useActiveRoutes();

  if (isLoading) return <LoadingSpinner />;
  return <RouteMap routes={routes} />;
}
```

## State Management

| State Type                     | Approach                                              |
| ------------------------------ | ----------------------------------------------------- |
| Server state (API data)        | Custom hooks with fetch + local state, or React Query |
| UI state (modals, tabs)        | Component-local `useState`                            |
| Shared app state (auth, theme) | React Context                                         |
| Complex shared state           | Zustand (only if Context becomes unwieldy)            |

## API Integration

```typescript
// services/gps-tracking.ts
const API_BASE = import.meta.env.VITE_API_URL;

export async function getActiveRoutes(schoolId: string): Promise<Route[]> {
  const response = await fetch(`${API_BASE}/api/v1/routes?schoolId=${schoolId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new ApiError(response.status, await response.text());
  return response.json();
}
```

Rules:

- Centralize API calls in `services/` — components never call `fetch` directly.
- Handle errors consistently (toast notifications for user-facing errors).
- Include the JWT token from the auth context in all API calls.

## Real-Time Updates (Socket.IO)

- Establish Socket.IO connection once at the app level (context provider).
- Authenticate the socket connection with the same JWT used for HTTP.
- Subscribe to events at the feature level using custom hooks.

```typescript
export function useGpsUpdates(routeId: string) {
  const socket = useSocket();
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    socket.on(`location:${routeId}`, setLocation);
    return () => {
      socket.off(`location:${routeId}`, setLocation);
    };
  }, [socket, routeId]);

  return location;
}
```

## Tailwind CSS Rules

- Use Tailwind utility classes directly in JSX. Avoid custom CSS files.
- Extract repeated patterns into reusable components, not CSS classes.
- Configure the design system (colors, spacing, fonts) in `tailwind.config.js`.

## Environment Variables

- Prefix all client-side env vars with `VITE_` (Vite requirement).
- Define env vars in `.env.example` with placeholder values.
- Access via `import.meta.env.VITE_*`.

## Related Documents

- [react_native_expo.md](react_native_expo.md) — Mobile app conventions
- [socketio_sse.md](socketio_sse.md) — Real-time patterns
- [../04_coding_standards/typescript_standards.md](../04_coding_standards/typescript_standards.md) — TypeScript rules
