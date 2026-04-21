// Use an environment variable for the backend URL, fallback to localhost for local dev
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

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
