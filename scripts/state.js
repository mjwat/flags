import { GAME_DURATION_SECONDS } from "./config.js";

export const state = {
  countries: [],
  playerName: "",
  usedCountryCodes: new Set(),
  currentQuestion: null,
  questionHistory: [],
  score: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  questionNumber: 0,
  timeLeft: GAME_DURATION_SECONDS,
  isGameActive: false,
  isScoreSaved: false,
  startLeaderboardEntries: [],
  resultsLeaderboardEntries: [],
  lastSavedLeaderboardEntry: null,
  leaderboardSource: "loading",
  timerId: null,
  nextQuestionTimeoutId: null,
};
