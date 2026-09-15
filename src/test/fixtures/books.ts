/**
 * Real response body captured from GET /v1/books/postnikov/ — the demo
 * API's shared, polluted collection: 3 well-formed seed books, one
 * candidate's book with no id, and one empty garbage record.
 */
export const REAL_BOOKS_PAYLOAD_FIXTURE: unknown[] = [
  { id: 111, name: "Wind in the willows", ownerId: "postnikov", author: "Kenneth Graeme" },
  { id: 121, name: "I, Robot", ownerId: "postnikov", author: "Isaac Asimov" },
  { id: 131, name: "The Hobbit", ownerId: "postnikov", author: "Jrr Tolkein" },
  { name: "Zog", author: "Julia Donaldson" },
  {},
];
