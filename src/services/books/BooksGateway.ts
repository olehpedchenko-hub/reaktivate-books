import type { IHttpClient } from "../../core/http/HttpClient";
import type { CreateBookDto, CreateBookResponseDto } from "./dto";

export interface IBooksGateway {
  // Return type is `unknown`, not `BookDto[]`: the gateway forwards whatever
  // the server sent without validating its shape. Callers must not treat
  // this as trusted data — see booksMapper.mapBooksResponse.
  getAll(userId: string, signal?: AbortSignal): Promise<unknown>;
  getPrivate(userId: string, signal?: AbortSignal): Promise<unknown>;
  create(userId: string, payload: CreateBookDto, signal?: AbortSignal): Promise<CreateBookResponseDto>;
}

export class BooksGateway implements IBooksGateway {
  constructor(private readonly http: IHttpClient) {}

  getAll(userId: string, signal?: AbortSignal): Promise<unknown> {
    return this.http.get(`/v1/books/${encodeURIComponent(userId)}/`, signal);
  }

  getPrivate(userId: string, signal?: AbortSignal): Promise<unknown> {
    return this.http.get(`/v1/books/${encodeURIComponent(userId)}/private`, signal);
  }

  create(
    userId: string,
    payload: CreateBookDto,
    signal?: AbortSignal,
  ): Promise<CreateBookResponseDto> {
    return this.http.post<CreateBookResponseDto>(
      `/v1/books/${encodeURIComponent(userId)}/`,
      payload,
      signal,
    );
  }
}
