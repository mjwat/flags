const GAME_DURATION_SECONDS = 60;
const ANSWER_COUNT = 4;
const ANSWER_DELAY_MS = 900;
const LEADERBOARD_STORAGE_KEY = "guess-the-flag-leaderboard";

const state = {
  countries: [],
  usedCountryCodes: new Set(),
  currentQuestion: null,
  questionHistory: [],
  score: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  questionNumber: 0,
  timeLeft: GAME_DURATION_SECONDS,
  gameActive: false,
  timerId: null,
  nextQuestionTimeoutId: null,
  scoreSaved: false,
};

const elements = {
  screens: {
    start: document.getElementById("start-screen"),
    game: document.getElementById("game-screen"),
    results: document.getElementById("results-screen"),
  },
  startGameButton: document.getElementById("start-game-button"),
  playAgainButton: document.getElementById("play-again-button"),
  flagCard: document.querySelector(".flag-card"),
  historyPanel: document.querySelector(".history-panel"),
  historyTitle: document.getElementById("history-title"),
  timerDisplay: document.getElementById("timer-display"),
  timeMeterFill: document.getElementById("time-meter-fill"),
  scoreDisplay: document.getElementById("score-display"),
  questionDisplay: document.getElementById("question-display"),
  flagDisplay: document.getElementById("flag-display"),
  feedbackText: document.getElementById("feedback-text"),
  answersGrid: document.getElementById("answers-grid"),
  historyList: document.getElementById("history-list"),
  flagMarqueeTrack: document.getElementById("flag-marquee-track"),
  finalCorrectAnswered: document.getElementById("final-correct-answered"),
  saveScoreForm: document.getElementById("save-score-form"),
  playerNameInput: document.getElementById("player-name"),
  saveStatus: document.getElementById("save-status"),
  saveScoreButton: document.getElementById("save-score-button"),
  leaderboard: {
    startList: document.getElementById("leaderboard-list"),
    startEmpty: document.getElementById("leaderboard-empty"),
    resultsList: document.getElementById("results-leaderboard-list"),
    resultsEmpty: document.getElementById("results-leaderboard-empty"),
  },
};

document.addEventListener("DOMContentLoaded", initializeApp);

let historyLayoutObserver = null;

async function initializeApp() {
  bindEvents();
  renderLeaderboard();
  setupHistoryLayoutSync();

  try {
    state.countries = await loadCountries();
    renderFlagMarquee();
    elements.feedbackText.textContent = "";
    elements.startGameButton.disabled = false;
  } catch (error) {
    console.error(error);
    elements.feedbackText.textContent = "Unable to load countries. Please refresh the page.";
    elements.startGameButton.disabled = true;
  }
}

function bindEvents() {
  elements.startGameButton.addEventListener("click", startGame);
  elements.playAgainButton.addEventListener("click", startGame);
  elements.saveScoreForm.addEventListener("submit", handleSaveScore);
  window.addEventListener("resize", syncHistoryPanelHeight);
}

async function loadCountries() {
  const response = await fetch("countries.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load countries.json: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length < ANSWER_COUNT) {
    throw new Error("countries.json must contain at least four countries.");
  }

  data.forEach((country) => {
    if (!country.code || !country.country || !country.flag || !country.region) {
      throw new Error("Each country must include code, country, flag, and region.");
    }
  });

  return data;
}

function startGame() {
  if (state.countries.length < ANSWER_COUNT) {
    elements.feedbackText.textContent = "Not enough countries available to start the game.";
    return;
  }

  resetGameState();
  showScreen("game");
  updateHud();
  setFeedbackMessage("");
  syncHistoryPanelHeight();
  startTimer();
  renderNextQuestion();
}

function resetGameState() {
  clearTimer();
  clearNextQuestionTimeout();

  state.usedCountryCodes = new Set();
  state.currentQuestion = null;
  state.questionHistory = [];
  state.score = 0;
  state.correctAnswers = 0;
  state.incorrectAnswers = 0;
  state.questionNumber = 0;
  state.timeLeft = GAME_DURATION_SECONDS;
  state.gameActive = true;
  state.scoreSaved = false;

  elements.playerNameInput.value = "";
  elements.saveStatus.textContent = "";
  elements.saveScoreButton.disabled = false;
}

