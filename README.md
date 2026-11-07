# EventPass

Event registration, QR tickets, and a door scanner that keeps working when the venue Wi-Fi doesn't.

Organizers create an event, customize the registration form, and share a link. Guests register without an account and get a ticket page with a QR code. Door volunteers scan tickets with a phone camera; if the network drops, the scanner keeps admitting guests from the guest list stored on the phone and syncs when it reconnects.

**Try it:** run the app and click **Try the live demo** on the home page. It signs you into a throwaway account with a sample event of 46 guests mid check-in. No email needed.

## Features

- **Events**: title, description, location, time zone-aware start/end, optional capacity, draft → published → cancelled.
- **Custom registration forms**: short answer, paragraph, multiple choice, and checkbox questions, each optionally required.
- **Registration**: capacity is enforced under a row lock so concurrent sign-ups can't overshoot. Registering twice with the same email re-sends the ticket to that inbox instead of revealing it.
- **Tickets**: `/t/<code>` shows a QR code, check-in status, an `.ics` calendar download, print, and self-cancel. The 16-character code (≈80 bits) is the credential, so ticket pages send `no-referrer` and `no-store`.
- **Organizer dashboard**: live arrival stats, guest search and filters, manual check-in and undo, add guests by hand, CSV export.
- **Door team**: add volunteers by email. They sign in and see only the scanner for that event.
- **Offline door scanner**: see below.
- **Sign-in**: passwordless 6-digit email codes (hashed, expiring, attempt- and rate-limited) with database sessions in an httpOnly cookie.

## How the offline scanner works

`/scan/<eventId>` downloads the event's guest list to the phone (`localStorage`) and refreshes it every 15 seconds.

- **Online**, each scan is sent to `/api/scan/<eventId>`. The server admits a ticket with one conditional `UPDATE … WHERE checked_in_at IS NULL`, so two doors scanning the same ticket at the same moment can't both admit it.
- **Offline** (or if the server doesn't answer within 5 seconds), the scanner decides from the on-device list, catches repeat scans locally, and queues the admission with its scan time.
- **On reconnect**, the queue replays to the server, which stays the source of truth. If another door had already admitted that ticket, the scanner shows a conflict banner ("may have been let in twice").
- A small service worker (`public/sw.js`) caches the scanner page and build assets, so the scanner reopens even if the phone reloads it with no network.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · PostgreSQL with Drizzle ORM · Tailwind CSS 4 · Zod · `@zxing/browser` for camera scanning · `qrcode` for ticket codes · Resend's HTTP API for email (optional).

## Project layout

```
app/
  page.tsx                  landing page + demo
  sign-in/                  email-code sign-in
  (workspace)/events/       organizer dashboard (list, new, [eventId]/{overview,guests,form,settings})
  e/[slug]/                 public event page + registration
  t/[code]/                 guest ticket page + calendar file
  scan/[eventId]/           door scanner (client) and its offline logic (use-door.ts)
  api/scan/[eventId]/       guest-list snapshot (GET) and check-ins (POST)
lib/
  auth.ts                   login codes and sessions
  events.ts                 access control, registration, check-in
  db/schema.ts              database schema
  email.ts, time.ts, demo.ts, tickets.ts, utils.ts
public/sw.js                scanner offline shell
drizzle/                    migrations
```

## Run it locally

Requires Node 24 and Docker (Node 22 also works locally).

```bash
npm install
docker compose up -d          # Postgres on localhost:54432
cp .env.example .env.local    # defaults work for local development
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Without `RESEND_API_KEY`, every email (including sign-in codes) is printed to the terminal running the dev server.

To try the scanner's camera on a phone you need HTTPS (browsers only allow camera access on secure origins); for example `next dev --experimental-https`, or a tunnel. Typing a code and searching by name work anywhere.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `NEXT_PUBLIC_APP_URL` | yes | Public origin used in emailed links |
| `RESEND_API_KEY` | no | Sends email through Resend; when unset, emails are logged instead |
| `RESEND_FROM_EMAIL` | no | Sender, e.g. `EventPass <tickets@yourdomain.com>` |

## Scripts

| Command | Action |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run check` | ESLint + TypeScript |
| `npm test` | Unit tests (`node --test`) |
| `npm run db:generate` | Generate a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |

## Deploying

Any Node host with Postgres works. On Vercel, `vercel-build` runs migrations before building. Set the environment variables above.
