const GAME_DURATION_SECONDS = 60;
const ANSWER_COUNT = 4;
const ANSWER_DELAY_MS = 900;
const LEADERBOARD_STORAGE_KEY = "guess-the-flag-leaderboard";

const state = {
  countries: [],
  usedCountryCodes: new Set(),
  currentQuestion: null,
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
  timerDisplay: document.getElementById("timer-display"),
  scoreDisplay: document.getElementById("score-display"),
  questionDisplay: document.getElementById("question-display"),
  flagDisplay: document.getElementById("flag-display"),
  feedbackText: document.getElementById("feedback-text"),
  answersGrid: document.getElementById("answers-grid"),
  finalScore: document.getElementById("final-score"),
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

async function initializeApp() {
  bindEvents();
  renderLeaderboard();

  try {
    state.countries = await loadCountries();
    elements.feedbackText.textContent = "Choose the correct country name.";
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
  setFeedbackMessage("Choose the correct country name.");
  startTimer();
  renderNextQuestion();
}

function resetGameState() {
  clearTimer();
  clearNextQuestionTimeout();

  state.usedCountryCodes = new Set();
  state.currentQuestion = null;
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

  elements.flagDisplay.textContent = question.flag;
  elements.flagDisplay.setAttribute("aria-label", "Current flag question");
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
      appendAnswerState(button, "Correct answer");
    }

    if (button === selectedButton && !isCorrect) {
      button.classList.add("is-incorrect");
      appendAnswerState(button, "Your choice");
    }
  });

  if (isCorrect) {
    state.score += 1;
    state.correctAnswers += 1;
    setFeedbackMessage("Correct answer.", "is-correct");
  } else {
    state.incorrectAnswers += 1;
    setFeedbackMessage(`Incorrect. The correct answer was ${state.currentQuestion.country}.`, "is-incorrect");
  }

  updateHud();
  clearNextQuestionTimeout();
  state.nextQuestionTimeoutId = window.setTimeout(() => {
    if (state.gameActive && state.timeLeft > 0) {
      renderNextQuestion();
    }
  }, ANSWER_DELAY_MS);
}

function appendAnswerState(button, label) {
  const stateText = document.createElement("span");
  stateText.className = "answer-state";
  stateText.textContent = label;
  button.appendChild(stateText);
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

  elements.finalScore.textContent = String(state.score);
  elements.finalCorrectAnswered.textContent = `${state.correctAnswers} / ${totalAnswered}`;
  elements.saveStatus.textContent = "";
  elements.saveScoreButton.disabled = false;
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
  elements.saveStatus.textContent = "Score saved to the local leaderboard.";
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

  leaderboard.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "leaderboard-entry";

    const topLine = document.createElement("div");
    topLine.className = "leaderboard-topline";
    topLine.innerHTML = `<span>${escapeHtml(entry.playerName)}</span><span>${entry.correctAnswers} / ${entry.totalQuestions}</span>`;

    item.appendChild(topLine);
    listElement.appendChild(item);
  });
}

function updateHud() {
  elements.timerDisplay.textContent = `${Math.max(state.timeLeft, 0)}s`;
  elements.scoreDisplay.textContent = String(state.score);
  elements.questionDisplay.textContent = String(Math.max(state.questionNumber, 1));
}

function setFeedbackMessage(message, stateClass = "") {
  elements.feedbackText.textContent = message;
  elements.feedbackText.classList.remove("is-correct", "is-incorrect");
  if (stateClass) {
    elements.feedbackText.classList.add(stateClass);
  }
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
