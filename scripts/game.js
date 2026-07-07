import {
  ANSWERS_PER_QUESTION,
  CORRECT_ANSWER_FEEDBACK_DELAY_MS,
  GAME_DURATION_SECONDS,
  WRONG_ANSWER_FEEDBACK_DELAY_MS,
} from "./config.js";
import { pickRandomItem, shuffleArray } from "./utils.js";

export function resetGameState(state) {
  clearTimer(state);
  clearNextQuestionTimeout(state);

  state.usedCountryCodes = new Set();
  state.currentQuestion = null;
  state.questionHistory = [];
  state.score = 0;
  state.correctAnswers = 0;
  state.incorrectAnswers = 0;
  state.questionNumber = 0;
  state.timeLeft = GAME_DURATION_SECONDS;
  state.isGameActive = true;
  state.isScoreSaved = false;
}

export function startTimer(state, onTick, onExpire) {
  clearTimer(state);

  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    onTick();

    if (state.timeLeft <= 0) {
      onExpire();
    }
  }, 1000);
}

export function clearTimer(state) {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

export function clearNextQuestionTimeout(state) {
  if (state.nextQuestionTimeoutId !== null) {
    window.clearTimeout(state.nextQuestionTimeoutId);
    state.nextQuestionTimeoutId = null;
  }
}

export function scheduleNextQuestion(state, callback, isCorrectAnswer) {
  clearNextQuestionTimeout(state);

  const feedbackDelay = isCorrectAnswer
    ? CORRECT_ANSWER_FEEDBACK_DELAY_MS
    : WRONG_ANSWER_FEEDBACK_DELAY_MS;

  state.nextQuestionTimeoutId = window.setTimeout(() => {
    if (state.isGameActive && state.timeLeft > 0) {
      callback();
    }
  }, feedbackDelay);
}

export function createQuestion(state) {
  const availableCountries = getAvailableQuestionCountries(state);
  const correctCountry = pickRandomItem(availableCountries);

  if (!correctCountry) {
    return null;
  }

  state.usedCountryCodes.add(correctCountry.code);

  const wrongAnswers = shuffleArray(
    state.countries.filter((country) => country.code !== correctCountry.code)
  ).slice(0, ANSWERS_PER_QUESTION - 1);

  if (wrongAnswers.length < ANSWERS_PER_QUESTION - 1) {
    return null;
  }

  const answers = shuffleArray(
    [correctCountry, ...wrongAnswers].map((country) => ({
      code: country.code,
      label: country.country,
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

export function recordQuestion(state, question) {
  state.currentQuestion = question;
  state.questionNumber += 1;
  state.questionHistory.push({
    flag: question.flag,
    country: question.country,
    isCorrect: null,
  });
}

export function applyAnswerResult(state, isCorrectAnswer) {
  if (isCorrectAnswer) {
    state.score += 1;
    state.correctAnswers += 1;
    return;
  }

  state.incorrectAnswers += 1;
}

export function updateLastHistoryEntry(state, isCorrectAnswer) {
  if (!state.questionHistory.length) {
    return;
  }

  state.questionHistory[state.questionHistory.length - 1].isCorrect = isCorrectAnswer;
}

export function getTotalAnsweredQuestions(state) {
  return state.correctAnswers + state.incorrectAnswers;
}

function getAvailableQuestionCountries(state) {
  const unusedCountries = state.countries.filter((country) => !state.usedCountryCodes.has(country.code));
  return unusedCountries.length > 0 ? unusedCountries : state.countries;
}
