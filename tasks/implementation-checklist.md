# Guess the Flag MVP Implementation Checklist

## Planning

- [x] Confirm MVP scope from `AGENTS.md`
- [x] Write implementation brief
- [x] Define primary user scenario
- [x] Define acceptance criteria

## Project Files

- [x] Create `index.html`
- [x] Create `style.css`
- [x] Create `script.js`
- [x] Create `countries.json`
- [x] Create `README.md`

## UI Structure

- [x] Add Start screen
- [x] Add Game screen
- [x] Add Results screen
- [x] Ensure only one screen is visible at a time

## Core Game State

- [x] Create central session state
- [x] Reset state on new game
- [x] Track score
- [x] Track correct answers
- [x] Track incorrect answers
- [x] Track question number
- [x] Track current question
- [x] Track asked countries
- [x] Track timer state

## Countries Data

- [x] Load countries from `countries.json`
- [x] Validate that enough countries exist to build questions
- [x] Use emoji flags only
- [x] Avoid hardcoded country list in JavaScript

## Question Engine

- [x] Pick one random correct country
- [x] Generate three unique incorrect answers
- [x] Shuffle answer order
- [x] Avoid duplicates in options
- [x] Avoid repeating countries in one session when possible

## Gameplay Flow

- [x] Start game from Start screen
- [x] Render current flag and answer buttons
- [x] Handle correct answers
- [x] Handle incorrect answers
- [x] Disable buttons after selection
- [x] Show correct/incorrect feedback
- [x] Load next question after short delay
- [x] Prevent next question after timer expiry

## Timer

- [x] Start timer at 60 seconds
- [x] Decrease once per second
- [x] End game immediately at 0
- [x] Stop timer cleanly on game end

## Results

- [x] Show final score
- [x] Show correct answers
- [x] Show total answered questions
- [x] Add player name input
- [x] Add Save Score button
- [x] Add Play Again button

## Leaderboard

- [x] Load leaderboard from `localStorage`
- [x] Save score to `localStorage`
- [x] Sort by score descending
- [x] Break ties by accuracy descending
- [x] Break remaining ties by newer result first
- [x] Keep Top 10 only
- [x] Render leaderboard on Start screen
- [x] Render updated leaderboard after save

## Accessibility And Responsive Design

- [x] Add visible focus states
- [x] Ensure keyboard-accessible controls
- [x] Avoid color-only correctness feedback
- [x] Support mobile layout at 320px minimum width
- [x] Support tablet and desktop layout

## Verification

- [x] Verify JSON loads via static server
- [ ] Verify start-to-finish user flow
- [ ] Verify leaderboard persistence across reload
- [x] Verify no non-MVP features were added
