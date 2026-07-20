# Bin Chai — Public Résumé

A static, bilingual public résumé inspired by clean personal portfolio sites. It has no build step, analytics, paid services, or external runtime dependencies.

## Preview locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Live site

The résumé is published with GitHub Pages at:

https://cb521.github.io/resume/

GitHub Pages deploys the `main` branch from the repository root.

No domain purchase is required. A custom domain can be connected later without rebuilding the site.

## Privacy choices

The public site intentionally excludes the phone number, birth date, and gender contained in the source résumé. It includes the résumé email address. Review that address before publishing.

## Edit content

- Page content: `index.html`
- Colors and layout: `styles.css`
- Language switch, navigation, and print behavior: `script.js`
- Event images and favicon: `assets/`
