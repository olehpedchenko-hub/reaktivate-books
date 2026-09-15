import { RadioGroup } from "../../../components/RadioGroup/RadioGroup";
import type { FilterOptionVm } from "../BooksPage/BooksPageController";
import type { BooksFilter } from "../../../domain/books/BooksFilter";
import styles from "./BooksFilterSwitch.module.css";

export interface BooksFilterSwitchProps {
  options: FilterOptionVm[];
  onSelect: (value: BooksFilter) => void;
}

// This is the fixed boundary where the domain type BooksFilter meets the
// generic RadioGroup<T> — it's what lets BooksPage pass vm.selectFilter
// straight through untyped, instead of every call site instantiating
// RadioGroup<BooksFilter> and repeating the wrapper styling. If a second
// caller never materializes, that's a sign to inline this back into
// BooksPage and delete the file.
export function BooksFilterSwitch({ options, onSelect }: BooksFilterSwitchProps) {
  return (
    <div className={styles.switch}>
      <RadioGroup<BooksFilter> name="books-filter" options={options} onSelect={onSelect} />
    </div>
  );
}
