# ED Sepsis Brief (codesepsis.app)

A Sepsis Initiative. A one-page brief for emergency physicians that summarizes the ED Sepsis Clinical Framework (September 2026), plus a disclosure page.

**Educational resource only.** This is an unofficial summary for learning and local implementation planning. It is not medical advice and creates no duty of care; see the Disclaimer at the bottom.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The brief |
| `disclosure.html` | Educational use, no duty of care, source, accuracy, preparation, privacy |
| `styles.css` | Shared styles for both pages, light and dark |
| `theme.js` | Light and dark mode toggle. Remembers the choice in the browser. |
| `favicon.svg` | Browser tab icon |
| `_headers` | Security headers sent with every page |
| `wrangler.jsonc` | Cloudflare Workers config: serves this folder as static assets |
| `.assetsignore` | Keeps the config and repo files out of the public upload |

## Light and dark mode

Both pages follow the system light or dark setting by default. The "Dark mode" switch at the top of each page overrides it, and `theme.js` remembers the choice in the browser (local storage only, nothing is sent anywhere). Without JavaScript the switch is hidden and the pages still follow the system setting. Printing always uses the light colours.

## How it is deployed

- This GitHub repo is connected to a Cloudflare Workers project named `codesepsis` (Workers Builds). Every commit to `main` redeploys the site.
- Build settings: no build command, deploy command `npx wrangler deploy`, root directory `/`. `wrangler.jsonc` holds the rest.
- Custom domain: `codesepsis.app` (Worker > Settings > Domains & Routes).
- The site is public. There is no sign-in.

## Security headers

`_headers` sets a strict Content-Security-Policy that allows only the site's own scripts (the light and dark toggle) and no third-party scripts, plus `noindex`, and headers that block framing and content sniffing. Pages also carry a `noindex` meta tag; remove it from both headers and pages if the site should appear in search results.

## Editing content

Edit `index.html` or `disclosure.html` on GitHub and commit to `main`. Cloudflare redeploys in about a minute. When content changes, update the "Last reviewed" date in the footer of both pages and in the Accuracy section of the disclosure page. Each section header in the brief lists the framework pages it came from.

## Content notes

Doses, thresholds and time targets are reproduced as written in the framework, with page references. The "Decisions and gaps to settle locally" section is the authors' own analysis and is not part of the framework. The framework and each hospital's approved tools take precedence.

## Disclaimer

**Educational resource only. No duty of care.** This project is an educational resource for health care professionals. It is not medical advice, not a clinical guideline or protocol, and it does not replace professional judgment. Using it creates no duty of care, no clinician–patient relationship and no other professional relationship between its authors and any user or patient. Every clinical decision remains the responsibility of the treating clinician, working within their scope of practice and their hospital's approved policies, protocols and order sets. No warranty is given that the content is complete or current, and the authors accept no liability for decisions made using it. See `disclosure.html` for details.
