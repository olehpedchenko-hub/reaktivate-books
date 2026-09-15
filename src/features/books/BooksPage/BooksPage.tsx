import { observer } from "mobx-react";
import { useController } from "../../../core/controller/useController";
import { useDi } from "../../../core/di/DiContext";
import { BooksPageController } from "./BooksPageController";
import { BooksFilterSwitch } from "../BooksFilterSwitch/BooksFilterSwitch";
import { BooksList } from "../BooksList/BooksList";
import { AddBookForm } from "../AddBookForm/AddBookForm";
import { Spinner } from "../../../components/Spinner/Spinner";
import { ErrorMessage } from "../../../components/ErrorMessage/ErrorMessage";
import { Button } from "../../../components/Button/Button";
import styles from "./BooksPage.module.css";

export const BooksPage = observer(function BooksPage() {
  const di = useDi();
  const vm = useController(
    () => new BooksPageController(di.booksRepository, di.userStore, di.booksStore),
  );

  return (
    <main className={styles.page}>
      <BooksFilterSwitch options={vm.filterOptions} onSelect={vm.selectFilter} />
      <AddBookForm />
      {vm.isLoading && <Spinner />}
      {vm.error && (
        <div className={styles.errorState}>
          <ErrorMessage>{vm.error}</ErrorMessage>
          <Button onClick={vm.retry}>Retry</Button>
        </div>
      )}
      {vm.isEmpty && <p className={styles.empty}>No books yet.</p>}
      {vm.showList && <BooksList items={vm.items} />}
    </main>
  );
});
