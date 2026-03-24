# manishbista.com

Personal site and blog. Built with Astro, content managed via Notion.

## Stack

- [Astro](https://astro.build) — static site generator
- Notion — CMS (posts written in Notion, synced via script)
- Beehiiv — newsletter

## Dev

```sh
npm install
npm run dev
```

## Content

Sync posts from Notion:

```sh
npm run notion:sync
```

Requires a `.env` file — see `.env.example`.