function startTimer() {
  clearTimer();

  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    updateHud();

    if (state.timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function clearTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function clearNextQuestionTimeout() {
  if (state.nextQuestionTimeoutId) {
    window.clearTimeout(state.nextQuestionTimeoutId);
    state.nextQuestionTimeoutId = null;
  }
}

function renderNextQuestion() {
  if (!state.gameActive || state.timeLeft <= 0) {
    return;
  }

  const question = generateQuestion();

  if (!question) {
    endGame();
    return;
  }

  state.currentQuestion = question;
  state.questionNumber += 1;
  state.questionHistory.push({
    flag: question.flag,
    country: question.country,
    isCorrect: null,
  });

  elements.flagDisplay.textContent = question.flag;
  elements.flagDisplay.setAttribute("aria-label", "Current flag question");
  renderHistory();
  updateHud();
  renderAnswerButtons(question.answers);
}

function generateQuestion() {
  const unusedCountries = state.countries.filter((country) => !state.usedCountryCodes.has(country.code));
  const pool = unusedCountries.length > 0 ? unusedCountries : state.countries;
  const correctCountry = randomItem(pool);

  if (!correctCountry) {
    return null;
  }

  state.usedCountryCodes.add(correctCountry.code);

  const incorrectCountries = shuffleArray(
    state.countries.filter((country) => country.code !== correctCountry.code)
  ).slice(0, ANSWER_COUNT - 1);

  if (incorrectCountries.length < ANSWER_COUNT - 1) {
    return null;
  }

  const answers = shuffleArray(
    [correctCountry, ...incorrectCountries].map((country) => ({
      code: country.code,
      country: country.country,
      isCorrect: country.code === correctCountry.code,
    }))
  );

  return {
    code: correctCountry.code,
    country: correctCountry.country,
    flag: correctCountry.flag,
    answers,
  };
}

function renderAnswerButtons(answers) {
  elements.answersGrid.innerHTML = "";

  answers.forEach((answer) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.dataset.code = answer.code;
    button.dataset.correct = String(answer.isCorrect);
    button.textContent = answer.country;
    button.setAttribute("aria-label", `Answer: ${answer.country}`);
    button.addEventListener("click", () => handleAnswerSelection(button));
    elements.answersGrid.appendChild(button);
  });
}

function handleAnswerSelection(selectedButton) {
  if (!state.gameActive || !state.currentQuestion) {
    return;
  }

  const buttons = [...elements.answersGrid.querySelectorAll(".answer-button")];
  const isCorrect = selectedButton.dataset.correct === "true";

  buttons.forEach((button) => {
    const buttonIsCorrect = button.dataset.correct === "true";
    button.disabled = true;

    if (buttonIsCorrect) {
      button.classList.add("is-correct");
    }

    if (button === selectedButton && !isCorrect) {
      button.classList.add("is-incorrect");
    }
  });

  if (isCorrect) {
    state.score += 1;
    state.correctAnswers += 1;
  } else {
    state.incorrectAnswers += 1;
  }

  updateHistoryEntry(isCorrect);
  setFeedbackMessage("");

  updateHud();
  clearNextQuestionTimeout();
  state.nextQuestionTimeoutId = window.setTimeout(() => {
    if (state.gameActive && state.timeLeft > 0) {
      renderNextQuestion();
    }
  }, ANSWER_DELAY_MS);
}

function endGame() {
  if (!state.gameActive) {
    return;
  }

  state.gameActive = false;
  state.timeLeft = 0;
  clearTimer();
  clearNextQuestionTimeout();
  disableAnswerButtons();
  renderResults();
  renderLeaderboard();
  showScreen("results");
}

function disableAnswerButtons() {
  const buttons = elements.answersGrid.querySelectorAll(".answer-button");
  buttons.forEach((button) => {
    button.disabled = true;
  });
}

function renderResults() {
  const totalAnswered = state.correctAnswers + state.incorrectAnswers;

  elements.finalCorrectAnswered.textContent = `${state.correctAnswers} / ${totalAnswered}`;
  elements.saveStatus.textContent = "";
  elements.saveScoreButton.disabled = false;
}

function updateHistoryEntry(isCorrect) {
  if (!state.questionHistory.length) {
    return;
  }

  state.questionHistory[state.questionHistory.length - 1].isCorrect = isCorrect;
  renderHistory();
}

function handleSaveScore(event) {
  event.preventDefault();

  if (state.scoreSaved) {
    elements.saveStatus.textContent = "Score already saved for this round.";
    return;
  }

  const playerName = elements.playerNameInput.value.trim();
  if (!playerName) {
    elements.saveStatus.textContent = "Enter a player name before saving.";
    elements.playerNameInput.focus();
    return;
  }

  const totalQuestions = state.correctAnswers + state.incorrectAnswers;
  const accuracy = totalQuestions > 0 ? Math.round((state.correctAnswers / totalQuestions) * 100) : 0;
  const leaderboard = getLeaderboard();

  leaderboard.push({
    playerName,
    score: state.score,
    correctAnswers: state.correctAnswers,
    totalQuestions,
    accuracy,
    date: new Date().toISOString(),
  });

  const sortedLeaderboard = sortLeaderboard(leaderboard).slice(0, 10);
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sortedLeaderboard));

  state.scoreSaved = true;
  elements.saveScoreButton.disabled = true;
  elements.saveStatus.textContent = "";
  renderLeaderboard();
}

function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Unable to read leaderboard from localStorage.", error);
    return [];
  }
}

function sortLeaderboard(entries) {
  return [...entries].sort((left, right) => {
    if (right.correctAnswers !== left.correctAnswers) {
      return right.correctAnswers - left.correctAnswers;
    }

    return new Date(right.date).getTime() - new Date(left.date).getTime();
  });
}

