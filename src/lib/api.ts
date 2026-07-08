/**
 * API Wrapper for MDR POS System
 */

const getAuthToken = () => localStorage.getItem("mdr_pos_token");

export async function apiFetch<T = any>(
  endpoint: string,
  options: Omit<RequestInit, "body"> & { body?: any } = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Default to JSON body if sending an object
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Session expired or invalid
    localStorage.removeItem("mdr_pos_token");
    localStorage.removeItem("mdr_pos_user");
    window.location.reload();
    throw new Error("Session expired. Please login again.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "An error occurred");
  }

  return data as T;
}
