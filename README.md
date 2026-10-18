# The Abbey

A Telegram Mini App for Tembusu College’s bandroom. Residents browse a dark monthly calendar, request a session, and cancel their own bookings. The quartermaster approves or rejects in **@TheAbbeyBot**. Members of **Abbey Licensed ’26/27** can access the calendar automatically when group access is configured.

## Local preview

Requires Node 22.18+ (Node 24 recommended) and pnpm 11.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000 and choose **Preview**. Sample bookings and requests live only in browser memory. Preview never calls booking APIs or sends messages. Live mode requires signed Telegram Mini App data; there is no authentication bypass.

## Existing Supabase setup

1. Keep the existing `NEXT_PUBLIC_SUPABASE_URL` and Telegram token in `.env.local`.
2. Run **scripts/abbey.sql** in that project's SQL editor. It creates three new tables and transaction functions, imports existing `licensed_users` handles once, and preserves revocations on reruns. It removes public access to the old portal's tables. Old records are not deleted.
3. Set `SUPABASE_SERVICE_ROLE_KEY` to the project's server secret/service-role key. Never prefix it with `NEXT_PUBLIC_`, commit it, or share it in chat. The old anonymous key is no longer used.
4. `TELEGRAM_QM_CHAT_ID` must be the quartermaster's numeric **user ID**, not a group ID. This account has admin access without a registry entry.
5. Set a random `TELEGRAM_WEBHOOK_SECRET` (16–256 URL-safe characters). Keep `NEXT_PUBLIC_APP_URL=https://the-abbey.vercel.app` for the current deployment.

Notion import: `scripts/import-notion.mjs` reconciles the saved October calendar in `artifacts/notion-october-source.json`. The local source and import report are ignored by Git. The import uses source page IDs for idempotency and `telegram_user_id = 0` for bookings without a Telegram owner; only the QM can cancel those in the app. It never sends notifications or changes the source Notion page.

## Deployment

Deploy to the existing Vercel project. Add the variables in `.env.example` to its production environment and redeploy. The old anonymous key and `TELEGRAM_ARTS_CC_CHAT_ID` are unnecessary.

```sh
pnpm build
pnpm bot:check
pnpm bot:configure
```

`bot:check` is read-only. `bot:configure` verifies @TheAbbeyBot and the deployed app's readiness, then sets its secured webhook, calendar menu and commands. It preserves pending Telegram updates. Open a private chat with the bot and send `/start` first.

The Supabase server key cannot run SQL migrations itself: apply SQL through the dashboard or a database connection. `/api/health` returns readiness only, never records or secrets.

## Access through Abbey Licensed membership

1. Make **@TheAbbeyBot** an administrator in **Abbey Licensed ‘26/27 🎶**.
2. Set `TELEGRAM_ABBEY_LICENSED_CHAT_ID=-1003933261200` in the server environment (including Vercel production) and redeploy.
3. Residents open the bot privately, send `/start`, and tap **Calendar**. No manual handle entry is needed, including for members without a username.

The server validates signed Telegram identity and checks current group membership on every calendar/booking request and before approving a pending booking. Leaving or removal blocks subsequent API requests; existing bookings are retained. Previously loaded calendar data cannot be withdrawn from someone's screen. Telegram verification failures deny access temporarily rather than falling back to the registry. The QM retains admin access.

Members are automatically linked to existing active licenses or registered by stable Telegram ID, so existing booking transactions continue to work without a database migration. Automatically created rows use a reserved `telegram:<user ID>` handle. Explicit `active = false` revocations still block access. Do not delete a revoked row: deletion allows a current group member to register again.

Run `pnpm bot:check` to verify that the configured bot is an administrator in the correct group. Without `TELEGRAM_ABBEY_LICENSED_CHAT_ID`, the app retains registry-only access as described below.

## Registry-only access and manual revocation

Open https://supabase.com/dashboard/project/mmkwxgmunvcvpslvxugb/editor and select **public.abbey_licenses** (not the old licensed_users table).

1. Click **Insert → Insert row**.
2. Enter **handle** in lowercase without @, e.g. tembusian_name, and **name**.
3. Keep **active = true**. Leave **id** and **created_at** at their defaults, and **telegram_user_id** empty (NULL). Save.
4. The resident opens @TheAbbeyBot, sends /start, and taps **Calendar**. Their Telegram account ID binds automatically on first use. With group access enabled, they must also belong to the configured group.

To revoke access, edit the row and set **active = false**. To restore it, set **active = true**. Changes apply on the next API request, including existing sessions. No deployment is needed. Revoking a license does not cancel existing bookings.

Use the table's filter on **handle** or **name** to find a person. Do not clear or change a bound **telegram_user_id** just because their username changed: the stable ID keeps their access attached to the right account. Before first use, verify the handle with the resident. The QM account has admin access through TELEGRAM_QM_CHAT_ID.

Licensed residents can see booking names, start/end times, and purposes on the calendar cards. Tapping a card shows full booking details. The registry has no public or in-app endpoint.

## Booking behavior

- All times are Singapore time; sessions can cross midnight.
- Pending requests do not hold slots. PostgreSQL prevents overlapping confirmed bookings, including concurrent approvals. Back-to-back sessions are allowed.
- Request IDs prevent duplicates on retry. Repeat decisions are harmless.
- Technical bounds: Half-hour start times and duration increments, shown in hours, up to 24 hours, requests within the next year, maximum 10 upcoming pending requests per resident. No college opening-hours policy, two-hour quota, annual license expiry or recurring allocations are assumed.
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
