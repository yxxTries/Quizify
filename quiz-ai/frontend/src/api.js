const BASE_URL = "http://localhost:8000";

/**
 * Upload a file to the backend and receive a generated quiz.
 * @param {File} file - The PDF or PPTX file to upload.
 * @returns {Promise<{questions: Array}>} The quiz data.
 */
export async function generateQuiz(file) {
  const formData = new FormData();
  formData.append("file", file);

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
