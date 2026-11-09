# Noticias Group PWA

Responsive React PWA for Noticias Group. Published news, categories, article bodies, dates, authors, and featured images load from the public WordPress REST API at `https://noticiasgroup.com/wp-json/wp/v2/`.

## Local development

1. Install Node.js LTS.
2. Run `npm install`.
3. Optional for the MailerLite page: copy `.env.example` to `.env.local` and set `VITE_MAILERLITE_FORM_ID` to an active embedded form ID from the Noticias Group MailerLite account.
4. Run `npm run dev`.

The MailerLite account ID `2572385` is already published by the current Noticias Group website and is used as the default. The embedded form ID is not available in this project, so newsletter enrollment stays disabled and explicitly reports that no information was submitted until the ID is configured. Do not put MailerLite API keys or other secrets in `VITE_*` variables. The official embedded form handles validation, duplicates, consent, and double opt-in according to its MailerLite form/account settings.

## Build and deploy

- `npm run build` creates the static application in `dist/`.
- Deploy the contents of `dist/` to a separate SiteGround subdomain or app document root; do not overwrite or change the existing WordPress installation.
- Configure that app host to serve `index.html` for client-side routes such as `/categoria/mundo` and `/articulo/4147`. Keep the app at the web root of that host unless Vite's `base` path and router are configured for a subdirectory.
- After deployment, test an install-supported browser, refresh a category/article route, and load once before testing offline mode.

## Offline behavior

The service worker caches the app shell and static assets. If an app route is opened offline, the PWA displays `offline.html`. WordPress articles, images, and newsletter forms are not cached or advertised as readable/submittable offline.

## Current integration boundaries

- The WordPress REST API is public and read-only; API or network failures are displayed in the relevant screen rather than replaced with fabricated article content.
- MailerLite requires an active embedded form ID from the account. Configure the form's consent wording, group assignment, and double-opt-in behavior in MailerLite before setting the public form ID. Form IDs are public embed identifiers; API keys are not used in the client.
- Reader preferences remain local to the browser and are not synchronized to WordPress or MailerLite.
