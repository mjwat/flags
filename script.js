const GAME_DURATION_SECONDS = 60;
const ANSWER_COUNT = 4;
const ANSWER_DELAY_MS = 900;
const MAX_LEADERBOARD_ENTRIES = 10;
const LEADERBOARD_STORAGE_KEY = "guess-the-flag-leaderboard";
const YHUB_LEADERBOARD_ENTITY = "leaderboard_scores";
const YHUB_LEADERBOARD_ENDPOINT = `/api/${YHUB_LEADERBOARD_ENTITY}`;
const YHUB_LEADERBOARD_FETCH_LIMIT = 100;

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
  leaderboardEntries: [],
  leaderboardSource: "loading",
};

const elements = {
  screens: {
    start: document.getElementById("start-screen"),
    game: document.getElementById("game-screen"),
    results: document.getElementById("results-screen"),
  },
  startGameButton: document.getElementById("start-game-button"),
  playAgainButton: document.getElementById("play-again-button"),
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
    startStatus: document.getElementById("leaderboard-status"),
    resultsList: document.getElementById("results-leaderboard-list"),
    resultsEmpty: document.getElementById("results-leaderboard-empty"),
    resultsStatus: document.getElementById("results-leaderboard-status"),
  },
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  bindEvents();
  setLeaderboardStatus("Loading leaderboard...");

  try {
    const [countries] = await Promise.all([loadCountries(), refreshLeaderboard()]);
    state.countries = countries;
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

  elements.playerNameInput.value = "Player";
  setSaveStatus("");
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
  setSaveStatus("");
  elements.saveScoreButton.disabled = false;
}

function updateHistoryEntry(isCorrect) {
  if (!state.questionHistory.length) {
    return;
  }

  state.questionHistory[state.questionHistory.length - 1].isCorrect = isCorrect;
  renderHistory();
}

async function handleSaveScore(event) {
  event.preventDefault();

  if (state.scoreSaved) {
    setSaveStatus("Score already saved for this round.");
    return;
  }

  const playerName = elements.playerNameInput.value.trim() || "Player";
  if (!elements.playerNameInput.value.trim()) {
    elements.playerNameInput.value = playerName;
  }

  const totalQuestions = state.correctAnswers + state.incorrectAnswers;
  const accuracy = totalQuestions > 0 ? Math.round((state.correctAnswers / totalQuestions) * 100) : 0;
  const entry = {
    playerName,
    score: state.score,
    correctAnswers: state.correctAnswers,
    totalQuestions,
    accuracy,
    date: new Date().toISOString(),
  };

  elements.saveScoreButton.disabled = true;
  setSaveStatus("Saving score...");

  try {
    await saveRemoteLeaderboardEntry(entry);
    state.scoreSaved = true;
    setSaveStatus("Saved to the global leaderboard.", "is-success");
    await refreshLeaderboard();
    return;
  } catch (error) {
    console.warn("Unable to save to the Yhub leaderboard. Falling back to local storage.", error);
  }

  try {
    saveLocalLeaderboardEntry(entry);
    state.scoreSaved = true;
    setSaveStatus("Global leaderboard unavailable. Saved locally for this browser.", "is-warning");
    await refreshLeaderboard();
  } catch (error) {
    console.error("Unable to save leaderboard entry.", error);
    elements.saveScoreButton.disabled = false;
    setSaveStatus("Unable to save your score right now.", "is-error");
  }
}

function getLocalLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeLeaderboardEntry).filter(Boolean) : [];
  } catch (error) {
    console.error("Unable to read leaderboard from localStorage.", error);
    return [];
  }
}

function saveLocalLeaderboardEntry(entry) {
  const leaderboard = getLocalLeaderboard();
  leaderboard.push(entry);
  const sortedLeaderboard = sortLeaderboard(leaderboard).slice(0, MAX_LEADERBOARD_ENTRIES);
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sortedLeaderboard));
}

function sortLeaderboard(entries) {
  return [...entries].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.accuracy !== left.accuracy) {
      return right.accuracy - left.accuracy;
    }

    return new Date(right.date).getTime() - new Date(left.date).getTime();
  });
}

function renderLeaderboard() {
  const leaderboard = sortLeaderboard(state.leaderboardEntries).slice(0, MAX_LEADERBOARD_ENTRIES);
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

async function refreshLeaderboard() {
  try {
    const remoteEntries = await fetchRemoteLeaderboard();
    state.leaderboardEntries = sortLeaderboard(remoteEntries).slice(0, MAX_LEADERBOARD_ENTRIES);
    state.leaderboardSource = "global";
    setLeaderboardStatus("");
  } catch (error) {
    console.warn("Unable to load the Yhub leaderboard. Falling back to local storage.", error);
    state.leaderboardEntries = sortLeaderboard(getLocalLeaderboard()).slice(0, MAX_LEADERBOARD_ENTRIES);
    state.leaderboardSource = "local";
    setLeaderboardStatus("");
  }

  renderLeaderboard();
}

async function fetchRemoteLeaderboard() {
  const url = new URL(YHUB_LEADERBOARD_ENDPOINT, window.location.origin);
  url.searchParams.set("limit", String(YHUB_LEADERBOARD_FETCH_LIMIT));

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Leaderboard request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const entries = extractLeaderboardEntries(payload).map(normalizeLeaderboardEntry).filter(Boolean);
  return sortLeaderboard(entries).slice(0, MAX_LEADERBOARD_ENTRIES);
}

async function saveRemoteLeaderboardEntry(entry) {
  const response = await fetch(YHUB_LEADERBOARD_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      player_name: entry.playerName,
      score: entry.score,
      correct_answers: entry.correctAnswers,
      total_questions: entry.totalQuestions,
      accuracy: entry.accuracy,
      played_at: entry.date,
    }),
  });

  if (!response.ok) {
    throw new Error(`Leaderboard save failed with status ${response.status}.`);
  }

  return response.json().catch(() => null);
}

function extractLeaderboardEntries(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

function normalizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const playerName = String(entry.playerName ?? entry.player_name ?? "").trim();
  const score = Number(entry.score);
  const correctAnswers = Number(entry.correctAnswers ?? entry.correct_answers);
  const totalQuestions = Number(entry.totalQuestions ?? entry.total_questions);
  const accuracy = Number(entry.accuracy);
  const date = String(entry.date ?? entry.played_at ?? new Date().toISOString());

  if (!playerName || Number.isNaN(score) || Number.isNaN(correctAnswers) || Number.isNaN(totalQuestions)) {
    return null;
  }

  return {
    playerName: playerName.slice(0, 20),
    score,
    correctAnswers,
    totalQuestions,
    accuracy: Number.isNaN(accuracy)
      ? totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0
      : accuracy,
    date,
  };
}

function setLeaderboardStatus(message) {
  elements.leaderboard.startStatus.textContent = message;
  elements.leaderboard.resultsStatus.textContent = message;
}

function setSaveStatus(message, stateClass = "") {
  elements.saveStatus.textContent = message;
  elements.saveStatus.classList.remove("is-success", "is-warning", "is-error");
  if (stateClass) {
    elements.saveStatus.classList.add(stateClass);
  }
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

  window.requestAnimationFrame(() => {
    elements.historyList.scrollTop = elements.historyList.scrollHeight;
    updateHistoryOverflowState();
  });
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
