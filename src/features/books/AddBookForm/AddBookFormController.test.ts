import { describe, expect, it } from "vitest";
import { AddBookFormController } from "./AddBookFormController";
import { FakeBooksRepository } from "../../../test/fakes/FakeBooksRepository";
import { UserStore } from "../../../stores/UserStore";
import { BooksStore } from "../../../stores/BooksStore";
import { HttpError } from "../../../core/http/HttpError";

function setUp() {
  const repo = new FakeBooksRepository();
  const userStore = new UserStore("opedchenko");
  const booksStore = new BooksStore();
  const controller = new AddBookFormController(repo, userStore, booksStore);
  return { repo, userStore, booksStore, controller };
}

describe("AddBookFormController", () => {
  describe("validation", () => {
    it("canSubmit is false when name is empty", () => {
      const { controller } = setUp();
      controller.setAuthor("Frank Herbert");

      expect(controller.canSubmit).toBe(false);
    });

    it("canSubmit is false when author is whitespace-only", () => {
      const { controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("   ");

      expect(controller.canSubmit).toBe(false);
    });

    it("canSubmit is false when a field exceeds the max length", () => {
      const { controller } = setUp();
      controller.setName("x".repeat(201));
      controller.setAuthor("Frank Herbert");

      expect(controller.canSubmit).toBe(false);
    });

    it("canSubmit is true for a valid, trimmable draft", () => {
      const { controller } = setUp();
      controller.setName("  Dune  ");
      controller.setAuthor("  Frank Herbert  ");

      expect(controller.canSubmit).toBe(true);
    });

    it("isSubmitDisabled mirrors the negation of canSubmit", () => {
      const { controller } = setUp();

      expect(controller.isSubmitDisabled).toBe(true);
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");
      expect(controller.isSubmitDisabled).toBe(false);
    });

    it("submitLabel reflects isSubmitting", async () => {
      const { repo, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");
      expect(controller.submitLabel).toBe("Add book");

      const submitPromise = controller.submit();
      expect(controller.submitLabel).toBe("Adding…");

      repo.resolveNextCreate();
      await submitPromise;
      expect(controller.submitLabel).toBe("Add book");
    });

    it("shows no error message before the field is touched or a submit attempted", () => {
      const { controller } = setUp();

      expect(controller.nameErrorMessage).toBeNull();
      expect(controller.authorErrorMessage).toBeNull();
    });

    it("shows an error for a field once it is touched, but not its untouched sibling", () => {
      const { controller } = setUp();

      controller.touchName();

      expect(controller.nameErrorMessage).toBe("Name is required");
      expect(controller.authorErrorMessage).toBeNull();
    });

    it("shows errors for every invalid field after a submit attempt, even untouched ones", () => {
      const { controller } = setUp();

      void controller.submit(); // both fields empty; canSubmit false, returns before any request

      expect(controller.nameErrorMessage).toBe("Name is required");
      expect(controller.authorErrorMessage).toBe("Author is required");
    });
  });

  describe("submit — success", () => {
    it("calls the repository with a trimmed draft", async () => {
      const { repo, controller } = setUp();
      controller.setName("  Dune  ");
      controller.setAuthor("  Frank Herbert  ");

      const submitPromise = controller.submit();
      repo.resolveNextCreate();
      await submitPromise;

      expect(repo.createCalls[0]).toMatchObject({
        userId: "opedchenko",
        draft: { name: "Dune", author: "Frank Herbert" },
      });
    });

    it("bumps booksStore.booksRevision exactly once", async () => {
      const { repo, booksStore, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      const submitPromise = controller.submit();
      repo.resolveNextCreate();
      await submitPromise;

      expect(booksStore.booksRevision).toBe(1);
    });

    it("resets the form after success", async () => {
      const { repo, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      const submitPromise = controller.submit();
      repo.resolveNextCreate();
      await submitPromise;

      expect(controller.name).toBe("");
      expect(controller.author).toBe("");
      expect(controller.isSubmitting).toBe(false);
      expect(controller.submitError).toBeNull();
      // Reset also un-touches the fields, so a later empty form doesn't
      // immediately show stale-looking validation errors.
      expect(controller.nameErrorMessage).toBeNull();
    });
  });

  describe("submit — failure", () => {
    it("keeps the input and exposes a message derived from the shared HttpError mapping", async () => {
      const { repo, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      const submitPromise = controller.submit();
      repo.rejectNextCreate(new HttpError(500));
      await submitPromise;

      expect(controller.name).toBe("Dune");
      expect(controller.author).toBe("Frank Herbert");
      expect(controller.submitError).toBe(
        "The server rejected the request (status 500). Please try again.",
      );
      expect(controller.isSubmitting).toBe(false);
    });

    it("does not bump the revision on failure", async () => {
      const { repo, booksStore, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      const submitPromise = controller.submit();
      repo.rejectNextCreate(new HttpError(500));
      await submitPromise;

      expect(booksStore.booksRevision).toBe(0);
    });

    it("never produces load-path wording for a create failure", async () => {
      const { repo, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      const submitPromise = controller.submit();
      repo.rejectNextCreate(new Error("unmapped failure"));
      await submitPromise;

      expect(controller.submitError).not.toMatch(/load|loading/i);
    });

    it("clears submitError as soon as the user edits either field", async () => {
      const { repo, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");
      const submitPromise = controller.submit();
      repo.rejectNextCreate(new HttpError(500));
      await submitPromise;
      expect(controller.submitError).not.toBeNull();

      controller.setName("Dune 2");
      expect(controller.submitError).toBeNull();
    });
  });

  describe("reset()", () => {
    it("clears the form, independent of submit() — e.g. for a view's cancel/close action", () => {
      const { controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");
      controller.touchName();
      controller.touchAuthor();

      controller.reset();

      expect(controller.name).toBe("");
      expect(controller.author).toBe("");
      expect(controller.nameErrorMessage).toBeNull();
      expect(controller.authorErrorMessage).toBeNull();
      expect(controller.submitError).toBeNull();
    });
  });

  describe("double-submit guard", () => {
    it("ignores a second submit while the first is still in flight", () => {
      const { repo, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      void controller.submit();
      void controller.submit();

      expect(repo.createCalls).toHaveLength(1);
    });
  });

  describe("disposal", () => {
    it("aborts the in-flight request on dispose()", () => {
      const { repo, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      void controller.submit();
      controller.dispose();

      expect(repo.createCalls[0]?.signal?.aborted).toBe(true);
    });

    it("commits nothing when a submit resolves after dispose()", async () => {
      const { repo, booksStore, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      const submitPromise = controller.submit();
      controller.dispose();
      repo.resolveNextCreate();
      await submitPromise;

      expect(controller.name).toBe("Dune"); // not reset
      expect(controller.isSubmitting).toBe(true); // never flipped back
      expect(booksStore.booksRevision).toBe(0); // never bumped
    });

    it("does not surface an error when a submit rejects after dispose()", async () => {
      const { repo, controller } = setUp();
      controller.setName("Dune");
      controller.setAuthor("Frank Herbert");

      const submitPromise = controller.submit();
      controller.dispose();
      repo.rejectNextCreate(new HttpError(500));
      await submitPromise;

      expect(controller.submitError).toBeNull();
    });
  });
});
