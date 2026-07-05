# Guess the Flag MVP Implementation Brief

## Primary Task

Create the MVP of **Guess the Flag** as a fully client-side browser game using only:

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)

The game must run from a static web server with no build step, no external APIs, no frameworks, and no package dependencies.

All country data must be loaded from `countries.json`.

---

## Product Goal

Deliver a lightweight browser game where a player can:

1. open the page instantly
2. start a 60-second game
3. identify countries by emoji flags
4. receive immediate feedback after each answer
5. see final results when time expires
6. save a score to a local Top 10 leaderboard

The MVP should feel fast, simple, responsive, and easy to understand on first use.

---

## User Scenario

Primary scenario:

1. User opens the application.
2. User sees the Start screen with title, short description, Start Game button, and leaderboard.
3. User presses Start Game.
4. System resets score, timer, and statistics.
5. System loads the first flag question from `countries.json`.
6. User sees one large emoji flag and four answer buttons.
7. User selects an answer.
8. System marks the selection as correct or incorrect, disables buttons, updates stats, and briefly reveals the correct answer.
9. System automatically loads the next question after a short delay if time remains.
10. When the timer reaches `0`, the game ends immediately.
11. User sees the Results screen with final stats and a player name input.
12. User can save the result to `localStorage`.
13. User can start a new game from the Results screen.

---

## MVP Scope

Included:

- Start screen
- 60-second timer mode
- Random flag questions
- Four answer choices
- One point per correct answer
- Results screen
- Local leaderboard in `localStorage`
- Responsive layout
- Countries loaded from `countries.json`
- Emoji flags only

Excluded from MVP:

- difficulty selector
- region selector
- language selector
- survival mode
- endless mode
- online leaderboard
- sounds
- dark mode
- bonus scoring systems

---

## Acceptance Criteria

The MVP is complete when all of the following are true:

### App Structure

- The project uses only:
  - `index.html`
  - `style.css`
  - `script.js`
  - `countries.json`
  - `README.md`
- No frameworks, package managers, build tools, or external APIs are used.

### Start Screen

- Displays game title.
- Displays a short game description.
- Displays a Start Game button.
- Displays the current leaderboard from `localStorage`.

### Game Start

- Pressing Start Game begins a new 60-second session.
- Score resets to `0`.
- Correct and incorrect counters reset to `0`.
- Question counter resets to `1`.
- Previous game state does not leak into the new session.

### Question Generation

- Each question has exactly one correct answer and three incorrect answers.
- All four answer options are unique.
- Answer order is shuffled each round.
- The same country should not repeat in the same session if there are enough countries available.
- Questions are sourced only from `countries.json`.

### Gameplay

- The Game screen shows:
  - countdown timer
  - current score
  - current question number
  - one large emoji flag
  - four answer buttons
- Answer buttons are clickable and keyboard accessible.
- After answering:
  - buttons become disabled
  - correct answer is visibly identified
  - incorrect selection is visibly identified
  - the next question loads after a short delay if time remains

### Timer

- Timer starts at `60`.
- Timer decreases once per second.
- Game ends immediately when timer reaches `0`.
- No new question is generated after time expires.

### Results Screen

- Displays:
  - final score
  - correct answers
  - total answered questions
- Includes:
  - player name input
  - Save Score button
  - Play Again button
- Saving a score updates the leaderboard display.

### Leaderboard

- Leaderboard data is stored in `localStorage`.
- Each record includes:
  - player name
  - correct answers / total questions
- Only Top 10 scores are kept.
- Sorting order is:
  - score descending
  - accuracy descending
  - newer result first

### Accessibility

- Interactive buttons are keyboard accessible.
- Focus states are clearly visible.
- Correctness feedback is not communicated by color alone.

### Responsive Design

- Layout works at `320px` minimum width.
- Layout remains usable on mobile, tablet, and desktop.

### Performance

- App loads instantly from static files.
- Question generation is effectively immediate.
- DOM updates stay minimal and targeted.

---

## Implementation Notes

### Suggested Screen Model

Use three screen sections and show only one at a time:

- Start screen
- Game screen
- Results screen

This keeps HTML simple and avoids unnecessary routing complexity.

### Suggested State Model

Keep state in one central JavaScript object for the current session:

- countries
- remainingCountries or askedCountryIds
- currentQuestion
- score
- correctAnswers
- incorrectAnswers
- questionNumber
- timeLeft
- gameActive

This is the lowest-cost structure for an MVP and is easy to inspect and reset.

### Suggested Data Flow

1. Load `countries.json` on startup.
2. Render Start screen and leaderboard.
3. On Start Game:
   - reset session state
   - start timer
   - generate first question
4. On answer:
   - evaluate correctness
   - update state
   - render feedback
   - move to next question if timer remains
5. On timer end:
   - stop input
   - compute final stats
   - render Results screen
6. On Save Score:
   - validate name
   - append leaderboard record
   - sort and trim to top 10
   - persist to `localStorage`
   - re-render leaderboard

---

## Risks To Avoid

- Hardcoding country data in `script.js` instead of loading `countries.json`
- Allowing duplicate answer options
- Allowing timer and question transitions to race each other at `0` seconds
- Letting the next question render after game end
- Mixing screen rendering and game logic so tightly that reset behavior becomes fragile
- Relying only on red/green color feedback without text or clear state indication

---

## Recommended Build Order

1. Create static page structure for the three screens.
2. Add responsive styling and button states.
3. Load and validate `countries.json`.
4. Implement game state reset and screen switching.
5. Implement timer flow.
6. Implement question generation and answer shuffling.
7. Implement answer handling and feedback delay.
8. Implement results calculations.
9. Implement leaderboard persistence and sorting.
10. Verify keyboard accessibility and mobile layout.

---

## Definition Of Done

The task is done when:

- the full start-to-finish user scenario works in the browser
- all MVP requirements from `AGENTS.md` are satisfied
- the leaderboard persists locally across page reloads
- no non-MVP features were added
- the implementation remains simple enough to extend later without a rewrite
