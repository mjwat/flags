import { GAME_DURATION_SECONDS } from "./config.js";
import { elements } from "./elements.js";
import { shuffleArray } from "./utils.js";

export function showScreen(activeScreenName) {
  Object.entries(elements.screens).forEach(([screenName, screenElement]) => {
    const isActive = screenName === activeScreenName;
    screenElement.hidden = !isActive;
    screenElement.classList.toggle("screen-active", isActive);
  });
}

export function renderFlagMarquee(countries) {
  const flags = shuffleArray(countries.map((country) => country.flag)).slice(0, 18);
  const repeatedFlags = [...flags, ...flags];

  elements.flagMarqueeTrack.innerHTML = repeatedFlags
    .map((flag, index) => `<span class="flag-marquee-item" style="--item-delay:${index * 40}ms">${flag}</span>`)
    .join("");
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
  renderLeaderboardList(elements.leaderboard.startList, elements.leaderboard.startEmpty, entries);
  renderLeaderboardList(elements.leaderboard.resultsList, elements.leaderboard.resultsEmpty, entries);
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
  elements.saveScoreButton.disabled = false;
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

function renderLeaderboardList(listElement, emptyElement, entries) {
  listElement.innerHTML = "";

  const hasEntries = entries.length > 0;
  emptyElement.hidden = hasEntries;
  listElement.hidden = !hasEntries;

  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard-entry";

    const topLine = document.createElement("div");
    topLine.className = "leaderboard-topline";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `${index + 1}.`;

    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.playerName;

    const score = document.createElement("span");
    score.className = "leaderboard-score";
    score.textContent = `${entry.correctAnswers} / ${entry.totalQuestions}`;

    topLine.append(rank, name, score);
    item.appendChild(topLine);
    listElement.appendChild(item);
  });
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
