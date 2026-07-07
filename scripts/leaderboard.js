import {
  LEADERBOARD_STORAGE_KEY,
  YHUB_LEADERBOARD_ENDPOINT,
  MAX_RESULTS_LEADERBOARD_ENTRIES,
  MAX_START_LEADERBOARD_ENTRIES,
} from "./config.js";

export async function refreshStartLeaderboard() {
  try {
    const remoteEntries = await fetchRemoteLeaderboard(MAX_RESULTS_LEADERBOARD_ENTRIES);
    return {
      entries: sortLeaderboardEntries(remoteEntries).slice(0, MAX_START_LEADERBOARD_ENTRIES),
      source: "global",
    };
  } catch (error) {
    console.warn("Unable to load the Yhub start leaderboard. Falling back to local storage.", error);
    return {
      entries: loadLocalLeaderboardEntries().slice(0, MAX_START_LEADERBOARD_ENTRIES),
      source: "local",
    };
  }
}

export async function refreshResultsLeaderboard() {
  try {
    const remoteEntries = await fetchRemoteLeaderboard(MAX_RESULTS_LEADERBOARD_ENTRIES);
    return {
      entries: sortLeaderboardEntries(remoteEntries),
      source: "global",
    };
  } catch (error) {
    console.warn("Unable to load the Yhub results leaderboard. Falling back to local storage.", error);
    return {
      entries: loadLocalLeaderboardEntries().slice(0, MAX_RESULTS_LEADERBOARD_ENTRIES),
      source: "local",
    };
  }
}

export function loadLocalLeaderboardEntries() {
  try {
    const rawLeaderboard = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    const parsedEntries = rawLeaderboard ? JSON.parse(rawLeaderboard) : [];

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return sortLeaderboardEntries(parsedEntries.map(normalizeLeaderboardEntry).filter(Boolean));
  } catch (error) {
    console.error("Unable to read leaderboard from localStorage.", error);
    return [];
  }
}

export async function refreshLeaderboard() {
  try {
    const [startEntries, resultsEntries] = await Promise.all([
      refreshStartLeaderboard(),
      refreshResultsLeaderboard(),
    ]);
    return {
      startEntries: startEntries.entries,
      resultsEntries: resultsEntries.entries,
      source: "global",
    };
  } catch (error) {
    console.warn("Unable to load the Yhub leaderboard. Falling back to local storage.", error);
    const localEntries = loadLocalLeaderboardEntries();
    return {
      startEntries: localEntries.slice(0, MAX_START_LEADERBOARD_ENTRIES),
      resultsEntries: localEntries.slice(0, MAX_RESULTS_LEADERBOARD_ENTRIES),
      source: "local",
    };
  }
}

export async function saveLeaderboard(entry) {
  try {
    await saveRemoteLeaderboardEntry(entry);
    const [startLeaderboard, resultsLeaderboard] = await Promise.all([
      refreshStartLeaderboard(),
      refreshResultsLeaderboard(),
    ]);

    return {
      startEntries: startLeaderboard.entries,
      resultsEntries: resultsLeaderboard.entries,
      source: "global",
      statusMessage: "Saved to the global leaderboard.",
      statusClass: "is-success",
    };
  } catch (error) {
    console.warn("Unable to save to the Yhub leaderboard. Falling back to local storage.", error);
  }

  saveLocalLeaderboardEntry(entry);

  return {
    startEntries: loadLocalLeaderboardEntries().slice(0, MAX_START_LEADERBOARD_ENTRIES),
    resultsEntries: loadLocalLeaderboardEntries().slice(0, MAX_RESULTS_LEADERBOARD_ENTRIES),
    source: "local",
    statusMessage: "Global leaderboard unavailable. Saved locally for this browser.",
    statusClass: "is-warning",
  };
}

export function buildLeaderboardEntry(gameState, playerName) {
  const totalQuestions = gameState.correctAnswers + gameState.incorrectAnswers;
  const accuracy = totalQuestions > 0 ? Math.round((gameState.correctAnswers / totalQuestions) * 100) : 0;

  return {
    playerName,
    score: gameState.score,
    correctAnswers: gameState.correctAnswers,
    totalQuestions,
    accuracy,
    date: new Date().toISOString(),
  };
}

export function getBestWeeklyLeaderboardEntry(entries, now = new Date()) {
  const weekAgoTimestamp = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  return (
    sortLeaderboardEntries(
      entries.filter((entry) => {
        const entryTimestamp = new Date(entry.date).getTime();
        return Number.isFinite(entryTimestamp) && entryTimestamp >= weekAgoTimestamp;
      })
    )[0] ?? null
  );
}

function saveLocalLeaderboardEntry(entry) {
  const nextEntries = [...loadLocalLeaderboardEntries(), entry];
  const sortedEntries = sortLeaderboardEntries(nextEntries);
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sortedEntries));
}

function sortLeaderboardEntries(entries) {
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

async function fetchRemoteLeaderboard(limit) {
  const url = new URL(YHUB_LEADERBOARD_ENDPOINT, window.location.origin);
  url.searchParams.set("limit", String(limit));

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
  return extractLeaderboardEntries(payload).map(normalizeLeaderboardEntry).filter(Boolean);
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
