Feature: Minimalist Habit Tracker Landing
======================================

What I implemented
- A clean, minimal landing page for a habit-tracking product (branded `Habitly`).
- An interactive 3D element (wireframe + inner sphere) that smoothly follows the user's cursor and animates continuously. The 3D canvas is rendered with Three.js and placed behind the UI.
- Improved UI following the `ui-ux-pro-max` design system: color palette, typography (Bodoni Moda for headings, Jost for body), spacing, floating navbar, feature cards, and CTA.

Key files changed/added
- `src/components/Interactive3D.js` — Three.js scene, responsive renderer, smooth cursor-following sphere, proper cleanup and resource disposal.
- `src/components/HeroSection.js` — Navbar, hero, features, CTA, footer markup and SVG icons.
- `src/styles.css` — Design system styles: variables, fonts, layout, responsive rules, buttons, cards, CTA.
- `src/App.js` — App entry wired to `Interactive3D` + `HeroSection`.

How to run locally
1. Install dependencies (already done during development):

   npm install

2. Start the development server:

   npm start

3. Open the app in your browser at `http://localhost:3000`.

Design decisions and notes
- Colors: primary blue `#3B82F6`, CTA orange `#F97316`, background `#F8FAFC` — chosen for clear hierarchy and friendly but modern look.
- Typography: `Bodoni Moda` for headings (elegant) and `Jost` for body (clean, geometric). Fonts are imported via Google Fonts in `styles.css`.
- 3D element: positioned with `pointer-events: none` and `position: fixed` to remain interactive-looking while not blocking UI. Movement uses `lerp` for smooth motion and minimal CPU overhead.
- Accessibility: ensured contrast ratios for text, respects `prefers-reduced-motion` (reduced CSS animations), and uses large touch targets for primary buttons on mobile.
- Performance: renderer pixel ratio capped, `dispose()` called for geometries/materials, animation frame cancelled on unmount.

Next steps (recommended)
1. Add unit/integration tests for critical components.
2. Add analytics hooks for tracking CTA interactions.
3. Add localization support and onboarding modal.
4. Deploy to a static host (Vercel/Netlify) and set `homepage` in package.json if hosted under a subpath.

If you want, I can:
1) Create a proper `CHANGELOG.md` entry and bump the version.
2) Open a PR with this change and fill the PR description.
3) Add basic E2E tests and CI workflow.
