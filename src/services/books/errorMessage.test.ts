import { describe, expect, it } from "vitest";
import { toErrorMessage } from "./errorMessage";
import { HttpError } from "../../core/http/HttpError";
import { NetworkError } from "../../core/http/NetworkError";
import { InvalidResponseBodyError } from "../../core/http/InvalidResponseBodyError";
import { InvalidBooksResponseError } from "./booksMapper";

describe("toErrorMessage", () => {
  it("includes the status for an HttpError", () => {
    expect(toErrorMessage(new HttpError(404))).toContain("404");
    expect(toErrorMessage(new HttpError(500))).toContain("500");
  });

  it("describes a NetworkError as a connectivity problem", () => {
    expect(toErrorMessage(new NetworkError(new Error("offline")))).toBe(
      "Could not reach the server. Check your connection and try again.",
    );
  });

  it("describes an InvalidResponseBodyError as an unexpected server response", () => {
    expect(toErrorMessage(new InvalidResponseBodyError(200))).toBe(
      "The server returned an unexpected response. Please try again.",
    );
  });

  it("describes an InvalidBooksResponseError with the same wording as InvalidResponseBodyError", () => {
    expect(toErrorMessage(new InvalidBooksResponseError())).toBe(
      toErrorMessage(new InvalidResponseBodyError(200)),
    );
  });

  it("falls back to a generic message for anything else", () => {
    expect(toErrorMessage(new Error("boom"))).toBe("Something went wrong. Please try again.");
    expect(toErrorMessage("not even an Error")).toBe("Something went wrong. Please try again.");
    expect(toErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });
});
