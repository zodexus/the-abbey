# The Abbey

A Telegram Mini App for Tembusu College’s bandroom. Residents browse a seven-day date strip and daily availability, request a session, and manage their bookings. The quartermaster approves or rejects in **@TheAbbeyBot**, and manages the licensed-user registry in the app or with Telegram commands.

## Local preview

Requires Node 22.18+ (Node 24 recommended) and pnpm 11.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000 and choose **Try the calendar preview**. Sample bookings and registry edits live only in browser memory. Preview never calls booking APIs or sends messages. Live mode requires signed Telegram Mini App data; there is no authentication bypass.

## Existing Supabase setup

1. Keep the existing `NEXT_PUBLIC_SUPABASE_URL` and Telegram token in `.env.local`.
2. Run **scripts/abbey.sql** in that project's SQL editor. It creates three new tables and transaction functions, imports existing `licensed_users` handles once, and preserves revocations on reruns. It removes public access to the old portal's tables. Old records are not deleted.
3. Set `SUPABASE_SERVICE_ROLE_KEY` to the project's server secret/service-role key. Never prefix it with `NEXT_PUBLIC_`, commit it, or share it in chat. The old anonymous key is no longer used.
4. `TELEGRAM_QM_CHAT_ID` must be the quartermaster's numeric **user ID**, not a group ID. This account has admin access without a registry entry.
5. Set a random `TELEGRAM_WEBHOOK_SECRET` (16–256 URL-safe characters). Keep `NEXT_PUBLIC_APP_URL=https://the-abbey.vercel.app` for the current deployment.

The existing Notion schedule and legacy Supabase bookings are **not imported automatically**. Reconcile upcoming reservations before launch and enter them in the new system. The preview is not a live schedule. Do not announce an empty new calendar as available until existing reservations are entered.

## Deployment

Deploy to the existing Vercel project. Add the variables in `.env.example` to its production environment and redeploy. The old anonymous key and group-chat variables are unnecessary.

```sh
pnpm build
pnpm bot:check
pnpm bot:configure
```

`bot:check` is read-only. `bot:configure` verifies @TheAbbeyBot and the deployed app's readiness, then sets its secured webhook, calendar menu and commands. It preserves pending Telegram updates. Open a private chat with the bot and send `/start` first.

The Supabase server key cannot run SQL migrations itself: apply SQL through the dashboard or a database connection. `/api/health` returns readiness only, never records or secrets.

## Licensing

- **Licensed users**: add a handle and name; revoke/restore access.
- Bot: `/license @handle Name` adds a resident; `/revoke @handle` disables access.
- The handle binds to the verified Telegram user ID on first use. Access then survives username changes. A different person claiming the old username cannot use a bound license.
- Before first use, verify the handle with the resident: an unbound username is not permanent proof of identity. The registry shows the originally registered handle, which may differ from the user's current username after binding.
- Revocation blocks new use immediately, including existing app sessions, but does not cancel confirmed bookings. Account replacements require deliberate registry correction in Supabase.
- Only the QM can read the registry and other residents' booking names/purposes. Other licensed residents see occupied times, pending counts and their own details.

## Booking behavior

- All times are Singapore time; sessions can cross midnight.
- Pending requests do not hold slots. PostgreSQL prevents overlapping confirmed bookings, including concurrent approvals. Back-to-back sessions are allowed.
- Request IDs prevent duplicates on retry. Repeat decisions are harmless.
- Technical bounds: 15-minute duration increments up to 24 hours, requests within the next year, maximum 10 upcoming pending requests per resident. No college opening-hours policy, two-hour quota, annual license expiry or recurring allocations are assumed.
- Owners can cancel before start. Approval checks the license is still active.
- Notifications are queued transactionally. Bot interactions retry a batch; `/pending` retrieves the next 10 requests, `/sync` retries queued notifications. No scheduled retry worker is included; after an outage use `/sync` until drained. Delivery is at-least-once, so a crash after sending can cause a duplicate notification, but never a duplicate reservation.
- Calendar refreshes every minute and manually. Server checks run on submission and approval. Signed sessions expire after an hour; close and reopen the Mini App.

## Tests

```sh
pnpm test
pnpm typecheck
pnpm build
```

Tests cover signed identity, invalid sessions, overnight bookings, migration reruns, database permissions, handle binding, revocation, duplicate requests, overlap prevention, cancellation authorization, and notification leases. PostgreSQL integration tests use PGlite locally; no Supabase data or Telegram messages are touched.

Stack: Next.js, Supabase PostgreSQL, Telegram Bot API. Equipment loans, door dispatch, checkout photos and separate admin logins have been removed.
