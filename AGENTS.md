# Master Rules Pointer
Read and follow C:\Users\USER\Desktop\antigravity\AGENTS.md before any task in this project. 
That file contains global rules for deployment, verification, and standing behavior — 
treat its contents as if written directly here.

# Update Rules
- Global-applicable learnings (deploy/verification/process) → tell user, don't write here
- Project-specific learnings (bugs, features, decisions) → update relevant section below
- End of session with any change made → update Current Status, 1-2 lines, no waiting to be asked

# Project: LeadFlow Worker 2 (Automated Lead Website Generator & Deployment Engine)

## Overview
- **Repository**: `levelupkartik-a11y/leadflow-worker2` (branch: `main`)
- **Central Deployment Target**: Cloudflare Pages (`leadflow-pitches`)
  - Live Base URL: `https://leadflow-pitches.pages.dev/<business-slug>`
- **Central Spreadsheet Registry**: Google Sheet (`1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k`)
- **Core Value Proposition**: Fully autonomous lead research, copywriting, HTML/CSS layout synthesis, AI image sourcing/generation, multimodal vision quality control, Cloudflare Pages deployment, and Google Sheets synchronization pipeline for local businesses.

## Tech Stack & Core Libraries
- **Runtime**: Node.js (CommonJS, Node 20 LTS)
- **DOM & AST Manipulation**: `cheerio` (Fast, resilient server-side HTML/CSS DOM manipulation and injection)
- **AI & LLM Services**:
  - `@google/genai` (Google GenAI SDK): Gemini 2.5 Flash used for template classification, fallback copywriting, and multimodal vision QA.
  - Groq API (`llama-3.1-8b-instant`): Ultra-fast primary copywriter generating structured JSON.
  - Replicate API (`replicate`): Flux / SDXL image generation models.
  - Pollinations.ai: High-speed photorealistic image generation endpoint fallback.
- **Automation & Integrations**:
  - Composio Tool Execution API (`backend.composio.dev`): `COMPOSIO_SEARCH_GOOGLE_MAPS`, Google Sheets batch updates (`GOOGLESHEETS_VALUES_GET`, `GOOGLESHEETS_BATCH_UPDATE`, `GOOGLESHEETS_GET_SHEET_NAMES`).
  - Cloudflare Wrangler CLI (`wrangler`): Pages project creation, secret uploads, and static folder deployments.
  - GitHub CLI (`gh`) & Git: Centralized self-cloning and push pipeline for website pitches.

## Core Pipeline Stages (`src/`)
- **Step 1: Research (`src/1-research.js`)**:
  - Queries Google Maps via Composio API using business name, location, and address disambiguation for generic terms (e.g. "Salon", "Restaurant").
  - Extracts title, category, reviews, photos, operating hours, full address, phone number, price level, attributes, and posts.
- **Step 2: Copywriter (`src/2-copywriter.js`)**:
  - Synthesizes factual research with `config/reference-kit.json` tone, length, and style rules.
  - Primary engine: Groq `llama-3.1-8b-instant` JSON mode with automatic fallback to Gemini 2.5 Flash.
  - Currency Rule: All pricing strictly in Indian Rupees (₹), never dollars ($).
  - Anti-Hallucination Rule: Never fabricate staff/team members; returns `[]` if not in real research.
  - Guaranteed Fallback Reviews & FAQs: Programmatically backfills high-quality context-aware reviews and 10 tailored FAQs if API data is missing.
- **Step 3: Template Selector (`src/3-template-selector.js`)**:
  - Classifies business category and selects optimal HTML template ID via Gemini 2.5 Flash classification with deterministic regex fallback.
- **Step 4: Layout Adapter (`src/4-layout-adapter.js`)**:
  - Cheerio-driven AST adapter injecting headlines, subheadings, clean business type tags, services, testimonials, FAQs, team bios, contact details, operating hours, and embedded maps.
  - Injects interactive client-side chat widgets and cleans broken placeholders.
- **Step 5: Image Pipeline (`src/5-image-pipeline.js`)**:
  - Multi-tier asset orchestrator: Prioritizes local sanitized curated assets (`assets/curated/`), Google Maps real photos, and dynamic AI-generated photorealistic images (Pollinations.ai / Replicate Flux).
  - Automatically sanitizes image filenames on disk to eliminate URL-breaking characters.
- **Step 5.5: Automated Multimodal Quality Check (`src/5.5-quality-check.js`)**:
  - Multimodal Vision Match: Validates rendered images against contextual heading text with Gemini Vision; flags cultural/cuisine mismatches (e.g., Chinese interior for North Indian food) and regenerates.
  - Required Field Integrity: Verifies presence of Headline, About, Phone, and Address anchors.
  - Sanity Token Checks: Catches unresolved `[Insert ...]` or `{BusinessName}` tokens.
  - Icon & Ligature Safety: Verifies Material Symbols stylesheet links and catches naked icon ligatures (e.g. raw text "local_dining").
- **Step 6: Consolidated Deployment Engine (`src/6-deploy.js`)**:
  - Determines collision-free deterministic project slug via Google Sheet registry.
  - Clones `leadflow-worker2` to a temporary directory, copies build output into `pitches/<projectName>`, commits & pushes back to GitHub `main`.
  - Deploys `pitches/` directory to central Cloudflare Pages project `leadflow-pitches`.
  - Uploads `GROQ_API_KEY` secret to Cloudflare Pages for live serverless chat endpoints.
