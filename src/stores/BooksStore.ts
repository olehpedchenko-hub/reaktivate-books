import { makeAutoObservable } from "mobx";
import type { Book } from "../domain/books/Book";

/** App-wide observable book state. No async here — orchestration belongs to a controller. */
export class BooksStore {
  books: Book[] = [];
  privateBooks: Book[] = [];
  /**
   * Bumped whenever a book is created. Controllers that need to react to a
   * create — without knowing about each other, or about whichever
   * controller did the creating — set up a reaction on this in their own
   * init() instead of being handed a callback.
   */
  booksRevision = 0;

  constructor() {
    makeAutoObservable(this);
  }

  get privateCount(): number {
    return this.privateBooks.length;
  }

  setBooks(next: Book[]): void {
    this.books = next;
  }

  setPrivateBooks(next: Book[]): void {
    this.privateBooks = next;
  }

  bumpBooksRevision(): void {
    this.booksRevision += 1;
  }
}
