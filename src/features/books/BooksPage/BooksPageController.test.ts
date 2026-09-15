import { describe, expect, it } from "vitest";
import { reaction } from "mobx";
import { BooksPageController } from "./BooksPageController";
import { FakeBooksRepository } from "../../../test/fakes/FakeBooksRepository";
import { UserStore } from "../../../stores/UserStore";
import { BooksStore } from "../../../stores/BooksStore";
import { HttpError } from "../../../core/http/HttpError";
import type { Book } from "../../../domain/books/Book";

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function setUp() {
  const repo = new FakeBooksRepository();
  const userStore = new UserStore("opedchenko");
  const booksStore = new BooksStore();
  const controller = new BooksPageController(repo, userStore, booksStore);
  return { repo, userStore, booksStore, controller };
}

const dune: Book = { id: "1", name: "Dune", author: "Frank Herbert" };

describe("BooksPageController", () => {
  describe("loading", () => {
    it("sets isLoading during the request and clears it on success", async () => {
      const { repo, controller } = setUp();

      controller.init();
      expect(controller.isLoading).toBe(true);

      repo.resolveNextList([dune]);
      await flush();

      expect(controller.isLoading).toBe(false);
    });

    it("clears isLoading on failure", async () => {
      const { repo, controller } = setUp();

      controller.init();
      repo.rejectNextList(new HttpError(500));
      await flush();

      expect(controller.isLoading).toBe(false);
    });

    it("issues exactly one request per load, against the current filter", () => {
      const { repo, controller } = setUp();

      controller.init();

      expect(repo.listCalls).toHaveLength(1);
      expect(repo.listCalls[0]).toMatchObject({ userId: "opedchenko", filter: "all" });
    });

    it("commits loaded books to the store and exposes them through items", async () => {
      const { repo, controller } = setUp();

      controller.init();
      repo.resolveNextList([dune]);
      await flush();

      expect(controller.items).toEqual([{ id: "1", title: "Frank Herbert: Dune" }]);
    });

    it("exposes isEmpty only once loaded, successful, and empty", async () => {
      const { repo, controller } = setUp();

      expect(controller.isEmpty).toBe(false); // not yet loaded
      controller.init();
      expect(controller.isEmpty).toBe(false); // loading

      repo.resolveNextList([]);
      await flush();

      expect(controller.isEmpty).toBe(true);
      expect(controller.showList).toBe(false);
    });

    it("shows the list once loaded, successful, and non-empty", async () => {
      const { repo, controller } = setUp();

      controller.init();
      repo.resolveNextList([dune]);
      await flush();

      expect(controller.showList).toBe(true);
      expect(controller.isEmpty).toBe(false);
    });
  });

  describe("errors", () => {
    it("maps a thrown gateway error to a user-facing message", async () => {
      const { repo, controller } = setUp();

      controller.init();
      repo.rejectNextList(new HttpError(500));
      await flush();

      expect(controller.error).toBe("The server rejected the request (status 500). Please try again.");
      expect(controller.isLoading).toBe(false);
    });

    it("retry() re-issues the request and can recover from the error", async () => {
      const { repo, controller } = setUp();

      controller.init(); // listCalls[0]
      repo.rejectNextList(new HttpError(500));
      await flush();
      expect(controller.error).not.toBeNull();

      controller.retry(); // listCalls[1]
      expect(controller.isLoading).toBe(true);

      repo.listCalls[1]?.resolve([dune]);
      await flush();

      expect(controller.error).toBeNull();
      expect(controller.items).toEqual([{ id: "1", title: "Frank Herbert: Dune" }]);
    });
  });

  describe("filter switching", () => {
    it("selectFilter('private') updates filter and loads the private source", () => {
      const { repo, controller } = setUp();
      controller.init();
      repo.resolveNextList([]);

      controller.selectFilter("private");

      expect(controller.filter).toBe("private");
      expect(repo.listCalls[1]).toMatchObject({ filter: "private" });
    });

    it("selecting the same filter twice does not trigger a duplicate load", () => {
      const { repo, controller } = setUp();
      controller.init();
      repo.resolveNextList([]);
      const callCountAfterInit = repo.listCalls.length;

      controller.selectFilter("private");
      const callCountAfterFirstSelect = repo.listCalls.length;
      controller.selectFilter("private");
      const callCountAfterSecondSelect = repo.listCalls.length;

      expect(callCountAfterFirstSelect).toBe(callCountAfterInit + 1);
      expect(callCountAfterSecondSelect).toBe(callCountAfterFirstSelect);
    });

    it("ignores a superseded response when loads overlap (last-wins)", async () => {
      const { repo, booksStore, controller } = setUp();

      controller.init(); // listCalls[0]: "all"
      controller.selectFilter("private"); // listCalls[1]: "private"

      const stale = repo.listCalls[0];
      const fresh = repo.listCalls[1];

      // The stale "all" load resolves late, after being superseded.
      stale?.resolve([{ id: "stale", name: "Stale", author: "Old Author" }]);
      await flush();

      expect(booksStore.books).toEqual([]);
      expect(booksStore.privateBooks).toEqual([]);
      expect(controller.isLoading).toBe(true); // still waiting on the current load

      fresh?.resolve([dune]);
      await flush();

      expect(booksStore.privateBooks).toEqual([dune]);
      expect(controller.isLoading).toBe(false);
    });
  });

  describe("reacting to BooksStore.booksRevision", () => {
    it("does not fire on initial setup (fireImmediately is false)", () => {
      const { repo, controller } = setUp();

      controller.init();

      expect(repo.listCalls).toHaveLength(1); // just the startup load, nothing extra
    });

    it("reloads the current filter when the revision is bumped, e.g. after a create", async () => {
      const { repo, booksStore, controller } = setUp();
      controller.init();
      repo.resolveNextList([dune]);
      await flush();

      booksStore.bumpBooksRevision();

      expect(repo.listCalls).toHaveLength(2);
      expect(repo.listCalls[1]).toMatchObject({ filter: "all" });
      repo.listCalls[1]?.resolve([dune, { id: "2", name: "Dune Messiah", author: "Frank Herbert" }]);
      await flush();

      expect(controller.items).toHaveLength(2);
    });

    it("triggers no refetch when the revision is bumped after dispose()", () => {
      const { repo, booksStore, controller } = setUp();
      controller.init();
      repo.resolveNextList([]);

      controller.dispose();
      const callCountAfterDispose = repo.listCalls.length;

      booksStore.bumpBooksRevision();

      expect(repo.listCalls).toHaveLength(callCountAfterDispose);
    });
  });

  describe("disposal", () => {
    it("aborts the in-flight request on dispose()", () => {
      const { repo, controller } = setUp();
      controller.init();

      controller.dispose();

      expect(repo.listCalls[0]?.signal?.aborted).toBe(true);
    });

    it("does not let a late resolution mutate state after dispose()", async () => {
      const { repo, booksStore, controller } = setUp();
      controller.init();
      controller.dispose();

      repo.resolveNextList([dune]);
      await flush();

      expect(booksStore.books).toEqual([]);
    });

    it("recovers from a StrictMode-style dispose() immediately followed by init()", async () => {
      const { repo, booksStore, controller } = setUp();

      controller.init(); // mount
      controller.dispose(); // cleanup (StrictMode dev double-invoke)
      controller.init(); // the real, retained mount

      // The first, cleaned-up load resolving late must still be discarded...
      repo.listCalls[0]?.resolve([{ id: "stale", name: "Stale", author: "Old" }]);
      // ...but the second (real) load must be able to commit normally.
      repo.listCalls[1]?.resolve([dune]);
      await flush();

      expect(booksStore.books).toEqual([dune]);
      expect(controller.isLoading).toBe(false);
    });
  });

  describe("render hygiene", () => {
    it("commits a completed load as a single observable transition", async () => {
      const { repo, controller } = setUp();
      let reactionCount = 0;
      const stopReaction = reaction(
        () => [controller.isLoading, controller.items.length],
        () => {
          reactionCount += 1;
        },
      );

      controller.init(); // fires the loading-start transition synchronously
      reactionCount = 0;

      repo.resolveNextList([dune]);
      await flush();

      expect(reactionCount).toBe(1);
      stopReaction();
    });
  });
});
