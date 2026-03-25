/**
 * fetch-notion.mjs
 *
 * Pulls "Published" pages from a Notion database and writes them as
 * Markdown files into src/content/blog/. Images are downloaded locally
 * so the site doesn't depend on Notion's expiring CDN URLs.
 *
 * Required env vars (copy .env.example → .env and fill in):
 *   NOTION_API_KEY        – your Notion integration token
 *   NOTION_DATABASE_ID    – the ID of your blog database
 */

import { Client } from '@notionhq/client';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';

// ─── Config ──────────────────────────────────────────────────────────────────

const NOTION_API_KEY     = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
  console.error('Error: NOTION_API_KEY and NOTION_DATABASE_ID must be set in your environment.');
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const OUT_DIR    = new URL('../src/content/blog/', import.meta.url).pathname;
const IMAGES_DIR = new URL('../public/images/blog/', import.meta.url).pathname;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ─── Notion client ───────────────────────────────────────────────────────────

const notion = new Client({ auth: NOTION_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Turn a page title into a filesystem-safe slug. */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Download a remote image to src/assets/blog/ and return the local path.
 * Filename is deterministic (slug + hash of URL) so re-runs skip existing files.
 */
async function downloadImage(remoteUrl, slug) {
  const urlHash  = createHash('md5').update(remoteUrl).digest('hex').slice(0, 8);
  const ext      = path.extname(new URL(remoteUrl).pathname) || '.jpg';
  const filename = `${slug}-${urlHash}${ext}`;
  const localPath = path.join(IMAGES_DIR, filename);

  if (fs.existsSync(localPath)) {
    return `/images/blog/${filename}`;
  }

  await new Promise((resolve, reject) => {
    const get  = remoteUrl.startsWith('https') ? https.get : http.get;
    const file = fs.createWriteStream(localPath);

    get(remoteUrl, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(localPath);
        downloadImage(res.headers.location, slug).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      reject(err);
    });
  });

  return `/images/blog/${filename}`;
}

/** Extract plain text from a Notion rich-text array. */
function richText(arr = []) {
  return arr.map(t => {
    let text = t.plain_text;
    if (t.annotations?.code)          text = `\`${text}\``;
    if (t.annotations?.bold)          text = `**${text}**`;
    if (t.annotations?.italic)        text = `_${text}_`;
    if (t.annotations?.strikethrough) text = `~~${text}~~`;
    if (t.href)                        text = `[${text}](${t.href})`;
    return text;
  }).join('');
}

/** Pull all pages from a database, auto-paginating. */
async function queryAll(databaseId, filter) {
  const pages = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      filter,
      start_cursor: cursor,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

/** Fetch all blocks for a page, auto-paginating. */
async function getBlocks(blockId) {
  const blocks = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

/**
 * Convert Notion blocks to Markdown.
 * Handles the most common block types used in blog posts.
 */
async function blocksToMarkdown(blocks, slug, indent = '') {
  const lines = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const type  = block.type;
    const data  = block[type];

    switch (type) {
      case 'paragraph':
        lines.push(indent + (richText(data.rich_text) || ''));
        break;

      case 'heading_1':
        lines.push(indent + '# ' + richText(data.rich_text));
        break;
      case 'heading_2':
        lines.push(indent + '## ' + richText(data.rich_text));
        break;
      case 'heading_3':
        lines.push(indent + '### ' + richText(data.rich_text));
        break;

      case 'bulleted_list_item':
        lines.push(indent + '- ' + richText(data.rich_text));
        break;
      case 'numbered_list_item':
        lines.push(indent + '1. ' + richText(data.rich_text));
        break;

      case 'to_do':
        lines.push(indent + `- [${data.checked ? 'x' : ' '}] ` + richText(data.rich_text));
        break;

      case 'quote':
        lines.push(indent + '> ' + richText(data.rich_text));
        break;

      case 'divider':
        lines.push('---');
        break;

      case 'code':
        lines.push('```' + (data.language || ''));
        lines.push(richText(data.rich_text));
        lines.push('```');
        break;

      case 'image': {
        const url = data.type === 'file' ? data.file.url : data.external.url;
        const caption = richText(data.caption) || '';
        const sizeClass = ['small', 'medium', 'full'].includes(caption.toLowerCase())
          ? `img-${caption.toLowerCase()}` : '';
        try {
          const local = await downloadImage(url, slug);
          if (sizeClass) lines.push(`<img src="${local}" class="${sizeClass}" alt="" />`);
          else lines.push(`![${caption}](${local})`);
        } catch {
          if (sizeClass) lines.push(`<img src="${url}" class="${sizeClass}" alt="" />`);
          else lines.push(`![${caption}](${url})`);
        }
        break;
      }

      case 'callout':
        lines.push('> ' + richText(data.rich_text));
        break;

      case 'toggle': {
        lines.push(indent + richText(data.rich_text));
        // Fetch and render toggle children indented
        if (block.has_children) {
          const children = await getBlocks(block.id);
          const inner = await blocksToMarkdown(children, slug, indent + '  ');
          lines.push(inner);
        }
        break;
      }

      default:
        // Unknown block type — skip silently
        break;
    }

    // Render children for blocks that support them (except toggle, handled above)
    if (block.has_children && type !== 'toggle') {
      const children = await getBlocks(block.id);
      const inner    = await blocksToMarkdown(children, slug, indent + '  ');
      if (inner) lines.push(inner);
    }

    lines.push(''); // blank line between blocks
    i++;
  }

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching published pages from Notion…');

  const pages = await queryAll(NOTION_DATABASE_ID, {
    property: 'Status',
    status: { equals: 'Published' },
  });

  console.log(`Found ${pages.length} published page(s).`);

  for (const page of pages) {
    const props = page.properties;

    const title       = props.Name?.title?.map(t => t.plain_text).join('') ?? '';
    const description = props.Description?.rich_text?.map(t => t.plain_text).join('') ?? '';
    const pubDate     = props.PubDate?.date?.start ?? page.created_time;
    const updatedDate = props.UpdatedDate?.date?.start ?? undefined;
    const tags        = props.Tags?.multi_select?.map(t => t.name) ?? [];

    const heroImageUrl =
      props.HeroImage?.files?.[0]?.file?.url ??
      props.HeroImage?.files?.[0]?.external?.url ??
      page.cover?.file?.url ??
      page.cover?.external?.url ??
      null;

    if (!title) {
      console.warn(`  Skipping page ${page.id}: no title found.`);
      continue;
    }

    const slug = slugify(title);
    console.log(`  Processing: "${title}" → ${slug}.md`);

    // Download hero image
    let heroImage;
    if (heroImageUrl) {
      try { heroImage = await downloadImage(heroImageUrl, slug); }
      catch (err) { console.warn(`  Warning: hero image failed: ${err.message}`); }
    }

    // Fetch and convert page content
    const blocks = await getBlocks(page.id);
    const body   = await blocksToMarkdown(blocks, slug);

    // Build frontmatter
    const fm = [
      '---',
      `title: ${JSON.stringify(title)}`,
      `description: ${JSON.stringify(description)}`,
      `pubDate: ${pubDate}`,
    ];
    if (updatedDate) fm.push(`updatedDate: ${updatedDate}`);
    if (heroImage)   fm.push(`heroImage: ${JSON.stringify(heroImage)}`);
    if (tags.length) fm.push(`tags: [${tags.map(t => JSON.stringify(t)).join(', ')}]`);
    fm.push('---', '');

    // Write file
    const outPath = path.join(OUT_DIR, `${slug}.md`);
    fs.writeFileSync(outPath, fm.join('\n') + body);
    console.log(`  Written: ${outPath}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
