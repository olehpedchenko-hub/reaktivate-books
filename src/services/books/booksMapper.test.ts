import { describe, expect, it } from "vitest";
import { InvalidBooksResponseError, mapBooksResponse } from "./booksMapper";
import { REAL_BOOKS_PAYLOAD_FIXTURE } from "../../test/fixtures/books";

describe("mapBooksResponse", () => {
  it("maps a well-formed record to a Book with every field preserved", () => {
    const [books] = [mapBooksResponse([REAL_BOOKS_PAYLOAD_FIXTURE[0]])];

    expect(books).toEqual([{ id: "111", name: "Wind in the willows", author: "Kenneth Graeme" }]);
  });

  it("keeps a real numeric id of 0 (not mistaken for a missing id)", () => {
    const books = mapBooksResponse([{ id: 0, name: "Zero", author: "Someone" }]);

    expect(books).toEqual([{ id: "0", name: "Zero", author: "Someone" }]);
  });

  it("accepts a record with name and author but no id, keyed by position and name", () => {
    const zog = REAL_BOOKS_PAYLOAD_FIXTURE[3];

    const books = mapBooksResponse([zog]);

    expect(books).toEqual([{ id: "pos:0:Zog", name: "Zog", author: "Julia Donaldson" }]);
  });

  it("gives two id-less records with identical name and author different keys", () => {
    const entry = { name: "Zog", author: "Julia Donaldson" };

    const books = mapBooksResponse([entry, entry]);

    expect(books.map((b) => b.id)).toEqual(["pos:0:Zog", "pos:1:Zog"]);
  });

  it("rejects a completely empty record", () => {
    const books = mapBooksResponse([{}]);

    expect(books).toEqual([]);
  });

  it("rejects a record missing author", () => {
    const books = mapBooksResponse([{ name: "Zog" }]);

    expect(books).toEqual([]);
  });

  it("rejects a record whose author is empty after trimming", () => {
    const books = mapBooksResponse([{ name: "Zog", author: "   " }]);

    expect(books).toEqual([]);
  });

  it("trims whitespace from name and author", () => {
    const books = mapBooksResponse([{ name: "  Zog  ", author: "  Julia Donaldson  " }]);

    expect(books).toEqual([{ id: "pos:0:Zog", name: "Zog", author: "Julia Donaldson" }]);
  });

  it("maps a mixed array to only the valid records, in the original order", () => {
    const books = mapBooksResponse(REAL_BOOKS_PAYLOAD_FIXTURE);

    expect(books).toEqual([
      { id: "111", name: "Wind in the willows", author: "Kenneth Graeme" },
      { id: "121", name: "I, Robot", author: "Isaac Asimov" },
      { id: "131", name: "The Hobbit", author: "Jrr Tolkein" },
      { id: "pos:3:Zog", name: "Zog", author: "Julia Donaldson" },
    ]);
  });

  it("returns an empty list for an empty array", () => {
    expect(mapBooksResponse([])).toEqual([]);
  });

  it("throws InvalidBooksResponseError for a null response body", () => {
    expect(() => mapBooksResponse(null)).toThrow(InvalidBooksResponseError);
  });

  it("throws InvalidBooksResponseError for a non-array object response body", () => {
    expect(() => mapBooksResponse({ status: "ok" })).toThrow(InvalidBooksResponseError);
  });
});
