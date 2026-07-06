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
  renderFlagMarquee,
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

async function initializeApp() {
  bindEvents();
  setLeaderboardStatus("Loading leaderboard...");

  try {
    const [countries, leaderboardResult] = await Promise.all([loadCountries(), refreshLeaderboard()]);
    state.countries = countries;
    state.leaderboardEntries = leaderboardResult.entries;
    state.leaderboardSource = leaderboardResult.source;

    renderFlagMarquee(state.countries);
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
  elements.saveScoreForm.addEventListener("submit", handleSaveScore);
}

function startGame() {
  if (state.countries.length < ANSWERS_PER_QUESTION) {
    setFeedbackMessage("Not enough countries available to start the game.");
    return;
  }

  resetGameState(state);
  showScreen("game");
  updateGameHeader(state.score, state.questionNumber, state.timeLeft);
  setFeedbackMessage("");
  setSaveStatus("");
  renderHistory(state.questionHistory);
  elements.playerNameInput.value = "Player";
  elements.saveScoreButton.disabled = false;

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
  scheduleNextQuestion(state, showNextQuestion);
}

function endGame() {
  if (!state.isGameActive) {
    return;
  }

  state.isGameActive = false;
  state.timeLeft = 0;

  clearTimer(state);
  clearNextQuestionTimeout(state);
  disableAnswerButtons();
  renderResults(state.correctAnswers, getTotalAnsweredQuestions(state));
  renderLeaderboard(state.leaderboardEntries);
  setSaveStatus("");
  showScreen("results");
}

async function handleSaveScore(event) {
  event.preventDefault();

  if (state.isScoreSaved) {
    setSaveStatus("Score already saved for this round.");
    return;
  }

  const trimmedName = elements.playerNameInput.value.trim();
  const playerName = trimmedName || "Player";

  if (!trimmedName) {
    elements.playerNameInput.value = playerName;
  }

  const leaderboardEntry = buildLeaderboardEntry(state, playerName);
  elements.saveScoreButton.disabled = true;
  setSaveStatus("Saving score...");

  try {
    const saveResult = await saveLeaderboard(leaderboardEntry);
    state.isScoreSaved = true;
    state.leaderboardEntries = saveResult.entries;
    state.leaderboardSource = saveResult.source;
    renderLeaderboard(state.leaderboardEntries);
    setSaveStatus(saveResult.statusMessage, saveResult.statusClass);
  } catch (error) {
    console.error("Unable to save leaderboard entry.", error);
    elements.saveScoreButton.disabled = false;
    setSaveStatus("Unable to save your score right now.", "is-error");
  }
}