- **Step 7: Sheet Reporter (`src/7-report.js`)**:
  - Synchronizes results back to Google Sheets.
  - Sheet 1 layout: Col K ("Generated Demo Website"), Col L ("Number of Reviews"), Col M ("QA Status").
  - Sheet 2+ layout: Col L ("Number of Reviews"), Col M ("QA Status"), Col N ("made websites").
  - Writes failure status (`NEEDS REVIEW: <reason>`) if QA or pipeline fails.
- **Step 8: WhatsApp Outreach (`src/8-whatsapp.js`)**:
  - Automated lead pitch dispatcher via WhatsApp.
  - Indian phone normalization (E.164 conversion, space stripping, landline detection).
  - Multi-provider support (Meta WhatsApp Cloud API, UltraMsg/Gateway, Composio, and safe dry-run/simulator fallback).
  - Updates Google Sheets Column O (`WhatsApp Status`) and Column H (`Status` -> `Outreached`).
- **Utilities (`src/utils.js`)**:
  - `composioExecute`: Robust Composio tool execution with strict 45-second abort controller timeouts.
  - `withTimeout`: Promise timeout wrapper preventing hangs on network calls.

## Execution & Automation Scripts
- **Single Build**: `node index.js "<MapsLink>" [RowId] [SheetName]`
  - Runs full end-to-end pipeline for a single target business.
- **Multi-Sheet Batch Builder**: `node run-sheets.js`
  - Automated orchestrator across all sheets in the spreadsheet (skips `Sheet1`, `Config`).
  - Pre-check: Skips rows where business already has an existing website in column C.
  - Concurrency & rate-limit throttling: Concurrency set to 1 with 5-second inter-task delays.
- **Dedicated Batch Outreach Worker**: `node run-outreach.js [--test] [--limit=N]`
  - Scans spreadsheet for businesses with generated websites, validates mobile numbers, and dispatches high-converting WhatsApp pitches with safe human delays (15–30s). Supports `--test` to divert all messages to personal phone for zero-risk verification.
- **Cloud WhatsApp Gateway**: `whatsapp-server/` deployed on Render (`leadflow-whatsapp-gateway.onrender.com`)
  - Connects physical WhatsApp Business mobile app via QR code. Exposes `/send` API and `/session` backup.
- **WhatsApp Outreach Test**: `node test-whatsapp.js`
- **Selector & QA Regression Tests**: `node test-selectors.js`, `node test-qa.js`, `node test-all.js`
- **GitHub Action Workflow**: `.github/workflows/run-sheets-pipeline.yml`
  - Scheduled cron triggers at `0 8,12 * * *` (08:00 & 12:00 UTC) with 5-hour timeout.

## Available HTML Templates (`templates/`)
1. `healthcare-dental`: Medical clinics, dental care, doctors, wellness centers, hospitals.
2. `beauty and salon`: Hair salons, spas, nail salons, barbershops, makeup studios.
3. `realestate`: Real estate agencies, property brokers, builders, property management.
4. `New folder (4)`: Restaurants, cafes, dhabas, bakeries, food & beverage outlets.
5. `Landingpagetemplate`: Gyms, fitness centers, crossfit studios, boutiques, e-commerce products.
6. `New folder (5)`: Generalist fallback for retail, contractors, mechanics, law firms, and local services.

## Critical Worker Rules & Guidelines
1. **Testimonial & Card Selector Safety**:
   - **Never** use generic element selectors like `$(el).find('span')` or `$(el).find('p')` inside repeating component cards.
   - Star icons are often represented as `<span>` tags (e.g. Material Symbols). Overwriting all `<span>` tags replaces star icons with text.
   - **Always** target specific classes (like `.testimonial-quote`, `.testimonial-author`) or precise relational selectors.
2. **Template Nesting & Tag Closure Checks**:
   - Verify all section tags in base templates are properly closed (`</section>`).
   - Missing closing tags cause sibling sections to nest, breaking grid column selectors (`.grid > div`).
3. **Fallback Content for API Fluctuation**:
   - Never drop sections (testimonials, FAQs, services) because Maps API returned minimal data.
   - Always synthesize rich, anonymous, category-appropriate fallback data.
4. **Strict Anti-Hallucination & Currency Rules**:
   - Never invent doctor, staff, or executive names.
   - All pricing copy must use Indian Rupees (₹), never USD ($).
5. **Rate Limiting & Timeout Discipline**:
   - Wrap external API calls with hard timeouts (`withTimeout`).
   - Catch Gemini 429 quota exhaustion with exponential backoff / retry loops.
6. **Outreach Safety & Pacing**:
   - Always verify `TEST_OUTREACH_PHONE` is cleared before live customer outreach runs.
   - Maintain 15–30 second randomized delays between outgoing WhatsApp messages.

## Current Status
- Both Website Builder and WhatsApp Outreach Workers are fully built, integrated, and connected. Outreach copy overhauled with human direct-response frameworks (SPEAR + Voss no-oriented CTA). Free Cloud WhatsApp Gateway operational on Render with permanent session backup support.

## Last Updated
- 2026-09-07
