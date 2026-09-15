/**
 * Wire shape for GET /v1/books/{user}/ and GET /v1/books/{user}/private.
 * Swagger (https://tdd.demo.reaktivate.com/api-docs/) types the response body
 * as an untyped `object`; this reflects what the live API actually returns,
 * confirmed by direct probing. Records also carry an `ownerId` in practice,
 * but it isn't declared here: nothing in this app reads it, because privacy
 * is determined by which endpoint returned the record (`/` vs `/private`),
 * not by a field on it.
 */
export interface BookDto {
  id?: number;
  name?: string;
  author?: string;
}

/** Body for POST /v1/books/{user}/. */
export interface CreateBookDto {
  name: string;
  author: string;
}

/** The API never returns the created entity, only a status envelope. */
export interface CreateBookResponseDto {
  status: string;
}
