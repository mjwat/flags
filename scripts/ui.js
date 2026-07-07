import { GAME_DURATION_SECONDS, MAX_LEADERBOARD_ENTRIES } from "./config.js";
import { elements } from "./elements.js";
import { getBestWeeklyLeaderboardEntry } from "./leaderboard.js";
import { state } from "./state.js";
import { shuffleArray } from "./utils.js";

const HERO_FLAG_ROTATION_MS = 2000;
const HERO_FLAG_SLIDE_MS = 420;

let heroFlagIntervalId = null;
let heroFlagAnimationTimeoutId = null;
let heroFlags = [];
let heroFlagIndex = 0;

export function showScreen(activeScreenName) {
  Object.entries(elements.screens).forEach(([screenName, screenElement]) => {
    const isActive = screenName === activeScreenName;
    screenElement.hidden = !isActive;
    screenElement.classList.toggle("screen-active", isActive);
  });
}

export function renderHeroFlagRotator(countries) {
  heroFlags = shuffleArray([...new Set(countries.map((country) => country.flag))]);
  heroFlagIndex = 0;

  window.clearInterval(heroFlagIntervalId);
  window.clearTimeout(heroFlagAnimationTimeoutId);

  if (!heroFlags.length) {
    elements.heroFlagTrack.innerHTML = '<span class="hero-flag-item">🏳️</span>';
    return;
  }

  setHeroFlag(elements.heroFlagTrack, heroFlags[heroFlagIndex]);

  if (heroFlags.length === 1) {
    return;
  }

  heroFlagIntervalId = window.setInterval(() => {
    const nextFlag = heroFlags[(heroFlagIndex + 1) % heroFlags.length];
    elements.heroFlagTrack.innerHTML = `
      <span class="hero-flag-item">${heroFlags[heroFlagIndex]}</span>
      <span class="hero-flag-item">${nextFlag}</span>
    `;
    elements.heroFlagTrack.classList.add("is-sliding");

    heroFlagAnimationTimeoutId = window.setTimeout(() => {
      heroFlagIndex = (heroFlagIndex + 1) % heroFlags.length;
      setHeroFlag(elements.heroFlagTrack, heroFlags[heroFlagIndex]);
    }, HERO_FLAG_SLIDE_MS);
  }, HERO_FLAG_ROTATION_MS);
}

export function renderAnswerButtons(answers, onSelectAnswer) {
  elements.answersGrid.innerHTML = "";

  answers.forEach((answer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.dataset.correct = String(answer.isCorrect);
    button.textContent = answer.label;
    button.setAttribute("aria-label", `Answer: ${answer.label}`);
    button.addEventListener("click", () => onSelectAnswer(button));
    elements.answersGrid.appendChild(button);
  });
}

export function getAnswerButtons() {
  return [...elements.answersGrid.querySelectorAll(".answer-button")];
}

export function disableAnswerButtons() {
  getAnswerButtons().forEach((button) => {
    button.disabled = true;
  });
}

export function renderLeaderboard(entries) {
  const topEntries = entries.slice(0, MAX_LEADERBOARD_ENTRIES);
  const bestWeeklyEntry = getBestWeeklyLeaderboardEntry(entries);
  renderFeaturedLeaderboardEntry(
    elements.leaderboard.startFeatured,
    elements.leaderboard.startFeaturedEntry,
    bestWeeklyEntry
  );
  toggleLeaderboardGroup(elements.leaderboard.startGroup, topEntries.length > 0);
  renderLeaderboardList(
    elements.leaderboard.startList,
    elements.leaderboard.startEmpty,
    topEntries
  );
  const highlightedResultsEntry = findMatchingSavedEntry(entries);
  renderFeaturedLeaderboardEntry(
    elements.leaderboard.resultsFeatured,
    elements.leaderboard.resultsFeaturedEntry,
    bestWeeklyEntry,
    highlightedResultsEntry
  );
  toggleLeaderboardGroup(elements.leaderboard.resultsGroup, topEntries.length > 0);
  renderLeaderboardList(
    elements.leaderboard.resultsList,
    elements.leaderboard.resultsEmpty,
    topEntries,
    highlightedResultsEntry
  );
  scrollLeaderboardEntryIntoView(elements.leaderboard.resultsList, highlightedResultsEntry);
}

export function renderHistory(questionHistory) {
  elements.historyList.innerHTML = "";

  questionHistory.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "history-item";

    const number = document.createElement("span");
    number.className = "history-number";
    number.textContent = `${index + 1}.`;

    const summary = document.createElement("span");
    summary.className = "history-summary";
    summary.textContent = formatHistorySummary(entry);

    if (entry.isCorrect === true) {
      item.classList.add("is-correct");
    } else if (entry.isCorrect === false) {
      item.classList.add("is-incorrect");
    }

    item.append(number, summary);
    elements.historyList.appendChild(item);
  });

  window.requestAnimationFrame(() => {
    elements.historyList.scrollTop = elements.historyList.scrollHeight;
    updateHistoryOverflowState();
  });
}

export function renderResults(correctAnswers, totalAnswered) {
  elements.finalCorrectAnswered.textContent = `${correctAnswers} / ${totalAnswered}`;
}

