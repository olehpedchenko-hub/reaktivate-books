import type { Book } from "../../domain/books/Book";
import type { BookDto } from "./dto";

export class InvalidBooksResponseError extends Error {
  constructor() {
    super("Expected the books response body to be an array.");
    this.name = "InvalidBooksResponseError";
  }
}

/**
 * Validates and normalises a books list response. The payload is untrusted —
 * this API is a shared demo database polluted by other callers — so a
 * non-array body is a genuine error, not an empty list, and individual
 * records may be missing fields entirely. A record is kept if it has a
 * non-empty name and author; id is optional — both `/` and `/private` are
 * treated identically here, since privacy comes from which endpoint was
 * called, not from anything on the record.
 */
export function mapBooksResponse(raw: unknown): Book[] {
  if (!Array.isArray(raw)) {
    throw new InvalidBooksResponseError();
  }
  const books: Book[] = [];
  raw.forEach((entry, index) => {
    const book = mapBookDto(entry, index);
    if (book) {
      books.push(book);
    }
  });
  return books;
}

function mapBookDto(raw: unknown, indexInResponse: number): Book | null {
  const dto = toBookDto(raw);
  if (!dto) {
    return null;
  }
  const name = dto.name?.trim() ?? "";
  const author = dto.author?.trim() ?? "";
  if (!name || !author) {
    return null;
  }
  const id = dto.id !== undefined ? String(dto.id) : `pos:${indexInResponse}:${name}`;
  return { id, name, author };
}

function toBookDto(raw: unknown): BookDto | null {
  if (!isRecord(raw)) {
    return null;
  }
  return {
    id: typeof raw.id === "number" ? raw.id : undefined,
    name: typeof raw.name === "string" ? raw.name : undefined,
    author: typeof raw.author === "string" ? raw.author : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
