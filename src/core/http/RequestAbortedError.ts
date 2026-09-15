import { HttpClientError } from "./HttpClientError";

/** Thrown when a request was cancelled by its own AbortSignal — distinct from a failed request. */
export class RequestAbortedError extends HttpClientError {
  constructor() {
    super("The request was aborted.");
    this.name = "RequestAbortedError";
  }
}
