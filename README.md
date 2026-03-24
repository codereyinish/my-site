# manishbista.com

> Personal site and blog — built with Astro, written in Notion, deployed on Vercel.

---

## Stack

| Layer | Tool |
|-------|------|
| Framework | [Astro](https://astro.build) |
| CMS | Notion |
| Newsletter | Beehiiv |
| Hosting | Vercel |
| Automation | cron-job.org (triggers Vercel rebuild hourly — no Notion Pro needed) |

---

## Local Dev

```sh
npm install
npm run dev
```

---

## Content Sync

Posts are written in Notion and synced to `.md` files via a custom script.

```sh
npm run notion:sync
```

Requires a `.env` file — copy from `.env.example` and fill in your keys.

On Vercel, the sync runs automatically on every deploy via the build command:

```
npm run notion:sync && npm run build
```

---

## Automation

Site rebuilds every hour via a cron job on [cron-job.org](https://cron-job.org) — no Notion Pro or paid automation required. The cron calls a Vercel deploy hook, which triggers a fresh sync + build.

```
cron-job.org (hourly) → Vercel deploy hook → notion:sync → build → live
```
