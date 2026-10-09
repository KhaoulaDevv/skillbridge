import axios from "axios";
import { BACKEND_API_URL } from "../config/backend";
export async function request(path, method = "get", data, extra = {}) {
  const response = await axios({
    url: `${BACKEND_API_URL}/api/workspace${path}`,
    method,
    data,
    ...extra,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...extra.headers,
    },
  });
  return response.data;
}
export const failureMessage = (error) =>
  error?.response?.data?.message ||
  "Could not complete this action. Please try again.";
export const stages = [
  "APPLIED",
  "REVIEWING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
];
export const label = (value) =>
  value
    ?.replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase()) || "Not specified";
export const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export async function downloadCv(userId, name = "candidate-cv.pdf") {
  const blob = await request(`/profiles/${userId}/cv`, "get", undefined, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
