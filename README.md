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
- Local Top 10 leaderboard stored in `localStorage`
- Responsive layout for mobile, tablet, and desktop

## Data

Country data is loaded from `countries.json`.

No external APIs or image assets are used.
