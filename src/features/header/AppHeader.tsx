import { observer } from "mobx-react";
import { useController } from "../../core/controller/useController";
import { useDi } from "../../core/di/DiContext";
import { AppHeaderController } from "./AppHeaderController";
import styles from "./AppHeader.module.css";

export const AppHeader = observer(function AppHeader() {
  const di = useDi();
  const vm = useController(
    () => new AppHeaderController(di.booksRepository, di.userStore, di.booksStore),
  );

  return (
    <header className={styles.header}>
      <span className={styles.counter}>{vm.counterLabel}</span>
    </header>
  );
});
