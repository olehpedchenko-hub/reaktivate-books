import { HttpError } from "../../core/http/HttpError";
import { NetworkError } from "../../core/http/NetworkError";
import { InvalidResponseBodyError } from "../../core/http/InvalidResponseBodyError";
import { InvalidBooksResponseError } from "./booksMapper";

/**
 * Maps any error a books repository/gateway call can throw to a message a
 * view can render as-is. Shared by every controller that surfaces a
 * books-related failure, so the instanceof chain has exactly one copy.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    return `The server rejected the request (status ${error.status}). Please try again.`;
  }
  if (error instanceof NetworkError) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (error instanceof InvalidResponseBodyError || error instanceof InvalidBooksResponseError) {
    return "The server returned an unexpected response. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
