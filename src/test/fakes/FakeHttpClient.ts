import type { IHttpClient } from "../../core/http/HttpClient";

interface RecordedCall {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  signal?: AbortSignal;
}

/** Records every call it receives and returns a programmable canned response. */
export class FakeHttpClient implements IHttpClient {
  readonly calls: RecordedCall[] = [];
  private nextResponse: unknown;

  respondWith(response: unknown): void {
    this.nextResponse = response;
  }

  get lastCall(): RecordedCall | undefined {
    return this.calls.at(-1);
  }

  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    this.calls.push({ method: "GET", path, signal });
    return this.nextResponse as T;
  }

  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    this.calls.push({ method: "POST", path, body, signal });
    return this.nextResponse as T;
  }
}
