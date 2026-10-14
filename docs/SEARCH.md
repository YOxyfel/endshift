# Search and sharing

What's already done on every page, and the few things only you can do.

## Already in the site

- **Titles and descriptions** written per page and language (`meta` in each `src/content/<lang>/<page>.js`). Keep titles under about 60 characters before " | ENDSHIFT", and say what the page is about in words people search for ("how to switch off after work", not "Journal").
- **Two languages, linked to each other**: every page has `hreflang` links to its English and Bulgarian versions and an `x-default`. Bulgarian browsers on English pages get a small "Прочети на български" note (never a redirect).
- **Share cards**: each main page and each guide has its own drawn 1200×630 card in both languages (`src/assets/img/og/`). After changing a title or a picture: `npm run build`, `npm run og`, `npm run build`.
- **Structured data**: the organisation on the home page, FAQ answers on the FAQ page, articles on the guides, and breadcrumbs (ENDSHIFT › Journal › guide) on every inner page. The product appears only once it can be bought.
- **Sitemap and robots**: `dist/sitemap.xml` and `dist/robots.txt` are written on every build. Internal pages (the design system, the 404) are `noindex`.
- **Speed**: fonts are self-hosted, pictures are WebP with two sizes, and the 3D only starts when it's needed.

## The day the domain is live

1. Set `siteUrl` in `site.config.js` to the real domain and deploy (the canonical links, sitemap and share cards all use it). Run `npm run og` once more so the domain is printed on the cards.
2. **Google Search Console**: add the domain as a *Domain property* (verify with the DNS TXT record your registrar lets you add). Then Sitemaps → submit `https://<domain>/sitemap.xml`.
3. **Bing Webmaster Tools**: "Import from Google Search Console" (one click).
4. Check one page of each kind in the [Rich Results Test](https://search.google.com/test/rich-results): `/faq/`, a guide, `/reset/`.
5. Paste the home page, `/reset/` and one guide into the [Facebook sharing debugger](https://developers.facebook.com/tools/debug/) to see the cards (and refresh them after changes).

## Every month

- Search Console → Performance → Queries: which searches already show the site. A query with impressions and few clicks is a title to rewrite; a query with no page behind it is the next guide.
- Planned guides are listed on the journal page (`src/content/<lang>/journal.js → planned`). Each new guide: both languages, sources at the bottom, a "Take this into tonight" list, a cover (`GUIDE_COVERS` in `src/templates/components.js`), then `npm run og`.
