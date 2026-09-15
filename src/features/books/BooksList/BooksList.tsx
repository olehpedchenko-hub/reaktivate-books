import { BookListItem } from "./BookListItem";
import type { BookItemVm } from "../BooksPage/BooksPageController";
import styles from "./BooksList.module.css";

export interface BooksListProps {
  items: BookItemVm[];
}

export function BooksList({ items }: BooksListProps) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <BookListItem key={item.id} title={item.title} />
      ))}
    </ul>
  );
}
