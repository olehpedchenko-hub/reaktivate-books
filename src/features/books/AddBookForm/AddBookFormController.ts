import { makeAutoObservable, runInAction } from "mobx";
import type { Controller } from "../../../core/controller/Controller";
import { RequestAbortedError } from "../../../core/http/RequestAbortedError";
import { toErrorMessage } from "../../../services/books/errorMessage";
import type { IBooksRepository } from "../../../services/books/BooksRepository";
import type { UserStore } from "../../../stores/UserStore";
import type { BooksStore } from "../../../stores/BooksStore";

const MAX_FIELD_LENGTH = 200;

export class AddBookFormController implements Controller {
  name = "";
  author = "";
  isSubmitting = false;
  submitError: string | null = null;

  private nameTouched = false;
  private authorTouched = false;
  private submitAttempted = false;
  private abortController: AbortController | null = null;
  private isDisposed = false;

  constructor(
    private readonly repo: IBooksRepository,
    private readonly userStore: UserStore,
    private readonly booksStore: BooksStore,
  ) {
    // abortController/isDisposed are internal bookkeeping, never read by a
    // view or a computed — annotating them out keeps MobX from wrapping
    // them in reactivity machinery that nothing observes.
    makeAutoObservable<this, "abortController" | "isDisposed">(
      this,
      { abortController: false, isDisposed: false },
      { autoBind: true },
    );
  }

  // No init(): nothing here auto-starts on mount, so there's no StrictMode
  // double-invoke hazard to guard against and nothing to reset on re-entry.
  // dispose() aborting a submit in flight is a genuine one-way transition —
  // the component is gone, and a real remount would construct a fresh
  // instance rather than reuse this one.
  dispose(): void {
    this.isDisposed = true;
    this.abortController?.abort();
  }

  get nameErrorMessage(): string | null {
    if (!this.nameTouched && !this.submitAttempted) {
      return null;
    }
    return validateField(this.name, "Name");
  }

  get authorErrorMessage(): string | null {
    if (!this.authorTouched && !this.submitAttempted) {
      return null;
    }
    return validateField(this.author, "Author");
  }

  get canSubmit(): boolean {
    return (
      !this.isSubmitting &&
      validateField(this.name, "Name") === null &&
      validateField(this.author, "Author") === null
    );
  }

  /** Pre-negated for the view: a template should never need `!vm.canSubmit`. */
  get isSubmitDisabled(): boolean {
    return !this.canSubmit;
  }

  get submitLabel(): string {
    return this.isSubmitting ? "Adding…" : "Add book";
  }

  setName(value: string): void {
    this.name = value;
    this.submitError = null; // a stale failure message shouldn't sit under input the user has since changed
  }

  setAuthor(value: string): void {
    this.author = value;
    this.submitError = null;
  }

  touchName(): void {
    this.nameTouched = true;
  }

  touchAuthor(): void {
    this.authorTouched = true;
  }

  /** Clears the form back to its initial state — used on create success and for a view's cancel/close action. */
  reset(): void {
    this.name = "";
    this.author = "";
    this.nameTouched = false;
    this.authorTouched = false;
    this.submitAttempted = false;
    this.submitError = null;
  }

  /** For <form onSubmit={vm.handleSubmit}> — takes only what it needs, not a React event type. */
  handleSubmit(event: { preventDefault(): void }): void {
    event.preventDefault();
    void this.submit();
  }

  async submit(): Promise<void> {
    this.submitAttempted = true;
    if (!this.canSubmit) {
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    // No abort of a "previous" controller here: submits are serialized by
    // canSubmit's !isSubmitting check (and this method's own guard above),
    // so there is never a genuinely in-flight prior request to cancel.
    const abortController = new AbortController();
    this.abortController = abortController;

    const draft = { name: this.name.trim(), author: this.author.trim() };

    try {
      await this.repo.create(this.userStore.userId, draft, abortController.signal);

      if (this.isDisposed) {
        return;
      }
      runInAction(() => {
        // Fire-and-forget: whoever cares (the page list, the header count)
        // refetches on its own schedule via its own reaction. This form's
        // own completion is not gated on that.
        this.booksStore.bumpBooksRevision();
        this.isSubmitting = false;
        this.reset();
      });
    } catch (error) {
      if (this.isDisposed || error instanceof RequestAbortedError) {
        return;
      }
      runInAction(() => {
        this.isSubmitting = false;
        this.submitError = toErrorMessage(error);
      });
    }
  }
}

function validateField(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return `${label} is required`;
  }
  if (trimmed.length > MAX_FIELD_LENGTH) {
    return `${label} must be ${MAX_FIELD_LENGTH} characters or fewer`;
  }
  return null;
}
