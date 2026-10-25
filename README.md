# EventPass

EventPass handles registration, tickets, and door check-in for in-person events. The scanner keeps working when the venue network does not. Guests need no account and install nothing.

## What it does

- Organizers create events with capacity and check-in windows.
- Organizers build a custom registration form with fields and choices.
- Guests register through a public link and confirm by email.
- Each guest gets a signed QR ticket that works on screen and on paper.
- Volunteers scan tickets with a phone camera at the door.
- Organizers see arrivals, capacity, and pending confirmations on one screen.
- Staff can undo a check-in, reissue a ticket, and transfer event ownership.
- Every correction keeps the name, time, and reason in the audit log.

## How the door flow works

1. Set up the event with capacity, times, form, and door team.
2. Register guests by link and send each guest a ticket by email.
3. Load the guest list onto the scanner phone before doors open.
4. Scan each ticket and admit the guest with one clear answer.

The scanner shows distinct messages for repeat scans, tickets for another event, and canceled tickets.

## How offline mode works

The scanner is a PWA built with Serwist. Dexie stores the guest list and scan queue in IndexedDB. Online scans go to the server for confirmation. Offline scans stay on the phone as unconfirmed. The same phone detects repeat scans locally. Separate phones reconcile their scans after reconnecting. Conflicts stay visible until staff resolve them.

## Ticket security

Each ticket carries an ECDSA signature. The private key signs at issue time. The public keys verify at scan time. Key rotation uses the `TICKET_SIGNING_KEY_ID` and `TICKET_PUBLIC_KEYS_JSON` pair. Bearer ticket paths use `no-referrer` and `no-store` headers. The paths are `/tickets/[token]`, `/offers/[token]`, `/staff-invitations/[token]`, and `/e/[slug]/verify`.

## Stack

- `next` 16.3.6 with the App Router and `react` 19.3.0
- `drizzle-orm` 0.45.2 with Postgres on Neon through `@neondatabase/serverless`
- `better-auth` 1.6.33 for email OTP sign-in and sessions
- `@serwist/next` 9.5.12 for the offline service worker
- `dexie` 4.4.4 for the on-device guest list and scan queue
- `@zxing/browser` 0.2.1 for camera scanning and `qrcode` 1.5.4 for ticket codes
- `resend` 6.18.0 for transactional email
- `tailwindcss` 4 with `@base-ui/react` 1.6.0 and `@tabler/icons-react` 3.45.0
- `zod` 4.4.3 for input validation

Email OTP handles sign-in without passwords. An email allowlist controls platform administration.

## Project structure

Routes live in `app`. Domain logic lives in `features`.

- `app` holds routes, layouts, and API handlers.
- `app/scanner` holds the volunteer scanning client.
- `app/tickets/[token]` holds the guest ticket page.
- `app/admin` holds moderation and operations screens.
- `app/api/events` holds event and registration endpoints.
- `app/api/scanner` holds check-in sync endpoints.
- `features` holds one folder per domain.
- `features/tickets` holds issue, reissue, and verify logic.
- `features/admission` holds check-in, undo, and conflict logic.
- `features/registration` holds form, answers, and capacity holds.
- `features/staffing` holds invites and door roles.
- `lib/db/schema.ts` holds the Drizzle schema.
- `drizzle` holds generated migrations.
- `compose.yaml` holds local Postgres plus the Neon WebSocket proxy.

## Run it locally

You need Node 24, Docker, and npm. The repo pins Node 24 in `engines`.

1. Install dependencies with `npm install`.
2. Start local Postgres with `docker compose up -d`.
3. Copy `.env.example` to `.env.local` and fill in the values below.
4. Point `DATABASE_URL` at local Postgres with `postgresql://postgres:postgres@localhost:54432/eventpass`.
5. Run migrations with `npm run db:migrate`.
6. Start the app with `npm run dev`.
7. Open `http://localhost:3000` and use the demo link on the home page.

The local proxy on port `54444` lets the Neon serverless driver talk to local Postgres. You do not need a Neon account for local work.

## Environment variables

Set the following values in `.env.local`.

| Name | Purpose |
| ---- | ------- |
| `DATABASE_URL` | Postgres connection string for Drizzle and the app |
| `PLATFORM_ADMIN_EMAILS` | Comma separated admin allowlist |
| `BETTER_AUTH_SECRET` | Session signing secret with at least 32 random characters |
| `BETTER_AUTH_URL` | Public auth origin for local work, such as `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Public app origin used in links and email |
| `RESEND_API_KEY` | API key for transactional email |
| `RESEND_FROM_EMAIL` | From address shown on ticket and OTP mail |
| `RESEND_WEBHOOK_SECRET` | Signing secret for Resend delivery webhooks |
| `TICKET_SIGNING_KEY_ID` | Active ECDSA key id, such as `2026-01` |
| `TICKET_SIGNING_PRIVATE_KEY_PEM` | PEM private key used to sign new tickets |
| `TICKET_PUBLIC_KEYS_JSON` | JSON map of key id to PEM public key used to verify scans |

## Scripts

| Command | Action |
| ------- | ------ |
| `npm run dev` | Start the dev server with webpack |
| `npm run build` | Build for production with webpack |
| `npm run start` | Serve the production build |
| `npm run check` | Run lint plus typecheck |
| `npm run lint` | Run ESLint with zero warnings allowed |
| `npm run typecheck` | Run Next typegen plus `tsc --noEmit` |
| `npm run db:generate` | Generate a migration from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations from `drizzle` |

## Notes for reviewers

To check the offline path, load the guest list, disconnect the network, scan the same ticket twice, and reconnect. The phone should detect the repeat locally. Offline scans remain provisional until the server reconciles them. Conflicts stay visible, and corrections record who changed the check-in and why.
