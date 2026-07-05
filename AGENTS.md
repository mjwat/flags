# AGENTS.md

# Project

Guess the Flag

## Purpose

A lightweight browser game where players identify countries by their flags.

The application should be simple, fast, responsive, and require no installation.

---

# Technical Constraints

## Stack

Use ONLY:

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)

Do NOT use:

- React
- Vue
- Angular
- TypeScript
- jQuery
- Bootstrap
- Tailwind
- Node.js
- npm packages
- build tools
- bundlers

The application must run by simply serving the project from a static web server.

---

# Project Structure

```
/
│
├── index.html
├── style.css
├── script.js
├── countries.json
└── README.md
```

All game data must be loaded from `countries.json`.

---

# Application Flow

The application consists of three screens:

1. Start Screen
2. Game Screen
3. Results Screen

---

# Start Screen

Display:

- Game title
- Short description
- Start Game button
- Leaderboard

Optional future features:

- Difficulty selector
- Region selector
- Language selector
- Reset leaderboard button

---

# Game Rules

When the player presses **Start Game**:

- timer starts at 60 seconds
- score resets to 0
- statistics reset
- first question is generated

The game continues until the timer reaches zero.

---

# Game Screen

Display:

- countdown timer
- current score
- current question number
- large flag
- four answer buttons

Layout should work well on desktop and mobile.

---

# Question Generation

Each question consists of:

- one random country
- its flag
- one correct answer
- three incorrect answers

Requirements:

- answer order must be randomized
- duplicate answers are not allowed
- the same country should not appear twice during one game if possible

---

# Answer Handling

When the player selects an answer:

If correct:

- increase score by 1
- increase correct answers counter

If incorrect:

- increase incorrect answers counter

After answering:

- disable all buttons
- briefly highlight:
  - green for correct
  - red for incorrect
- automatically load the next question after a short delay

---

# Timer

Timer:

- starts at 60 seconds
- counts down every second
- game ends immediately at 0

No additional questions are generated after time expires.

---

# Results Screen

Display:

- final score
- correct answers
- total answered questions

Provide:

- player name input
- Save Score button
- Play Again button

Display updated leaderboard.

---

# Scoring

MVP scoring:

- correct answer = +1 point
- incorrect answer = 0 points

No penalties.

---

# Leaderboard

Leaderboard is stored in:

```
localStorage
```

Each record contains:

- player name
- correct answers / total questions

Requirements:

- keep Top 10 scores
- sort by score descending
- if scores tie:
  - higher accuracy first
  - newer result second

---

# Countries Data

Countries must NOT be hardcoded inside JavaScript.

Store them in:

```
countries.json
```

Example:

```json
[
  {
    "code": "pt",
    "country": "Portugal",
    "flag": "🇵🇹",
    "region": "Europe"
  },
  {
    "code": "es",
    "country": "Spain",
    "flag": "🇪🇸",
    "region": "Europe"
  }
]
```

Each country contains:

- code
- country
- flag
- region

Requirements:

- load countries from JSON
- use emoji flags only
- do not use image files
- do not use external APIs

---

# UI Requirements

The interface should be:

- clean
- minimal
- modern
- responsive

Game screen should focus entirely on gameplay.

Recommended layout:

Top:

- timer
- score

Middle:

- large flag

Bottom:

- four answer buttons

---

# Button States

Answer buttons must support:

- normal
- hover
- active
- correct
- incorrect
- disabled

---

# Responsive Design

Support:

- desktop
- tablet
- mobile

Minimum width:

320px

---

# Accessibility

Buttons must:

- be keyboard accessible
- have visible focus state

Do not rely only on color to communicate correctness.

---

# Performance

The application should:

- load instantly
- generate questions without noticeable delay
- avoid unnecessary DOM updates

---

# Code Quality

Keep JavaScript:

- modular
- readable
- documented where necessary

Avoid duplicated code.

Prefer small reusable functions.

---

# Future Features (Not MVP)

Possible future additions:

- Easy / Medium / Hard
- Region mode
- Survival mode
- Fixed number of questions
- Endless mode
- Speed bonus
- Combo multiplier
- Hint system
- Online leaderboard
- Multiple languages
- Sound effects
- Animations
- Dark mode

These features should NOT be implemented in the MVP.

---

# MVP Scope

The MVP includes only:

- Start screen
- 60-second game mode
- Random flag questions
- Four answer choices
- One point per correct answer
- Results screen
- Local leaderboard
- Responsive layout
- Countries loaded from `countries.json`
- Emoji flags
