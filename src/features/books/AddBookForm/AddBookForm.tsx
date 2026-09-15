import { observer } from "mobx-react";
import { useController } from "../../../core/controller/useController";
import { useDi } from "../../../core/di/DiContext";
import { AddBookFormController } from "./AddBookFormController";
import { Input } from "../../../components/Input/Input";
import { Button } from "../../../components/Button/Button";
import { ErrorMessage } from "../../../components/ErrorMessage/ErrorMessage";
import styles from "./AddBookForm.module.css";

export const AddBookForm = observer(function AddBookForm() {
  const di = useDi();
  const vm = useController(
    () => new AddBookFormController(di.booksRepository, di.userStore, di.booksStore),
  );

  return (
    <form className={styles.form} onSubmit={vm.handleSubmit}>
      <Input
        id="book-name"
        label="Name"
        value={vm.name}
        errorMessage={vm.nameErrorMessage}
        onChange={vm.setName}
        onBlur={vm.touchName}
      />
      <Input
        id="book-author"
        label="Author"
        value={vm.author}
        errorMessage={vm.authorErrorMessage}
        onChange={vm.setAuthor}
        onBlur={vm.touchAuthor}
      />
      {vm.submitError && <ErrorMessage>{vm.submitError}</ErrorMessage>}
      <div className={styles.actions}>
        <Button type="submit" disabled={vm.isSubmitDisabled}>
          {vm.submitLabel}
        </Button>
        <Button type="button" onClick={vm.reset}>
          Clear
        </Button>
      </div>
    </form>
  );
});
