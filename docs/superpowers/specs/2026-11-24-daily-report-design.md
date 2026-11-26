# Automated Daily Report: Design

Date: 2026-11-24 · Status: awaiting approval

## Purpose and reasons
An open source, hospitality-themed portfolio for its owner (a vibe coder, not a programmer). The first module of the `resort-ops-automation` repo: an automated daily report sent to Telegram. The reason: show real automation that can be demoed, drawn from experience in resort operations.

## Goals
- Every morning at 07:00 WIB, a summary message reaches the manager's Telegram with no manual work.
- The report content matches the approved sketch (occupancy, check-ins/check-outs, revenue vs last week, new bookings + unpaid, a warning about pending payments).
- Anyone can fork the repo, fill in their own bot token, and run it.
- The data source can be swapped for a real booking backend without changing anything else.

## Non-goals
- An interactive bot or guest responder (a separate track, later).
- An always-on service, a web dashboard, a mobile app.
- Real data integration for now.

## Anti-goals (count as failure even if it works)
- Guest data, internal prices, or real credentials in the public repo.
- A committed bot token.
- Only the owner can run it (not reproducible).

## Constraints
- Public repo, MIT license, fictional property name.
- Free: no paid server.
- The owner creates the Telegram bot through BotFather and fills in the GitHub secrets; the token never appears in chat or code.

## Approaches
| | How | Notes |
|---|---|---|
| A | An always-on service on a VPS | Costs money, hard to reproduce |
| **B (chosen)** | A script run by scheduled GitHub Actions | Free, the run history is proof, easy to fork. Ceiling: scheduled runs can be a few minutes late |
| C | n8n | Rejected: less convincing as a portfolio piece |

The owner chose B. An always-on service is only needed at the Guest Companion stage.

## Decisions (my calls, open to change)
- Language: TypeScript, Node 20, run with `tsx`.
- Telegram is called directly with `fetch` against the Bot API, with no extra library.
- Data comes through one `DataSource` interface; the first implementation, `DummyDataSource`, produces realistic data that is deterministic per date (fictional property "Villa Senja").
- Dry-run mode: without a token, the report is printed to the console (for demos and tests).
- Schedule: cron `0 0 * * *` UTC (= 07:00 WIB) + `workflow_dispatch` for a manual demo.
- Tests: one `node:test` file for metric calculations and message formatting.
- The report is in Indonesian, with amounts formatted in Rp.
- README: purpose, a screenshot of the message, how to fork + set up the bot, how to swap the data source.

## Left to the builder
Generating the dummy numbers, the exact message layout, the folder structure, the workflow YAML, and the `.gitignore`/`.env.example` setup.
