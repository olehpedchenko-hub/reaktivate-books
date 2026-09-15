import { HttpClientError } from "./HttpClientError";

/** The response arrived (possibly a 2xx) but its body was empty or not valid JSON. */
export class InvalidResponseBodyError extends HttpClientError {
  constructor(public readonly status: number) {
    super(`Expected a JSON body for status ${status}, but it was empty or malformed`);
    this.name = "InvalidResponseBodyError";
  }
}
