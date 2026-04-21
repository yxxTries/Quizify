// Use an environment variable for the backend URL, fallback to localhost for local dev
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await parseJsonSafely(response);
  if (!response.ok) {
    const message = payload?.detail || payload?.message || `Server error (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

export function buildWebSocketUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (/^wss?:\/\//.test(BASE_URL)) {
    return `${BASE_URL}${cleanPath}`;
  }
  if (/^https?:\/\//.test(BASE_URL)) {
    const wsBase = BASE_URL.replace(/^http/, "ws");
    return `${wsBase}${cleanPath}`;
  }
  const normalized = BASE_URL.replace(/^\/+/, "");
  return `wss://${normalized}${cleanPath}`;
}

/**
 * Upload a file to the backend and receive a generated quiz.
 * @param {File} file - The PDF or PPTX file to upload.
 * @param {number} numQuestions - How many questions to generate (1–20).
 * @returns {Promise<{questions: Array}>} The quiz data.
 */
export async function generateQuiz(file, numQuestions = 10, instructions = "") {
  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  }
  formData.append("num_questions", String(numQuestions));
  if (instructions && instructions.trim() !== "") {
    formData.append("custom_instructions", instructions.trim());
  }

  const response = await fetch(`${BASE_URL}/generate-quiz`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    let message = `Server error (${response.status})`;
    try {
      const err = await response.json();
      message = err.detail || message;
    } catch {
      // ignore JSON parse errors on error responses
    }
    throw new Error(message);
  }

  return response.json();
}

export function register(payload) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export function getCurrentUser() {
  return request("/auth/me", {
    method: "GET",
  });
}

export function updateProfile(payload) {
  return request("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload) {
  return request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(payload) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyGames() {
  return request("/games", {
    method: "GET",
  });
}

export function saveMyGame(payload) {
  return request("/games", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function setMyGamePinned(gameId, pinned) {
  return request(`/games/${gameId}/pin`, {
    method: "PATCH",
    body: JSON.stringify({ pinned }),
  });
}
