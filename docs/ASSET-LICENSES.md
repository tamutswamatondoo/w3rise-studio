# Font and asset licences

## Fonts

- **DM Sans** — copyright 2014 The DM Sans Project Authors. SIL Open Font License 1.1; commercial use, embedding and redistribution are permitted under that licence. Installed from `@fontsource/dm-sans`. Upstream: <https://github.com/googlefonts/dm-fonts>.
- **Cormorant Garamond** — copyright 2015 The Cormorant Project Authors. SIL Open Font License 1.1; commercial use, embedding and redistribution are permitted under that licence. Installed from `@fontsource/cormorant-garamond`. Upstream: <https://github.com/CatharsisFonts/Cormorant>.

The complete, unmodified licence texts are distributed at `public/licenses/dm-sans-OFL.txt` and `public/licenses/cormorant-garamond-OFL.txt`. The npm packages also contain `node_modules/@fontsource/dm-sans/LICENSE` and `node_modules/@fontsource/cormorant-garamond/LICENSE`. Font files are unmodified. Exported customer PDF/PNG files contain rendered typography rather than editable font software; the self-contained sample SVGs embed unmodified font files alongside the publicly distributed licence notices.

The interface loads fonts locally. The generator deliberately uses only DM Sans regular/bold and Cormorant Garamond semibold Latin and Latin Extended subsets. It reads their real character maps before rendering and reports unsupported characters rather than substituting missing-glyph boxes. Accented Latin names, including composed/decomposed forms, are supported. Other scripts and emoji may need another font/style in a later version; the operator must obtain approved alternative wording or decline unsupported work. Do not silently rewrite customer text.

## Original artwork

The botanical leaf paths, rules, framing, editorial geometry, typography layouts, eight sample SVGs and social image were created in this repository for w3Rise Studio. They contain no third-party photographs, brand marks, stock assets or AI-generated images. `Sage & Silk` and `FORM Barber Club` are fictional sample businesses, not customer projects or endorsements. Their contact text says “sample only” and cannot initiate a booking call.

Samples: `public/samples/{sage,form}-{price-list,services,feature,booking}.svg`. The original 1200 × 630 social preview is `public/samples/share.png`. Recreate them with `node scripts/generate-samples.mjs` after installing dependencies and Google Chrome. The script calls the same production layout code, with explicit fictional contact labels. Keep the “Sample concept — not a client project” label next to public previews.

## Customer material

Only locally decoded PNG/JPEG logos are accepted by the generator. They are never uploaded by the app. Customers remain responsible for permission to use their names, text and logos; the operator should confirm the submitted material and the final output during review. Browser object URLs are temporary and are revoked when a pack is replaced or closed.

## UI icons and software

Lucide icons come from `lucide-react` under the ISC licence (`node_modules/lucide-react/LICENSE`). Application libraries retain their own package licences. No association with Nike, Zara, Gucci, Paynow or Cloudflare is implied by the visual design.
