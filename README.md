# ChatGBeanT

Working demo at https://chatgbeant.com

A multi-model AI chat application with image and video generation, document management, and a rich conversational interface.

Chat with Claude, GPT, Gemini, DeepSeek, and more — all in one place. Generate images and videos from text prompts, organize conversations into groups, and build a personal media library.

## Features

- **Multi-model chat** — Switch between 1000+ AI models from providers like Anthropic, OpenAI, Google, and DeepSeek. Responses stream in real-time.
- **Image generation** — Generate images from text prompts using FalAI and OpenRouter models. Attach images for image-to-image editing.
- **Video generation** — Generate videos from text or image prompts with configurable duration, aspect ratio, and quality.
- **Documents & media library** — Create rich text documents, save generated images and videos, and attach any of them to future conversations for context.
- **Thread organization** — Pin, group, rename, and search threads. Automatic time-based grouping (Today, Last 7 Days, etc.) plus custom named groups.
- **Thread & document context** — Attach entire previous conversations or documents to new messages to give the AI additional context.
- **BYOK (Bring Your Own Key)** — Add your own OpenRouter and fal.ai API keys to unlock pro-tier models on the free plan.
- **Admin dashboard** — Manage users, tiers, roles, and models. Sync models from OpenRouter and FalAI. Toggle featured and active status.
- **Theming** — Light, Dark, and System themes.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), React 19, Tailwind CSS v4 |
| Backend | [Convex](https://convex.dev) (database, server functions, file storage) |
| Auth | [Clerk](https://clerk.dev) |
| AI Chat | [Convex Agent](https://www.npmjs.com/package/@convex-dev/agent), OpenRouter |
| Media Gen | [fal.ai](https://fal.ai), OpenRouter |
| Monorepo | Turborepo |

## Project Structure

```
ChatGBeanT/
  apps/
    web/          — Next.js frontend
  packages/
    backend/      — Convex backend (schema, server functions, actions)
    ui/           — Shared UI components
  docs/           — Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account (free)
- A [Clerk](https://clerk.dev) account (free)

### 1. Install dependencies

```sh
pnpm install
```

### 2. Configure Convex

```sh
pnpm setup --workspace packages/backend
```

This will log you into Convex and prompt you to create a project. Then set the following environment variables in the [Convex dashboard](https://dashboard.convex.dev/deployment/settings/environment-variables):

- `CLERK_ISSUER_URL` — from your Clerk [JWT template](https://dashboard.clerk.com/last-active?path=jwt-templates) (use the "convex" template)
- `OPENROUTER_API_KEY` — from [OpenRouter](https://openrouter.ai/keys)
- `FAL_KEY` — from [fal.ai](https://fal.ai/dashboard/keys) (for image/video generation)

### 3. Configure the web app

Create `.env` using `.example.env` as a template:

### 4. Run the app

```sh
pnpm dev
```

## Deploying

Deploy using vercel and convex integration 

## Documentation

- [Functional Requirements](docs/requirements.md) — Complete specification of all user-facing features

