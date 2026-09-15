import { HttpClientError } from "./HttpClientError";

/** The fetch call itself failed (offline, DNS, CORS, ...) — never sent/received an HTTP response. */
export class NetworkError extends HttpClientError {
  constructor(cause: unknown) {
    super("The request failed due to a network error.", { cause });
    this.name = "NetworkError";
  }
}
