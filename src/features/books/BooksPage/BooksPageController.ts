import { makeAutoObservable, reaction, runInAction } from "mobx";
import type { Controller } from "../../../core/controller/Controller";
import { RequestAbortedError } from "../../../core/http/RequestAbortedError";
import { toErrorMessage } from "../../../services/books/errorMessage";
import type { IBooksRepository } from "../../../services/books/BooksRepository";
import type { UserStore } from "../../../stores/UserStore";
import type { BooksStore } from "../../../stores/BooksStore";
import type { BooksFilter } from "../../../domain/books/BooksFilter";

export interface BookItemVm {
  id: string;
  title: string;
}

export interface FilterOptionVm {
  value: BooksFilter;
  label: string;
  isSelected: boolean;
}

const FILTER_LABELS: Record<BooksFilter, string> = {
  all: "All books",
  private: "Private books",
};

export class BooksPageController implements Controller {
  isLoading = false;
  error: string | null = null;
  filter: BooksFilter = "all";
  private hasLoaded = false;

  private abortController: AbortController | null = null;
  private requestVersion = 0;
  private isDisposed = false;
  private stopRevisionReaction: (() => void) | null = null;

  constructor(
    private readonly repo: IBooksRepository,
    private readonly userStore: UserStore,
    private readonly booksStore: BooksStore,
  ) {
    // abortController/requestVersion/isDisposed/stopRevisionReaction are
    // internal bookkeeping, never read by a view or a computed — annotating
    // them out keeps MobX from wrapping them in reactivity machinery that
    // nothing observes.
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
    // React 18 StrictMode (dev only) double-invokes this effect: mount,
    // cleanup, mount again — on the same controller instance. dispose() (the
    // cleanup) sets isDisposed permanently, so it must be cleared here or
    // the second, real mount's load() would discard its own result forever.
    // A duplicate underlying fetch from the first, cleaned-up mount is
    // accepted (it's aborted immediately, and only happens in dev); what's
    // guarded is correctness — no stale or double commit to observable state.
    this.isDisposed = false;
    // fireImmediately stays false (the default): this must only fire on a
    // *subsequent* bump (a create elsewhere), not for the value the
    // revision counter already holds when this controller starts up — the
    // load() call right below already covers the initial fetch.
    this.stopRevisionReaction = reaction(
      () => this.booksStore.booksRevision,
      () => this.retry(),
    );
    void this.load();
  }

  dispose(): void {
    this.isDisposed = true;
    this.abortController?.abort();
    this.stopRevisionReaction?.();
    this.stopRevisionReaction = null;
  }

  get items(): BookItemVm[] {
    const source = this.filter === "private" ? this.booksStore.privateBooks : this.booksStore.books;
    return source.map((book) => ({ id: book.id, title: `${book.author}: ${book.name}` }));
  }

  get isEmpty(): boolean {
    return this.hasLoaded && !this.isLoading && !this.error && this.items.length === 0;
  }

  get showList(): boolean {
    return !this.isLoading && !this.error && this.items.length > 0;
  }

  get filterOptions(): FilterOptionVm[] {
    return (Object.keys(FILTER_LABELS) as BooksFilter[]).map((value) => ({
      value,
      label: FILTER_LABELS[value],
      isSelected: value === this.filter,
    }));
  }

  selectFilter(filter: BooksFilter): void {
    if (filter === this.filter) {
      return;
    }
    this.filter = filter;
    void this.load();
  }

  retry(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const version = ++this.requestVersion;
    this.abortController?.abort();
    const abortController = new AbortController();
    this.abortController = abortController;

    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const books = await this.repo.list(this.userStore.userId, this.filter, abortController.signal);

      if (this.isDisposed || version !== this.requestVersion) {
        return;
      }
      runInAction(() => {
        this.isLoading = false;
        this.hasLoaded = true;
        if (this.filter === "private") {
          this.booksStore.setPrivateBooks(books);
        } else {
          this.booksStore.setBooks(books);
        }
      });
    } catch (error) {
      if (this.isDisposed || version !== this.requestVersion || error instanceof RequestAbortedError) {
        return;
      }
      runInAction(() => {
        this.isLoading = false;
        this.error = toErrorMessage(error);
      });
    }
  }
}
