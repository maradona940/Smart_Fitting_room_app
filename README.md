This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AI Service Integration

This project includes a separate AI/ML backend in `AI/` (FastAPI) that can run independently but is proxied by the platform API for convenience and auth.

### Run the AI service

```bash
cd AI
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

Ensure the AI assets are prepared (see `AI/README.md` for training and data generation).

### Configure the platform server to talk to AI

Set the AI service base URL for the Node server:

```bash
export AI_SERVICE_URL="http://localhost:8000"
```

Or add it to your `.env.local` used by the server:

```
AI_SERVICE_URL=http://localhost:8000
```

### Available proxied endpoints (require platform auth)

- POST `/api/ai/assign-room` — body: `{ item_ids: string[] }`
- GET `/api/ai/rooms/status`
- POST `/api/ai/predict-duration` — body: `{ item_ids: string[], entry_time?: string(ISO) }`
- POST `/api/ai/detect-anomaly` — body mirrors AI service schema
- GET `/api/ai/health` — public health of upstream AI service

### Frontend usage

Use the client helpers in `lib/api.ts` under `api.ai` (e.g., `api.ai.assignRoom([...])`). The base API URL is controlled by `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`).
