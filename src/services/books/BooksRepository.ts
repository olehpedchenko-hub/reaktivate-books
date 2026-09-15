import type { IBooksGateway } from "./BooksGateway";
import type { Book, BookDraft } from "../../domain/books/Book";
import type { BooksFilter } from "../../domain/books/BooksFilter";
import type { CreateBookDto } from "./dto";
import { mapBooksResponse } from "./booksMapper";

export interface IBooksRepository {
  list(userId: string, filter: BooksFilter, signal?: AbortSignal): Promise<Book[]>;
  create(userId: string, draft: BookDraft, signal?: AbortSignal): Promise<void>;
}

export class BooksRepository implements IBooksRepository {
  constructor(private readonly gateway: IBooksGateway) {}

  async list(userId: string, filter: BooksFilter, signal?: AbortSignal): Promise<Book[]> {
    const raw =
      filter === "private"
        ? await this.gateway.getPrivate(userId, signal)
        : await this.gateway.getAll(userId, signal);
    return mapBooksResponse(raw);
  }

  async create(userId: string, draft: BookDraft, signal?: AbortSignal): Promise<void> {
    await this.gateway.create(userId, toCreateBookDto(draft), signal);
    // The API never returns the created entity or an id (confirmed by direct
    // probing) — callers must refetch via list() to observe the new book.
  }
}

function toCreateBookDto(draft: BookDraft): CreateBookDto {
  return { name: draft.name.trim(), author: draft.author.trim() };
}
