import { ANSWERS_PER_QUESTION } from "./config.js";
import { loadCountries } from "./countries.js";
import { elements } from "./elements.js";
import {
  applyAnswerResult,
  clearNextQuestionTimeout,
  clearTimer,
  createQuestion,
  getTotalAnsweredQuestions,
  recordQuestion,
  resetGameState,
  scheduleNextQuestion,
  startTimer,
  updateLastHistoryEntry,
} from "./game.js";
import { buildLeaderboardEntry, refreshLeaderboard, saveLeaderboard } from "./leaderboard.js";
import { state } from "./state.js";
import {
  disableAnswerButtons,
  getAnswerButtons,
  renderAnswerButtons,
  renderHeroFlagRotator,
  renderHistory,
  renderLeaderboard,
  renderResults,
  setCurrentFlag,
  setFeedbackMessage,
  setLeaderboardStatus,
  setSaveStatus,
  showScreen,
  updateGameHeader,
} from "./ui.js";

document.addEventListener("DOMContentLoaded", initializeApp);

const PLAYER_NAME_STORAGE_KEY = "guess-the-flag-player-name";

async function initializeApp() {
  bindEvents();
  ensurePlayerName();
  setLeaderboardStatus("Loading leaderboard...");

  try {
    const [countries, leaderboardResult] = await Promise.all([loadCountries(), refreshLeaderboard()]);
    state.countries = countries;
    state.leaderboardEntries = leaderboardResult.entries;
    state.leaderboardSource = leaderboardResult.source;

    renderHeroFlagRotator(state.countries);
    renderLeaderboard(state.leaderboardEntries);
    setLeaderboardStatus("");
    setFeedbackMessage("");
    elements.startGameButton.disabled = false;
  } catch (error) {
    console.error("Unable to initialize the app.", error);
    setFeedbackMessage("Unable to load countries. Please refresh the page.");
    setLeaderboardStatus("Leaderboard unavailable.");
    elements.startGameButton.disabled = true;
  }
}

function bindEvents() {
  elements.startGameButton.addEventListener("click", startGame);
  elements.playAgainButton.addEventListener("click", startGame);
  elements.playerNameInput.addEventListener("change", handlePlayerNameChange);
  elements.timerDisplay.addEventListener("click", handleTimerTap);
}

function startGame() {
  if (state.countries.length < ANSWERS_PER_QUESTION) {
    setFeedbackMessage("Not enough countries available to start the game.");
    return;
  }

  state.playerName = getPlayerName();
  state.lastSavedLeaderboardEntry = null;
  resetGameState(state);
  showScreen("game");
  updateGameHeader(state.score, state.questionNumber, state.timeLeft);
  setFeedbackMessage("");
  setSaveStatus("");
  renderHistory(state.questionHistory);

  startTimer(
    state,
    () => updateGameHeader(state.score, state.questionNumber, state.timeLeft),
    endGame
  );
  showNextQuestion();
}

function showNextQuestion() {
  if (!state.isGameActive || state.timeLeft <= 0) {
    return;
  }

  const nextQuestion = createQuestion(state);

  if (!nextQuestion) {
    endGame();
    return;
  }

  recordQuestion(state, nextQuestion);
  setCurrentFlag(nextQuestion.flag);
  renderHistory(state.questionHistory);
  updateGameHeader(state.score, state.questionNumber, state.timeLeft);
  renderAnswerButtons(nextQuestion.answers, handleAnswerSelection);
}

