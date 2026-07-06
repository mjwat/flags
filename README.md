# Guess the Flag

A lightweight browser game where players identify countries by their emoji flags.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript

## Run

Serve the project from any static web server, then open `index.html` in your browser.

Example:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## MVP Features

- Start screen with description and leaderboard
- 60-second gameplay loop
- Randomized four-choice flag questions
- Immediate answer feedback
- Results screen with stats
- Yhub-backed Top 10 leaderboard with `localStorage` fallback
- Responsive layout for mobile, tablet, and desktop

## Data

Country data is loaded from `countries.json`.

No third-party APIs or image assets are used. The leaderboard uses the same-origin Yhub API when available.

## JavaScript Structure

Scripts are split into small ES modules under `scripts/`:

- `main.js` for app startup and event wiring
- `game.js` for gameplay state transitions
- `leaderboard.js` for API and local leaderboard logic
- `ui.js` for DOM rendering
- `countries.js` for loading and validating country data
- `config.js`, `state.js`, `elements.js`, and `utils.js` for shared setup

## CSS Structure

Styles are split under `styles/` and loaded through `style.css`:

- `base.css` for tokens, reset, typography, and animations
- `layout.css` for screen and panel layout
- `components.css` for buttons, history, leaderboard, forms, and game UI parts
- `responsive.css` for breakpoints and reduced-motion rules
