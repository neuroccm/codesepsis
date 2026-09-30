# ED Sepsis Brief (codesepsis.app)

A Sepsis Initiative. A one-page brief for emergency physicians that summarizes the ED Sepsis Clinical Framework (September 2026), plus a disclosure page.

**Keep this repository private.** The source framework is intended for authorized health care personnel and is not for public distribution. The site is only served to people who sign in through Cloudflare Access.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The brief |
| `disclosure.html` | Educational use, no duty of care, source, accuracy, preparation, privacy |
| `styles.css` | Shared styles for both pages, light and dark |
| `theme.js` | Light and dark mode toggle. Remembers the choice in the browser. |
| `favicon.svg` | Browser tab icon |
| `_worker.js` | Sign-in gate that checks the Cloudflare Access token on every request |

## Light and dark mode

Both pages follow the system light or dark setting by default. The "Dark mode" switch at the top of each page overrides it, and `theme.js` remembers the choice in the browser (local storage only, nothing is sent anywhere). Without JavaScript the switch is hidden and the pages still follow the system setting. Printing always uses the light colours.

## How it is deployed

- This GitHub repo is connected to Cloudflare Pages. Every commit to `main` redeploys the site.
- Pages build settings: framework preset **None**, no build command, build output directory `/`.
- Custom domain: `codesepsis.app`.
- A Cloudflare Access application covers `codesepsis.app`. Sign-in uses a one-time code sent by email, and the policy allows only listed email addresses.
- Two environment variables are set on the Pages project (Settings > Variables and Secrets > Production):
  - `CF_ACCESS_TEAM_DOMAIN`: `https://<team-name>.cloudflareaccess.com`
  - `CF_ACCESS_AUD`: the Access application's Application Audience (AUD) tag. Separate several tags with commas.

  Variable changes take effect on the next deployment.

## Adding or removing people

In the Cloudflare dashboard, open Zero Trust > Access > Applications, open the `codesepsis.app` application, and edit its Allow policy. Add individual emails, or an "Emails ending in" rule for a whole hospital domain. No code change is needed.

## Editing content

Edit `index.html` or `disclosure.html` on GitHub and commit to `main`. Cloudflare redeploys in about a minute. When content changes, update the "Last reviewed" date in the footer of both pages and in the Accuracy section of the disclosure page. Each section header in the brief lists the framework pages it came from.

## How the sign-in gate works

`_worker.js` runs in front of every file (Cloudflare Pages advanced mode). A request is served only if it carries a Cloudflare Access token whose signature verifies against the team's public keys and whose issuer, audience and expiry are valid. Otherwise the worker returns 403, or 503 if the two variables are missing. This keeps the `*.pages.dev` address and preview deployments closed even though Access sits only on `codesepsis.app`.

`robots.txt` is served without sign-in and disallows all crawling. Every page is sent with `noindex`, a strict Content-Security-Policy that allows only the site's own scripts (the light and dark toggle) and no third-party scripts, and headers that block framing.

## Content notes

Doses, thresholds and time targets are reproduced as written in the framework, with page references. The "Decisions and gaps to settle locally" section is the authors' own analysis and is not part of the framework. The framework and each hospital's approved tools take precedence.

## Disclaimer

**Educational resource only. No duty of care.** This project is an educational resource for health care professionals. It is not medical advice, not a clinical guideline or protocol, and it does not replace professional judgment. Using it creates no duty of care, no clinician–patient relationship and no other professional relationship between its authors and any user or patient. Every clinical decision remains the responsibility of the treating clinician, working within their scope of practice and their hospital's approved policies, protocols and order sets. No warranty is given that the content is complete or current, and the authors accept no liability for decisions made using it. See `disclosure.html` for details.
