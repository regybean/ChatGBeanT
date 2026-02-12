# ChatGBeanT - Functional Requirements Specification

This document describes the complete set of user-facing functionality in ChatGBeanT.

---

## Table of Contents

- [1. Authentication & Accounts](#1-authentication--accounts)
- [2. Chat & Messaging](#2-chat--messaging)
- [3. Model Selection](#3-model-selection)
- [4. Image Generation](#4-image-generation)
- [5. Video Generation](#5-video-generation)
- [6. Thread Management](#6-thread-management)
- [7. Documents & Media Library](#7-documents--media-library)
- [8. Settings & Preferences](#8-settings--preferences)
- [9. API Key Management (BYOK)](#9-api-key-management-byok)
- [10. Token Usage & Rate Limiting](#10-token-usage--rate-limiting)
- [11. Admin Dashboard](#11-admin-dashboard)
- [12. Landing & Marketing Pages](#12-landing--marketing-pages)

---

## 1. Authentication & Accounts

### 1.1 Sign Up / Sign In

- Users can create an account or sign in using Clerk authentication.
- Email-based authentication is supported.
- User profile includes name and avatar image.

### 1.2 Account Tiers

| Tier | Basic Tokens | Premium Tokens | Image/Video Gen | Pro Models |
|------|-------------|----------------|-----------------|------------|
| **Basic** (Free) | 100 | 0 | No | No |
| **Pro** | 1,000 | 100 | Yes | Yes |
| **Basic + BYOK** | Unlimited* | Unlimited* | Yes* | Yes* |

\* When using personal API keys, token limits are bypassed for the corresponding provider.
Admin's can only make users Pro tier

### 1.3 User Roles

- **User**: Standard access to chat, documents, and media features.
- **Admin**: Additional access to the admin dashboard for managing users and models.

---

## 2. Chat & Messaging

### 2.1 Starting a Conversation

- Click "New Chat" to create a new thread.
- Sending the first message automatically creates and navigates to the thread.
- Threads receive an auto-generated title based on conversation content (refreshed every 5 user messages).
- Users can manually rename a thread at any time, which overrides automatic titling.

### 2.2 Sending Messages

- Type a message and press **Enter** to send.
- Press **Shift+Enter** to insert a new line without sending.
- Messages appear instantly (optimistic UI) before server confirmation.
- Message drafts are automatically saved and persist when switching threads.
- The last-used model is remembered across sessions.

### 2.3 AI Responses

- Responses stream in real-time with a typewriter effect.
- A "Thinking..." indicator appears while waiting for the model to respond.
- Users can **stop generation** mid-stream at any time.
- Each assistant message displays which model generated it.

### 2.4 Message Actions

- **Copy**: Hover over any message to reveal a copy-to-clipboard button.
- Full **Markdown rendering** including:
  - Code blocks with syntax highlighting
  - Headings, bold, italic, strikethrough
  - Numbered and bulleted lists
  - Blockquotes
  - Tables
  - Clickable links

### 2.5 File Attachments

- Drag-and-drop or use the file picker to attach images to a message.
- Multiple files can be attached at once.
- Attached files appear as image previews in the message.
- Only available when the selected model supports image/file input.

### 2.6 Document Attachments

- Attach saved text documents from the Documents library to any message.
- Document content is included as context for the AI.
- Multiple documents can be attached to a single message.
- Attached documents appear as labeled chips in the input area.

### 2.7 Media Attachments

- Attach previously generated images or videos to messages.
- Useful for sending generated media to image-to-video or image-to-image models.
- Media appears as thumbnails/previews in the message.

### 2.8 Thread Attachments

- Attach an entire previous conversation thread to a message.
- The thread's history is included as context for the AI.
- A visual indicator shows when "attach thread" mode is active.
- Click any thread in the sidebar to attach it while in this mode.

### 2.9 Error Handling

- Clear error messages for:
  - Rate limit exceeded (with retry countdown)
  - Token limit reached
  - Model unavailable
  - Generation failures
- Timeout detection (30 seconds) with helpful recovery messages.

---

## 3. Model Selection

### 3.1 Model Selector

- A dropdown/modal selector lets users choose which AI model to use.
- Models are searchable by name with debounced input.
- Models can be filtered by type: **All**, **Text**, **Image**, **Video**.

### 3.2 Model Categories

- **Text Models**: Standard conversational AI (Claude, GPT, Gemini, DeepSeek, etc.)
- **Image Models**: Text-to-image and image-to-image generation models.
- **Video Models**: Text-to-video and image-to-video generation models.

### 3.3 Model Discovery

- **Featured Models**: A curated set of popular models shown by default for quick access.
- **Recently Used**: The user's most recently used models are tracked and displayed.
- Provider icons are shown for quick visual identification.
- Each model displays its provider, tier (Basic/Pro), description, and supported modalities.

### 3.4 Access Control

- Basic-tier users can browse all models but can only use basic-tier models.
- Pro-tier models require a Pro subscription or a personal API key (BYOK).

---

## 4. Image Generation

### 4.1 Generating Images

- Select an image generation model and type a text prompt.
- Supported providers: FalAI models and OpenRouter image models.
- Status is tracked through the lifecycle: Pending, Generating, Completed, or Failed.
- Generated images are displayed inline in the chat.

### 4.2 Image-to-Image

- Attach one or more existing images to the prompt via drag-and-drop or file picker.
- The model uses the attached images as input for transformation or editing.

### 4.3 Image Actions

Hovering over a generated image reveals:
- **Copy**: Copy the image to the clipboard (falls back to URL).
- **Download**: Download the image as a PNG file.
- **Save to Documents**: Save the image to the media library for later use.

---

## 5. Video Generation

### 5.1 Generating Videos

- Select a video generation model and type a text prompt.
- Videos are generated asynchronously with progress tracking.
- A "This may take a minute" message is displayed during generation.
- Status is tracked: Pending, Generating, Completed, or Failed.
- Generated videos are displayed inline with playback controls.

### 5.2 Video Settings

A collapsible settings panel allows configuration before generating:
- **Duration**: 2-10 seconds (slider control).
- **Aspect Ratio**: 16:9 (landscape), 9:16 (portrait), or 1:1 (square).
- **Quality**: Draft or Standard.

### 5.3 Image-to-Video

- Attach an image to create a video from a still image.
- Duration and aspect ratio settings apply to image-to-video generation.

### 5.4 Video Actions

Hovering over a generated video reveals:
- **Copy URL**: Copy the video URL to the clipboard.
- **Download**: Download the video as an MP4 file.
- **Save to Documents**: Save the video to the media library for later use.

---

## 6. Thread Management

### 6.1 Sidebar Navigation

- All conversation threads are listed in the sidebar.
- Real-time search filters threads by title.
- Hovering over a thread prefetches its data for instant loading.

### 6.2 Automatic Time-Based Groups

Threads are automatically organized into:
- **Pinned**: Starred threads, always at the top.
- **Today**: Conversations from today.
- **Last 7 Days**: Conversations from the past week.
- **Last 30 Days**: Conversations from the past month.
- **Older**: All older conversations.

### 6.3 Custom Groups

- Users can create named groups (e.g., "Work", "Personal", "Research").
- Threads can be moved into custom groups.
- Groups can be renamed or deleted.
- Threads in custom groups are removed from time-based grouping.

### 6.4 Thread Actions

Right-click or use the context menu on any thread to:
- **Rename**: Set a custom title (overrides auto-generated titles).
- **Pin / Unpin**: Pin important threads to the top of the sidebar.
- **Move to Group**: Assign the thread to a custom group.
- **Remove from Group**: Return the thread to time-based grouping.
- **Delete**: Permanently delete the thread and all its messages.
- **Attach to Chat**: Add the thread's conversation to the current chat input as context.

---

## 7. Documents & Media Library

The Documents modal is accessible from the sidebar and organizes all user content in one place.

### 7.1 Text Documents

#### Creating & Managing Documents
- Create new documents (named or "Untitled Document").
- Search documents by title in real-time.
- Rename documents inline.
- Delete documents permanently.

#### Rich Text Editor
- Full WYSIWYG editor powered by BlockNote.
- Formatting support: bold, italic, headings, lists, code blocks, and more.
- Content auto-saves as you type.
- Dark and light theme support.

#### Using Documents
- Attach document content to any chat message for context.

### 7.2 Generated Images Library

- Grid thumbnail view of all saved images.
- Collapsible section with image count.
- Search images by title or prompt.
- Hover to see full title/prompt text.

#### Image Library Actions
- **Preview**: Click to view full-size in a modal.
- **Rename**: Give custom titles to images.
- **Attach to Chat**: Send the image to the chat input for use with multimodal models.
- **Copy**: Copy the image to the clipboard.
- **Download**: Download as PNG.

### 7.3 Generated Videos Library

- Grid thumbnail view with a play icon overlay.
- Collapsible section with video count.
- Search videos by title or prompt.

#### Video Library Actions
- **Preview**: Click to play full-size with controls.
- **Rename**: Give custom titles to videos.
- **Attach to Chat**: Send the video URL to the chat input.
- **Copy URL**: Copy the video URL to the clipboard.
- **Download**: Download as MP4.

---

## 8. Settings & Preferences

### 8.1 Appearance

- **Theme selection**: Light, Dark, or System (follows OS preference).
- Theme changes apply instantly and persist across sessions.

### 8.2 Account Information

- View your name and email.
- View your current plan: Basic, Pro, or Basic + BYOK.
- View token usage statistics (basic and premium tokens used).

### 8.3 Legal

- Links to Terms of Service and Privacy Policy.

### 8.4 Account Actions

- **Sign Out**: Log out of the application.

---

## 9. API Key Management (BYOK)

BYOK (Bring Your Own Key) allows Basic-tier users to access Pro-tier features using their own API keys.

### 9.1 OpenRouter API Key

- Add a personal OpenRouter API key to access all pro-tier text models.
- Keys are validated against the OpenRouter API before saving.
- The last 4 characters of a saved key are shown for identification.
- Keys can be removed with one click.

### 9.2 Fal.ai API Key

- Add a personal fal.ai API key to access image and video generation models.
- Keys are validated against the fal.ai API before saving.
- The last 4 characters of a saved key are shown for identification.
- Keys can be removed with one click.

### 9.3 BYOK Benefits

- Basic-tier users gain pro-tier model access.
- Token limits are bypassed when using personal keys.
- Users control their own API spend.
- Keys are stored securely and never shared.
- OpenRouter and fal.ai keys are managed independently.

---

## 10. Token Usage & Rate Limiting

### 10.1 Token Limits

- Each tier has defined token allowances (see [Account Tiers](#12-account-tiers)).
- Basic models consume basic tokens; premium models consume premium tokens.
- Usage resets periodically based on the user's reset timestamp.

### 10.2 Usage Display

- A compact token usage widget is visible in the sidebar.
- Shows current usage against limits with color-coded progress indicators.
- Detailed usage breakdown available in Settings.

### 10.3 Rate Limiting

- Burst rate limits prevent excessive message sending.
- When rate-limited, error messages display the retry-after time.

---

## 11. Admin Dashboard

Accessible only to users with the **Admin** role.

### 11.1 Dashboard Overview

- Summary statistics: total users, pro users, total threads, total messages, active models.
- Navigation cards link to management sections.

### 11.2 User Management

- Paginated, searchable table of all registered users.
- Displays name, email, tier, role, and creation date.
- **Update Tier**: Change a user between Basic and Pro.
- **Update Role**: Change a user between User and Admin.

### 11.3 Model Management

- Searchable list of all available models (OpenRouter and FalAI).
- Displays model name, provider, tier, featured status, and active status.
- **Sync OpenRouter Models**: Fetch the latest models from OpenRouter.
- **Sync FalAI Models**: Fetch the latest models from FalAI.
- **Toggle Featured**: Mark/unmark models as featured (shown by default in the model selector).
- **Toggle Active**: Enable/disable models (inactive models are hidden from all users).

---

## 12. Landing & Marketing Pages

### 12.1 Landing Page

- Hero section introducing multi-model AI chat.
- Feature highlights: multiple AI models, fast streaming, secure and private, tiered access.
- Call-to-action buttons: "Start Chatting Free" and "View Pricing".
- Navigation to Pricing, Sign In, and Sign Up.

### 12.2 Pricing Page

- Plan comparison between Basic and Pro tiers.
- Feature breakdowns per tier.

### 12.3 Legal Pages

- Terms of Service.
- Privacy Policy.
