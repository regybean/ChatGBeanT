# Plan: Thread Attach Visual Fix, Thread Display in Messages, AI Thread Naming

## Context
Three changes requested:
1. Thread attach mode visual: replace ring/border with purple hue background
2. Attached threads should display as chips in messages (like documents), not raw JSON
3. Auto-name threads using `openrouter/free` model based on messages, with periodic updates

---

## 1. Fix Attach Mode Visual (purple hue instead of ring border)

**File:** `apps/web/src/components/chat/thread-item.tsx`

- Replace `ring-1 ring-primary/50 rounded-md cursor-pointer` with `bg-purple-500/15 cursor-pointer` on the `SidebarMenuItem` when `isAttachMode` is true

---

## 2. Display Attached Threads as Chips in Message Bubbles (not JSON)

Currently, attached threads are injected into message content as `[Thread: Title]\n{JSON...}` (chat.ts:648). The message-bubble.tsx parses `[Document: Title]` and `[ATTACHED_IMAGE:url]` into chips but has no equivalent for threads.

### 2a. Add `parseThreadReferences()` in message-bubble.tsx

**File:** `apps/web/src/components/chat/message-bubble.tsx`

- Add `parseThreadReferences()` matching `parseDocumentReferences()` pattern
- Pattern: `/\[Thread: ([^\]]+)\]\n[\s\S]*?(?=\n\n---\n\n|\[Thread:|$)/g`
- Extracts thread titles, strips JSON content + separator from displayed text
- Call it in processing chain after images, before documents
- Render thread chips for user messages with `MessageSquare` icon (like document chips use `FileText`)

---

## 3. AI-Powered Thread Auto-Naming

### Schema change
**File:** `packages/backend/convex/schema.ts`

Add to `userThreads`:
- `manuallyRenamed: v.optional(v.boolean())` — set on manual rename, prevents auto-rename
- `messageCount: v.optional(v.number())` — tracks user messages for interval logic

### Constants
**File:** `packages/backend/convex/chat.ts` (top of file)

```
TITLE_UPDATE_INTERVAL = 5       // Update title every N user messages
TITLE_CONTEXT_MESSAGES = 15     // Use last N messages for context
TITLE_MODEL = 'openrouter/free' // Model for generation
```

### 3a. Mark manual renames
**File:** `packages/backend/convex/chat.ts` — `renameThread` mutation (line 937)

Add `manuallyRenamed: true` to the `ctx.db.patch()` call.

### 3b. Rewrite `maybeUpdateThreadTitle` (line 862)

1. If `manuallyRenamed` → return
2. Increment `messageCount`
3. If first message: set fallback title (first 50 chars), then `ctx.scheduler.runAfter(0, internal.chat.generateThreadTitle, ...)`
4. If `messageCount % TITLE_UPDATE_INTERVAL === 0`: schedule `generateThreadTitle`
5. Otherwise: just return

### 3c. New `generateThreadTitle` internalAction

- Re-check `manuallyRenamed` via query
- Get last `TITLE_CONTEXT_MESSAGES` messages via `getThreadMessagesInternal`
- Call `openrouter/free` via `fetch('https://openrouter.ai/api/v1/chat/completions', ...)` with system prompt asking for short title
- Save via `setGeneratedTitle` mutation

### 3d. New `setGeneratedTitle` internalMutation

- Check `manuallyRenamed` again before patching
- Patch title + updatedAt

### 3e. New `getUserThreadById` internalQuery

- Simple `ctx.db.get(args.userThreadId)` — needed by action since actions can't read DB directly

---

## Files to Modify
1. `apps/web/src/components/chat/thread-item.tsx` — purple hue styling
2. `apps/web/src/components/chat/message-bubble.tsx` — thread parser + chip display
3. `packages/backend/convex/schema.ts` — add `manuallyRenamed`, `messageCount`
4. `packages/backend/convex/chat.ts` — constants, rewrite title logic, new action/mutation/query, update `renameThread`

## Verification
1. Toggle attach mode → threads have purple hue, no border ring
2. Attach thread → send message → thread shows as chip not JSON
3. First message → fallback title + AI title shortly after; 5th message → title updates; manual rename → never auto-updates
4. `npx tsc --noEmit` on both tsconfig files
5. `npx convex dev` deploys schema without errors
