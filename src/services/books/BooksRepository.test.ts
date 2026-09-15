import { describe, expect, it } from "vitest";
import { BooksRepository } from "./BooksRepository";
import { FakeBooksGateway } from "../../test/fakes/FakeBooksGateway";
import { InvalidBooksResponseError } from "./booksMapper";
import { REAL_BOOKS_PAYLOAD_FIXTURE } from "../../test/fixtures/books";

describe("BooksRepository", () => {
  describe("list", () => {
    it("fetches and maps the all-books feed for filter 'all'", async () => {
      const gateway = new FakeBooksGateway();
      gateway.allResponse = REAL_BOOKS_PAYLOAD_FIXTURE;
      const repo = new BooksRepository(gateway);

      const books = await repo.list("opedchenko", "all");

      expect(books).toHaveLength(4);
      expect(books[0]).toEqual({ id: "111", name: "Wind in the willows", author: "Kenneth Graeme" });
    });

    it("fetches and maps the private-books feed for filter 'private'", async () => {
      const gateway = new FakeBooksGateway();
      gateway.privateResponse = [{ name: "Dune", author: "Frank Herbert" }];
      const repo = new BooksRepository(gateway);

      const books = await repo.list("opedchenko", "private");

      expect(books).toEqual([{ id: "pos:0:Dune", name: "Dune", author: "Frank Herbert" }]);
    });

    it("propagates a mapper error for a malformed response body", async () => {
      const gateway = new FakeBooksGateway();
      gateway.allResponse = null;
      const repo = new BooksRepository(gateway);

      await expect(repo.list("opedchenko", "all")).rejects.toBeInstanceOf(
        InvalidBooksResponseError,
      );
    });
  });

  describe("create", () => {
    it("sends a trimmed, mapped draft to the gateway", async () => {
      const gateway = new FakeBooksGateway();
      const repo = new BooksRepository(gateway);

      await repo.create("opedchenko", { name: "  Dune  ", author: "  Frank Herbert  " });

      expect(gateway.createCalls).toEqual([
        {
          userId: "opedchenko",
          payload: { name: "Dune", author: "Frank Herbert" },
          signal: undefined,
        },
      ]);
    });

    it("resolves without returning an entity, since the API never provides one", async () => {
      const gateway = new FakeBooksGateway();
      const repo = new BooksRepository(gateway);

      const result = await repo.create("opedchenko", { name: "Dune", author: "Frank Herbert" });

      expect(result).toBeUndefined();
    });
  });
});
