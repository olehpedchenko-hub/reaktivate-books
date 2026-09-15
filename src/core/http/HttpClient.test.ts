import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpClient } from "./HttpClient";
import { HttpClientError } from "./HttpClientError";
import { HttpError } from "./HttpError";
import { RequestAbortedError } from "./RequestAbortedError";
import { NetworkError } from "./NetworkError";
import { InvalidResponseBodyError } from "./InvalidResponseBodyError";

function jsonResponse(status: number, body: unknown, statusText = ""): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HttpClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("builds the URL from the base URL and path for GET", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    const client = new HttpClient("/api");

    await client.get("/v1/books/oleh/");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/books/oleh/",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sends a JSON body and content-type header for POST", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { status: "ok" }));
    const client = new HttpClient("/api");

    await client.post("/v1/books/oleh/", { name: "Dune", author: "Frank Herbert" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/books/oleh/",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Dune", author: "Frank Herbert" }),
      }),
    );
  });

  it("forwards the abort signal", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    const client = new HttpClient("/api");
    const controller = new AbortController();

    await client.get("/v1/books/oleh/", controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("resolves with the parsed JSON body on a 2xx response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: 1 }]));
    const client = new HttpClient("/api");

    const result = await client.get("/v1/books/oleh/");

    expect(result).toEqual([{ id: 1 }]);
  });

  describe("non-2xx responses", () => {
    it("throws a typed HttpError carrying the status", async () => {
      fetchMock.mockResolvedValue(jsonResponse(404, { message: "not found" }));
      const client = new HttpClient("/api");

      await expect(client.get("/v1/books/oleh/")).rejects.toMatchObject({
        name: "HttpError",
        status: 404,
      });
      await expect(client.get("/v1/books/oleh/")).rejects.toBeInstanceOf(HttpError);
    });

    it("puts the status in the error message even when statusText is empty (HTTP/2)", async () => {
      fetchMock.mockResolvedValue(jsonResponse(503, { message: "unavailable" }, ""));
      const client = new HttpClient("/api");

      await expect(client.get("/v1/books/oleh/")).rejects.toThrow("503");
    });
  });

  describe("aborted requests", () => {
    it("rejects with RequestAbortedError when the underlying fetch throws an AbortError", async () => {
      fetchMock.mockRejectedValue(new DOMException("The user aborted a request.", "AbortError"));
      const client = new HttpClient("/api");
      const controller = new AbortController();
      controller.abort();

      await expect(client.get("/v1/books/oleh/", controller.signal)).rejects.toBeInstanceOf(
        RequestAbortedError,
      );
    });

    it("is never reported as an HttpError", async () => {
      fetchMock.mockRejectedValue(new DOMException("The user aborted a request.", "AbortError"));
      const client = new HttpClient("/api");
      const controller = new AbortController();
      controller.abort();

      await expect(client.get("/v1/books/oleh/", controller.signal)).rejects.not.toBeInstanceOf(
        HttpError,
      );
    });

    it("treats any rejection as an abort when the signal was already aborted", async () => {
      fetchMock.mockRejectedValue(new Error("network hiccup"));
      const client = new HttpClient("/api");
      const controller = new AbortController();
      controller.abort();

      await expect(client.get("/v1/books/oleh/", controller.signal)).rejects.toBeInstanceOf(
        RequestAbortedError,
      );
    });
  });

  describe("network failures", () => {
    it("rejects with NetworkError, not a bare TypeError, on a network/CORS failure", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
      const client = new HttpClient("/api");

      await expect(client.get("/v1/books/oleh/")).rejects.toBeInstanceOf(NetworkError);
    });

    it("is not mistaken for an aborted request when the signal was never aborted", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
      const client = new HttpClient("/api");

      await expect(client.get("/v1/books/oleh/")).rejects.not.toBeInstanceOf(RequestAbortedError);
    });
  });

  describe("invalid response bodies", () => {
    it("rejects with InvalidResponseBodyError for a 204 No Content response", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      const client = new HttpClient("/api");

      await expect(client.get("/v1/books/oleh/")).rejects.toBeInstanceOf(InvalidResponseBodyError);
    });

    it("rejects with InvalidResponseBodyError for a 2xx response with a zero-length body", async () => {
      fetchMock.mockResolvedValue(new Response("", { status: 200 }));
      const client = new HttpClient("/api");

      await expect(client.get("/v1/books/oleh/")).rejects.toBeInstanceOf(InvalidResponseBodyError);
    });

    it("rejects with InvalidResponseBodyError, not a raw SyntaxError, for malformed JSON", async () => {
      fetchMock.mockResolvedValue(new Response("not json", { status: 200 }));
      const client = new HttpClient("/api");

      await expect(client.get("/v1/books/oleh/")).rejects.toBeInstanceOf(InvalidResponseBodyError);
    });
  });

  describe("error hierarchy", () => {
    it("gives every error type a single common base to switch on", () => {
      expect(new HttpError(500)).toBeInstanceOf(HttpClientError);
      expect(new RequestAbortedError()).toBeInstanceOf(HttpClientError);
      expect(new NetworkError(new Error("x"))).toBeInstanceOf(HttpClientError);
      expect(new InvalidResponseBodyError(200)).toBeInstanceOf(HttpClientError);
    });
  });
});
