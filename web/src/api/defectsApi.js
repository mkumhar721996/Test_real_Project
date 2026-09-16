const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://localhost:${import.meta.env.ARC_DEV_PORT || 8008}`;

export async function createDefect(payload) {
  const response = await fetch(`${API_BASE_URL}/api/defects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  if (!response.ok) {
    const error = new Error('Failed to create defect');
    error.errors = body.errors;
    throw error;
  }

  return body;
}
