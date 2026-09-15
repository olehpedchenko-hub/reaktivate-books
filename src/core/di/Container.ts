import { HttpClient } from "../http/HttpClient";
import { BooksGateway } from "../../services/books/BooksGateway";
import { BooksRepository } from "../../services/books/BooksRepository";
import type { IBooksRepository } from "../../services/books/BooksRepository";
import { UserStore } from "../../stores/UserStore";
import { BooksStore } from "../../stores/BooksStore";

export interface Container {
  userStore: UserStore;
  booksStore: BooksStore;
  booksRepository: IBooksRepository;
}

/** Builds the app's object graph once. Local (per-component) controllers are not built here — see useController. */
export function createContainer(): Container {
  const httpClient = new HttpClient(import.meta.env.VITE_API_BASE_URL);
  const userStore = new UserStore(import.meta.env.VITE_USER_ID);
  const booksStore = new BooksStore();
  const booksGateway = new BooksGateway(httpClient);
  const booksRepository = new BooksRepository(booksGateway);

  return { userStore, booksStore, booksRepository };
}
