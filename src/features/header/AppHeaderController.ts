import { makeAutoObservable, reaction, runInAction } from "mobx";
import type { Controller } from "../../core/controller/Controller";
import type { IBooksRepository } from "../../services/books/BooksRepository";
import type { UserStore } from "../../stores/UserStore";
import type { BooksStore } from "../../stores/BooksStore";

/**
 * Owns the private-books count shown in the sticky header. Loads once on
 * startup, and reacts to BooksStore.booksRevision to refetch after a book is
 * created elsewhere — it never needs to know who created it or why.
 */
export class AppHeaderController implements Controller {
  private abortController: AbortController | null = null;
  private requestVersion = 0;
  private isDisposed = false;
  private stopRevisionReaction: (() => void) | null = null;

  constructor(
    private readonly repo: IBooksRepository,
    private readonly userStore: UserStore,
    private readonly booksStore: BooksStore,
  ) {
    makeAutoObservable<
      this,
      "abortController" | "requestVersion" | "isDisposed" | "stopRevisionReaction"
    >(
      this,
      {
        abortController: false,
        requestVersion: false,
        isDisposed: false,
        stopRevisionReaction: false,
      },
      { autoBind: true },
    );
  }

  init(): void {
    // See BooksPageController.init() for why this reset is required under
    // React 18 StrictMode's dev-only double mount/cleanup/mount.
    this.isDisposed = false;
    // fireImmediately stays false: this must fire only on a *subsequent*
    // bump, not for the counter's value at startup — load() below already
    // covers the initial fetch.
    this.stopRevisionReaction = reaction(
      () => this.booksStore.booksRevision,
      () => void this.load(),
    );
    void this.load();
  }

  dispose(): void {
    this.isDisposed = true;
    this.abortController?.abort();
    this.stopRevisionReaction?.();
    this.stopRevisionReaction = null;
  }

  get counterLabel(): string {
    return `Your books: ${this.booksStore.privateCount}`;
  }

  private async load(): Promise<void> {
    const version = ++this.requestVersion;
    this.abortController?.abort();
    const abortController = new AbortController();
    this.abortController = abortController;

    try {
      const books = await this.repo.list(this.userStore.userId, "private", abortController.signal);
      if (this.isDisposed || version !== this.requestVersion) {
        return;
      }
      runInAction(() => {
        this.booksStore.setPrivateBooks(books);
      });
    } catch {
      // A background counter refresh failing isn't user-facing (this also
      // covers our own abort on dispose/supersede) — the count simply keeps
      // its last known value until the next successful refresh.
    }
  }
}
