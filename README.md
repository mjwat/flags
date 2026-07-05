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
- Global Top 10 leaderboard via Yhub Managed Database when deployed on Yhub
- Local fallback leaderboard in `localStorage` during local preview or if `/api` is unavailable
- Responsive layout for mobile, tablet, and desktop

## Data

Country data is loaded from `countries.json`.

No external APIs or image assets are used.

## Yhub Global Leaderboard Setup

The app expects a Yhub Managed Database entity exposed at:

```text
/api/leaderboard_scores
```

Configure the site database with:

- `auth_enabled: false`
- entity name: `leaderboard_scores`
- access: `read=public`, `write=public`

Recommended fields:

```json
{
  "entities": [
    {
      "name": "leaderboard_scores",
      "access": {
        "read": "public",
        "write": "public"
      },
      "fields": [
        { "name": "player_name", "type": "text", "required": true },
        { "name": "score", "type": "integer", "required": true },
        { "name": "correct_answers", "type": "integer", "required": true },
        { "name": "total_questions", "type": "integer", "required": true },
        { "name": "accuracy", "type": "integer", "required": true },
        { "name": "played_at", "type": "datetime", "required": true }
      ]
    }
  ]
}
```

Notes:

- The frontend automatically tries the same-origin Yhub endpoint first.
- When the site is not running on Yhub, the app falls back to a browser-local leaderboard.
- Global rankings are sorted by score descending, then accuracy descending, then newer results first.
- Public write access is the simplest static-site setup, but it allows anyone to submit scores from the browser.
