import type { IBooksGateway } from "../../services/books/BooksGateway";
import type { CreateBookDto, CreateBookResponseDto } from "../../services/books/dto";

interface RecordedCreateCall {
  userId: string;
  payload: CreateBookDto;
  signal?: AbortSignal;
}

/** Programmable fake for IBooksGateway — no HTTP, no vi.mock. */
export class FakeBooksGateway implements IBooksGateway {
  allResponse: unknown = [];
  privateResponse: unknown = [];
  createResponse: CreateBookResponseDto = { status: "ok" };
  createCalls: RecordedCreateCall[] = [];

  async getAll(_userId: string, _signal?: AbortSignal): Promise<unknown> {
    return this.allResponse;
  }

  async getPrivate(_userId: string, _signal?: AbortSignal): Promise<unknown> {
    return this.privateResponse;
  }

  async create(
    userId: string,
    payload: CreateBookDto,
    signal?: AbortSignal,
  ): Promise<CreateBookResponseDto> {
    this.createCalls.push({ userId, payload, signal });
    return this.createResponse;
  }
}