export function updateGameHeader(score, questionNumber, timeLeft) {
  elements.timerDisplay.textContent = `${Math.max(timeLeft, 0)}s`;
  elements.scoreDisplay.textContent = String(score);
  elements.questionDisplay.textContent = String(Math.max(questionNumber, 1));
  updateTimeMeter(timeLeft);
}

export function setLeaderboardStatus(message) {
  elements.leaderboard.startStatus.textContent = message;
  elements.leaderboard.resultsStatus.textContent = message;
}

export function setSaveStatus(message, stateClass = "") {
  elements.saveStatus.textContent = message;
  elements.saveStatus.classList.remove("is-success", "is-warning", "is-error");

  if (stateClass) {
    elements.saveStatus.classList.add(stateClass);
  }
}

export function setFeedbackMessage(message, stateClass = "") {
  elements.feedbackText.textContent = message;
  elements.feedbackText.classList.remove("is-correct", "is-incorrect");

  if (stateClass) {
    elements.feedbackText.classList.add(stateClass);
  }
}

export function setCurrentFlag(flag) {
  elements.flagDisplay.textContent = flag;
  elements.flagDisplay.setAttribute("aria-label", "Current flag question");
}

function renderLeaderboardList(listElement, emptyElement, entries, highlightedEntry = null) {
  listElement.innerHTML = "";

  const hasEntries = entries.length > 0;
  emptyElement.hidden = hasEntries;
  listElement.hidden = !hasEntries;

  entries.forEach((entry, index) => {
    listElement.appendChild(createLeaderboardEntryElement(entry, index, highlightedEntry));
  });
}

function renderFeaturedLeaderboardEntry(containerElement, entryElement, entry, highlightedEntry = null) {
  entryElement.innerHTML = "";
  containerElement.hidden = !entry;

  if (!entry) {
    return;
  }

  const featuredEntry = createLeaderboardEntryElement(entry, 0, highlightedEntry, true, "div");
  entryElement.appendChild(featuredEntry);
}

function scrollLeaderboardEntryIntoView(listElement, highlightedEntry) {
  window.requestAnimationFrame(() => {
    if (!highlightedEntry) {
      listElement.scrollTop = 0;
      return;
    }

    const highlightedElement = listElement.querySelector(".leaderboard-entry.is-recent");

    if (!highlightedElement) {
      return;
    }

    highlightedElement.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  });
}

function toggleLeaderboardGroup(groupElement, hasEntries) {
  groupElement.hidden = !hasEntries;
}

function formatHistorySummary(entry) {
  if (entry.isCorrect === null) {
    return `${entry.flag} ❓`;
  }

  return `${entry.flag} ${entry.country} ${entry.isCorrect ? "✅" : "❌"}`;
}

function updateHistoryOverflowState() {
  const isOverflowing = elements.historyList.scrollHeight > elements.historyList.clientHeight + 1;
  elements.historyPanel.classList.toggle("is-overflowing", isOverflowing);
}

function updateTimeMeter(timeLeft) {
  const remainingRatio = Math.max(0, Math.min(1, timeLeft / GAME_DURATION_SECONDS));
  const hue = Math.round(remainingRatio * 120);

  elements.timeMeterFill.style.width = `${remainingRatio * 100}%`;
  elements.timeMeterFill.style.background = `linear-gradient(90deg, hsl(${hue} 72% 50%), hsl(${Math.max(
    hue - 18,
    0
  )} 82% 58%))`;
}

function setHeroFlag(trackElement, flag) {
  trackElement.classList.remove("is-sliding");
  trackElement.innerHTML = `<span class="hero-flag-item">${flag}</span>`;
}

function findMatchingSavedEntry(entries) {
  if (!entries.length) {
    return null;
  }

  const savedEntry = state.lastSavedLeaderboardEntry;
  return savedEntry && entries.some((entry) => areSameLeaderboardEntry(entry, savedEntry)) ? savedEntry : null;
}

function areSameLeaderboardEntry(left, right) {
  return (
    left.playerName === right.playerName &&
    left.correctAnswers === right.correctAnswers &&
    left.totalQuestions === right.totalQuestions &&
    left.score === right.score &&
    left.date === right.date
  );
}

function createLeaderboardEntryElement(entry, index, highlightedEntry = null, isFeatured = false, tagName = "li") {
  const item = document.createElement(tagName);
  item.className = `leaderboard-entry${isFeatured ? " leaderboard-entry-featured" : ""}`;

  if (highlightedEntry && areSameLeaderboardEntry(entry, highlightedEntry)) {
    item.classList.add("is-recent");
  }

  const topLine = document.createElement("div");
  topLine.className = "leaderboard-topline";

  const rank = document.createElement("span");
  rank.className = "leaderboard-rank";
  rank.textContent = isFeatured ? "🥇" : `${index + 1}.`;

  const name = document.createElement("span");
  name.className = "leaderboard-name";
  name.textContent = entry.playerName;

  const score = document.createElement("span");
  score.className = "leaderboard-score";
  score.textContent = `${entry.correctAnswers} / ${entry.totalQuestions}`;

  topLine.append(rank, name, score);
  item.appendChild(topLine);

  return item;
}