function handleAnswerSelection(selectedButton) {
  if (!state.isGameActive || !state.currentQuestion) {
    return;
  }

  const answerButtons = getAnswerButtons();
  const isCorrectAnswer = selectedButton.dataset.correct === "true";

  answerButtons.forEach((button) => {
    const buttonIsCorrect = button.dataset.correct === "true";
    button.disabled = true;

    if (buttonIsCorrect) {
      button.classList.add("is-correct");
    } else if (button === selectedButton) {
      button.classList.add("is-incorrect");
    }
  });

  applyAnswerResult(state, isCorrectAnswer);
  updateLastHistoryEntry(state, isCorrectAnswer);
  renderHistory(state.questionHistory);
  setFeedbackMessage("");
  updateGameHeader(state.score, state.questionNumber, state.timeLeft);
  scheduleNextQuestion(state, showNextQuestion, isCorrectAnswer);
}

function handleTimerTap() {
  if (!state.isGameActive) {
    return;
  }

  if (state.timeLeft < 10) {
    endGame();
    return;
  }

  state.timeLeft -= 10;
  updateGameHeader(state.score, state.questionNumber, state.timeLeft);
}

async function endGame() {
  if (!state.isGameActive) {
    return;
  }

  state.isGameActive = false;
  state.timeLeft = 0;

  clearTimer(state);
  clearNextQuestionTimeout(state);
  disableAnswerButtons();
  renderResults(state.correctAnswers, getTotalAnsweredQuestions(state));
  showScreen("results");
  renderLeaderboard(state.leaderboardEntries);
  await handleSaveScore();
}

async function handleSaveScore() {
  if (state.isScoreSaved) {
    setSaveStatus("Score already saved for this round.");
    return;
  }

  const leaderboardEntry = buildLeaderboardEntry(state, state.playerName);
  setSaveStatus("Saving score...");

  try {
    const saveResult = await saveLeaderboard(leaderboardEntry);
    state.isScoreSaved = true;
    state.lastSavedLeaderboardEntry = leaderboardEntry;
    state.leaderboardEntries = saveResult.entries;
    state.leaderboardSource = saveResult.source;
    renderLeaderboard(state.leaderboardEntries);
    if (saveResult.statusClass === "is-success") {
      setSaveStatus("");
    } else {
      setSaveStatus(saveResult.statusMessage, saveResult.statusClass);
    }
  } catch (error) {
    console.error("Unable to save leaderboard entry.", error);
    setSaveStatus("Unable to save your score right now.", "is-error");
  }
}

function getPlayerName() {
  const trimmedName = elements.playerNameInput.value.trim();
  const playerName = trimmedName || ensurePlayerName();

  elements.playerNameInput.value = playerName;
  persistPlayerName(playerName);
  state.playerName = playerName;
  return playerName;
}

function ensurePlayerName() {
  const inputValue = elements.playerNameInput.value.trim();

  if (inputValue) {
    persistPlayerName(inputValue);
    state.playerName = inputValue;
    return inputValue;
  }

  const storedPlayerName = loadStoredPlayerName();

  if (storedPlayerName) {
    elements.playerNameInput.value = storedPlayerName;
    state.playerName = storedPlayerName;
    return storedPlayerName;
  }

  const defaultPlayerName = generateDefaultPlayerName();
  elements.playerNameInput.value = defaultPlayerName;
  state.playerName = defaultPlayerName;
  persistPlayerName(defaultPlayerName);
  return defaultPlayerName;
}

function generateDefaultPlayerName() {
  const randomSuffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return `Player${randomSuffix}`;
}

function handlePlayerNameChange() {
  const trimmedName = elements.playerNameInput.value.trim();

  if (!trimmedName) {
    ensurePlayerName();
    return;
  }

  elements.playerNameInput.value = trimmedName;
  persistPlayerName(trimmedName);
  state.playerName = trimmedName;
}

function loadStoredPlayerName() {
  try {
    const storedPlayerName = localStorage.getItem(PLAYER_NAME_STORAGE_KEY)?.trim() ?? "";
    return storedPlayerName || "";
  } catch (error) {
    console.warn("Unable to read the saved player name.", error);
    return "";
  }
}

function persistPlayerName(playerName) {
  try {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
  } catch (error) {
    console.warn("Unable to save the player name.", error);
  }
}
