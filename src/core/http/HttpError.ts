import { HttpClientError } from "./HttpClientError";

/** A non-2xx response. statusText is unreliable (empty over HTTP/2), so the message never depends on it. */
export class HttpError extends HttpClientError {
  constructor(public readonly status: number) {
    super(`HTTP request failed with status ${status}`);
    this.name = "HttpError";
  }
}
