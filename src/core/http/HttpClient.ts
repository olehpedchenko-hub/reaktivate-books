import { HttpError } from "./HttpError";
import { RequestAbortedError } from "./RequestAbortedError";
import { NetworkError } from "./NetworkError";
import { InvalidResponseBodyError } from "./InvalidResponseBodyError";

export interface IHttpClient {
  get<T>(path: string, signal?: AbortSignal): Promise<T>;
  post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T>;
}

export class HttpClient implements IHttpClient {
  constructor(private readonly baseUrl: string) {}

  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, { method: "GET", signal });
  }

  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, init);
    } catch (error) {
      if (isAbortError(error) || init.signal?.aborted) {
        throw new RequestAbortedError();
      }
      throw new NetworkError(error);
    }
    if (!response.ok) {
      throw new HttpError(response.status);
    }
    return this.parseJsonBody<T>(response);
  }

  private async parseJsonBody<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (text.length === 0) {
      throw new InvalidResponseBodyError(response.status);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new InvalidResponseBodyError(response.status);
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
