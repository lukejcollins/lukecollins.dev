# lukecollins.dev

A minimal blog built with Next.js 16 (App Router) and Sanity v4. Posts are stored in Sanity and rendered via GROQ queries.

## Requirements
- Node.js 18.18+ (Next.js 16 requirement)
- npm 10+
- A Sanity project with a dataset that allows public read access (or a read token wired in if you prefer private datasets)

## Setup
1) Install dependencies:
```bash
npm install
```
2) Create `.env.local` with your Sanity project info:
```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
# Optional: defaults to 2025-11-28 if omitted
NEXT_PUBLIC_SANITY_API_VERSION=2025-11-28
```
3) Start the app:
```bash
npm run dev
```
Visit `http://localhost:3000` for the blog and `http://localhost:3000/studio` for the Studio.

## Scripts
- `npm run dev` – Next dev server (includes Studio route)
- `npm run build` – Production build
- `npm run start` – Start a production build locally
- `npm run lint` – ESLint

## Content model
Defined in `sanity/schemaTypes/post.ts`:
- `title` (string, required)
- `slug` (slug from title, required)
- `publishedAt` (datetime)
- `excerpt` (text)
- `content` (portable text blocks)

## How it works
- `app/page.tsx` lists all posts with title, publish date, and excerpt.
- `app/[slug]/page.tsx` renders a single post using PortableText.
- GROQ queries live in `lib/sanity.queries.ts`; the client is configured in `lib/sanity.client.ts`.
- Sanity Studio is configured via `sanity.config.ts` and mounted at `app/studio/[[...tool]]/page.tsx`.

## Deployment notes
- Ensure the Sanity environment variables are set wherever you deploy (e.g., Vercel project settings).
- If your dataset is private, update `lib/sanity.client.ts` to pass a token and set `useCdn: false`.

## Grafana Cloud Loki logging
- Set env vars in Vercel: `GRAFANA_LOKI_HOST=https://<stack-id>.logs.grafana.net`, `GRAFANA_LOKI_USER=<user>`, `GRAFANA_LOKI_API_KEY=<api_key>`, and optionally `LOG_ENV=production`.
- Use the server-only helper to push logs to Loki (works in API routes/route handlers/server actions):
```ts
import { logToLoki } from "@/lib/lokiLogger";

export async function GET() {
  await logToLoki("info", "healthcheck", { route: "/api/health" });
  return new Response("ok");
}
```
- The helper no-ops when credentials are missing, and labels stay low-cardinality (`app`, `env`, `level`, plus any you pass).
- Automated logging:
  - Request lifecycle (`kind=request`) for handlers using `logRequestStart` (e.g., `/api/health`, `/api/log-client`) with `route/method/status` labels and duration in payload.
  - Edge logging (`kind=request`, `runtime=edge`) for matched routes via `proxy.ts`.
  - Server request errors (`kind=errorhook`) via `instrumentation.ts` -> `onRequestError`.
  - Sanity fetches (`kind=sanity`) via `fetchFromSanity` with duration and optional context (e.g., route/intent/slug) in payload.
  - Client runtime errors (`kind=client`) captured by `ClientErrorReporter` and POSTed to `/api/log-client`.
  - Process-level crashes (`kind=process`) from `setupProcessLogging` for `unhandledRejection`/`uncaughtException`.
  - Console bridge (sampled via `LOG_CONSOLE_SAMPLE_RATE`, default 0.1) forwards a sample of `console.error`/`warn` to Loki.
  - Optional helper for ISR (`logRevalidate`) to keep payloads consistent when logging revalidate events.