function renderLeaderboard() {
  const leaderboard = sortLeaderboard(getLeaderboard()).slice(0, 10);
  renderLeaderboardList(elements.leaderboard.startList, elements.leaderboard.startEmpty, leaderboard);
  renderLeaderboardList(elements.leaderboard.resultsList, elements.leaderboard.resultsEmpty, leaderboard);
}

function renderLeaderboardList(listElement, emptyElement, leaderboard) {
  listElement.innerHTML = "";
  const hasEntries = leaderboard.length > 0;

  emptyElement.hidden = hasEntries;
  listElement.hidden = !hasEntries;

  leaderboard.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard-entry";

    const topLine = document.createElement("div");
    topLine.className = "leaderboard-topline";
    topLine.innerHTML =
      `<span class="leaderboard-rank">${index + 1}.</span>` +
      `<span class="leaderboard-name">${escapeHtml(entry.playerName)}</span>` +
      `<span class="leaderboard-score">${entry.correctAnswers} / ${entry.totalQuestions}</span>`;

    item.appendChild(topLine);
    listElement.appendChild(item);
  });
}

function updateHud() {
  elements.timerDisplay.textContent = `${Math.max(state.timeLeft, 0)}s`;
  elements.scoreDisplay.textContent = String(state.score);
  elements.questionDisplay.textContent = String(Math.max(state.questionNumber, 1));
  updateTimeMeter();
}

function renderHistory() {
  elements.historyList.innerHTML = "";

  state.questionHistory.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "history-item";

    const number = document.createElement("span");
    number.className = "history-number";
    number.textContent = `${index + 1}.`;

    const summary = document.createElement("span");
    summary.className = "history-summary";
    summary.textContent =
      entry.isCorrect === null
        ? `${entry.flag} ❓`
        : `${entry.flag} ${entry.country} ${entry.isCorrect ? "✅" : "❌"}`;

    if (entry.isCorrect === true) {
      item.classList.add("is-correct");
    } else if (entry.isCorrect === false) {
      item.classList.add("is-incorrect");
    }

    item.append(number, summary);
    elements.historyList.appendChild(item);
  });

  syncHistoryPanelHeight();
  window.requestAnimationFrame(() => {
    elements.historyList.scrollTop = elements.historyList.scrollHeight;
    updateHistoryOverflowState();
  });
}

function setupHistoryLayoutSync() {
  if (typeof ResizeObserver !== "function") {
    syncHistoryPanelHeight();
    return;
  }

  historyLayoutObserver = new ResizeObserver(() => {
    syncHistoryPanelHeight();
  });

  historyLayoutObserver.observe(elements.flagCard);
  historyLayoutObserver.observe(elements.historyTitle);
}

function syncHistoryPanelHeight() {
  const flagCardHeight = elements.flagCard.getBoundingClientRect().height;
  const titleHeight = elements.historyTitle.getBoundingClientRect().height;
  const panelStyles = window.getComputedStyle(elements.historyPanel);
  const panelGap = Number.parseFloat(panelStyles.rowGap || panelStyles.gap || "0");
  const availableListHeight = Math.max(flagCardHeight - titleHeight - panelGap, 0);

  elements.historyPanel.style.height = `${flagCardHeight}px`;
  elements.historyPanel.style.setProperty("--history-title-offset", `${titleHeight + panelGap}px`);
  elements.historyList.style.maxHeight = `${availableListHeight}px`;
  updateHistoryOverflowState();
}

function updateHistoryOverflowState() {
  const isOverflowing = elements.historyList.scrollHeight > elements.historyList.clientHeight + 1;
  elements.historyPanel.classList.toggle("is-overflowing", isOverflowing);
}

function setFeedbackMessage(message, stateClass = "") {
  elements.feedbackText.textContent = message;
  elements.feedbackText.classList.remove("is-correct", "is-incorrect");
  if (stateClass) {
    elements.feedbackText.classList.add(stateClass);
  }
}

function updateTimeMeter() {
  const percentage = Math.max(0, Math.min(1, state.timeLeft / GAME_DURATION_SECONDS));
  const hue = Math.round(percentage * 120);
  elements.timeMeterFill.style.width = `${percentage * 100}%`;
  elements.timeMeterFill.style.background = `linear-gradient(90deg, hsl(${hue} 72% 50%), hsl(${Math.max(
    hue - 18,
    0
  )} 82% 58%))`;
}

function renderFlagMarquee() {
  const flags = shuffleArray(state.countries.map((country) => country.flag)).slice(0, 18);
  const content = [...flags, ...flags]
    .map((flag, index) => `<span class="flag-marquee-item" style="--item-delay:${index * 40}ms">${flag}</span>`)
    .join("");

  elements.flagMarqueeTrack.innerHTML = content;
}

function showScreen(screenName) {
  Object.entries(elements.screens).forEach(([name, screen]) => {
    const isActive = name === screenName;
    screen.hidden = !isActive;
    screen.classList.toggle("screen-active", isActive);
  });
}

function randomItem(items) {
  if (!items.length) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
}

function shuffleArray(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
