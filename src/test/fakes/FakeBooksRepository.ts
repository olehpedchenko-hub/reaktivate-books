import { createDeferred } from "./deferred";
import type { IBooksRepository } from "../../services/books/BooksRepository";
import type { Book, BookDraft } from "../../domain/books/Book";
import type { BooksFilter } from "../../domain/books/BooksFilter";

export interface RecordedListCall {
  userId: string;
  filter: BooksFilter;
  signal?: AbortSignal;
  settled: boolean;
  resolve: (books: Book[]) => void;
  reject: (error: unknown) => void;
}

export interface RecordedCreateCall {
  userId: string;
  draft: BookDraft;
  signal?: AbortSignal;
  settled: boolean;
  resolve: () => void;
  reject: (error: unknown) => void;
}

/**
 * Programmable fake for IBooksRepository. Each list()/create() call gets its
 * own deferred promise, independently addressable via listCalls[i]/
 * createCalls[i] so a test can settle any specific call regardless of call
 * order — needed to simulate a slow, superseded, or unmount-interrupted
 * request resolving late.
 */
export class FakeBooksRepository implements IBooksRepository {
  readonly listCalls: RecordedListCall[] = [];
  readonly createCalls: RecordedCreateCall[] = [];

  list(userId: string, filter: BooksFilter, signal?: AbortSignal): Promise<Book[]> {
    const deferred = createDeferred<Book[]>();
    const call: RecordedListCall = {
      userId,
      filter,
      signal,
      settled: false,
      resolve: (books) => {
        call.settled = true;
        deferred.resolve(books);
      },
      reject: (error) => {
        call.settled = true;
        deferred.reject(error);
      },
    };
    this.listCalls.push(call);
    return deferred.promise;
  }

  /** Resolves the earliest not-yet-settled list() call. */
  resolveNextList(books: Book[]): void {
    const call = this.listCalls.find((c) => !c.settled);
    if (!call) {
      throw new Error("FakeBooksRepository: no pending list() call to resolve");
    }
    call.resolve(books);
  }

  /** Rejects the earliest not-yet-settled list() call. */
  rejectNextList(error: unknown): void {
    const call = this.listCalls.find((c) => !c.settled);
    if (!call) {
      throw new Error("FakeBooksRepository: no pending list() call to reject");
    }
    call.reject(error);
  }

  create(userId: string, draft: BookDraft, signal?: AbortSignal): Promise<void> {
    const deferred = createDeferred<void>();
    const call: RecordedCreateCall = {
      userId,
      draft,
      signal,
      settled: false,
      resolve: () => {
        call.settled = true;
        deferred.resolve();
      },
      reject: (error) => {
        call.settled = true;
        deferred.reject(error);
      },
    };
    this.createCalls.push(call);
    return deferred.promise;
  }

  /** Resolves the earliest not-yet-settled create() call. */
  resolveNextCreate(): void {
    const call = this.createCalls.find((c) => !c.settled);
    if (!call) {
      throw new Error("FakeBooksRepository: no pending create() call to resolve");
    }
    call.resolve();
  }

  /** Rejects the earliest not-yet-settled create() call. */
  rejectNextCreate(error: unknown): void {
    const call = this.createCalls.find((c) => !c.settled);
    if (!call) {
      throw new Error("FakeBooksRepository: no pending create() call to reject");
    }
    call.reject(error);
  }
}
