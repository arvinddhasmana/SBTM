# Page Visibility Management

- Feature owner: Engineering
- Added: 2026-05-14
- Access: Super Admin only

## Overview

Super Admin can hide individual admin portal pages from non-Super-Admin users. Hidden pages are:

1. Removed from the left navigation pane for all non-Super-Admin roles.
2. Blocked at the route level — direct URL access redirects to `/dashboard`.

The **Settings** page and the **Page Visibility** management page itself cannot be hidden.

Super Admin always has full access regardless of visibility settings.

## Affected Pages (Hideable)

| Page Key              | Route                  | Display Name       |
| --------------------- | ---------------------- | ------------------ |
| `dashboard`           | `/dashboard`           | Dashboard          |
| `alerts`              | `/alerts`              | Alerts             |
| `alerts/operational`  | `/alerts/operational`  | Operational Alerts |
| `routes`              | `/routes`              | Routes             |
| `routes/planner`      | `/routes/planner`      | Route Planner      |
| `vehicles`            | `/vehicles`            | Fleet              |
| `compliance`          | `/compliance`          | Compliance         |
| `fleet-assignments`   | `/fleet-assignments`   | Fleet Assignments  |
| `students`            | `/students`            | Students           |
| `absences`            | `/absences`            | Absences           |
| `boards`              | `/boards`              | Boards             |
| `schools`             | `/schools`             | Schools            |
| `users`               | `/users`               | Users              |
| `alert-config`        | `/alert-config`        | Alert Config       |
| `settings/gps-source` | `/settings/gps-source` | GPS Tracker        |
| `tenant-overview`     | `/tenant-overview`     | Tenant Overview    |
| `videos`              | `/videos`              | Videos             |

## Architecture

### Backend

- **Entity**: `page_visibility` table in the API gateway database.
  - `pageKey` (TEXT, UNIQUE) — matches the route path without the leading `/`
  - `pageName` (TEXT) — human-readable display name
  - `isVisible` (BOOLEAN, DEFAULT TRUE) — visibility state
  - `updatedBy` (UUID FK → `users.id`) — audit trail
  - `updatedAt` (TIMESTAMPTZ) — auto-managed by TypeORM

- **Service**: `PageVisibilityService` — upserts records and returns all visibility states. Pages without a DB row default to visible.

- **Controller**: `PageVisibilityController`
  - `GET /api/v1/page-visibility` — all admin roles can read (needed for sidebar filtering)
  - `PUT /api/v1/page-visibility` — Super Admin only, body: `{ pageKey, isVisible, pageName }`

### Frontend

- **API service**: `src/services/api/page-visibility.api.ts`
- **Context**: `src/context/PageVisibilityContext.tsx` — fetches visibility data, exposes `isPageVisible(pageKey)`. Super Admin always returns `true`.
- **Management page**: `src/pages/admin/PageVisibilityManagement.tsx` — toggle UI with confirmation dialogs.
- **Sidebar** (`Sidebar.tsx`): filters nav items using both role guard and `isPageVisible()`.
- **VisibilityGuard** (`App.tsx`): wraps each hideable route. Non-Super-Admin users accessing a hidden page via direct URL are redirected to `/dashboard`.

### Database Migration

Run `services/api-gateway/migrations/20260514_create_page_visibility.sql` against the `sbms` database. The migration creates the table and seeds default rows (all visible).

## Access Control

| Action            | Who can do it    |
| ----------------- | ---------------- |
| View settings     | All admin roles  |
| Hide/show a page  | SUPER_ADMIN only |
| Bypass visibility | SUPER_ADMIN only |

## Testing

- Backend unit tests: `services/api-gateway/src/modules/gateway/services/page-visibility.service.spec.ts`
- Frontend component tests: `apps/admin-dashboard/src/pages/admin/PageVisibilityManagement.test.tsx`
- Sidebar tests updated: `apps/admin-dashboard/src/components/common/Sidebar.test.tsx`
