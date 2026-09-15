import { describe, expect, it } from "vitest";
import { reaction } from "mobx";
import { AppHeaderController } from "./AppHeaderController";
import { FakeBooksRepository } from "../../test/fakes/FakeBooksRepository";
import { UserStore } from "../../stores/UserStore";
import { BooksStore } from "../../stores/BooksStore";
import type { Book } from "../../domain/books/Book";

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function setUp() {
  const repo = new FakeBooksRepository();
  const userStore = new UserStore("opedchenko");
  const booksStore = new BooksStore();
  const controller = new AppHeaderController(repo, userStore, booksStore);
  return { repo, userStore, booksStore, controller };
}

const dune: Book = { id: "1", name: "Dune", author: "Frank Herbert" };

describe("AppHeaderController", () => {
  it("formats the current count", () => {
    const { controller } = setUp();

    expect(controller.counterLabel).toBe("Your books: 0");
  });

  it("loads the private feed once on init and commits it to the store", () => {
    const { repo, controller } = setUp();

    controller.init();

    expect(repo.listCalls).toHaveLength(1);
    expect(repo.listCalls[0]).toMatchObject({ userId: "opedchenko", filter: "private" });
  });

  it("updates the label reactively when the store's private books change", async () => {
    const { repo, booksStore, controller } = setUp();
    controller.init();

    const labels: string[] = [];
    const stopReaction = reaction(
      () => controller.counterLabel,
      (label) => labels.push(label),
    );

    repo.resolveNextList([dune]);
    await flush();

    expect(controller.counterLabel).toBe("Your books: 1");
    expect(labels).toEqual(["Your books: 1"]);

    booksStore.setPrivateBooks([dune, { id: "2", name: "Dune Messiah", author: "Frank Herbert" }]);
    expect(controller.counterLabel).toBe("Your books: 2");

    stopReaction();
  });

  describe("reacting to BooksStore.booksRevision", () => {
    it("does not fire on initial setup (fireImmediately is false)", () => {
      const { repo, controller } = setUp();

      controller.init();

      expect(repo.listCalls).toHaveLength(1); // just the startup load, nothing extra
    });

    it("refetches the private feed when the revision is bumped, e.g. after a create", async () => {
      const { repo, booksStore, controller } = setUp();
      controller.init();
      repo.resolveNextList([]);
      await flush();
      expect(booksStore.privateCount).toBe(0);

      booksStore.bumpBooksRevision();

      expect(repo.listCalls).toHaveLength(2);
      repo.listCalls[1]?.resolve([dune]);
      await flush();

      expect(booksStore.privateCount).toBe(1);
    });

    it("ignores a superseded response when a bump overlaps the initial load", async () => {
      const { repo, booksStore, controller } = setUp();

      controller.init(); // listCalls[0]
      booksStore.bumpBooksRevision(); // listCalls[1], supersedes listCalls[0]

      repo.listCalls[0]?.resolve([{ id: "stale", name: "Stale", author: "Old" }]);
      await flush();
      expect(booksStore.privateBooks).toEqual([]);

      repo.listCalls[1]?.resolve([dune]);
      await flush();
      expect(booksStore.privateBooks).toEqual([dune]);
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

    it("does not let a late resolution mutate the store after dispose()", async () => {
      const { repo, booksStore, controller } = setUp();
      controller.init();
      controller.dispose();

      repo.resolveNextList([dune]);
      await flush();

      expect(booksStore.privateBooks).toEqual([]);
    });

    it("recovers from a StrictMode-style dispose() immediately followed by init()", async () => {
      const { repo, booksStore, controller } = setUp();

      controller.init();
      controller.dispose();
      controller.init();

      repo.listCalls[0]?.resolve([{ id: "stale", name: "Stale", author: "Old" }]);
      repo.listCalls[1]?.resolve([dune]);
      await flush();

      expect(booksStore.privateBooks).toEqual([dune]);
    });
  });
});
