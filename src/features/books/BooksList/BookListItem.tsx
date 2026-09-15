import { memo } from "react";
import styles from "./BooksList.module.css";

export interface BookListItemProps {
  title: string;
}

// Plain React.memo, not mobx-react's observer(): this component reads no
// MobX observable directly (title is an already-resolved plain string), so
// observer() would be the wrong tool — it warned at runtime ("created/
// updated without reading any observable value") because there was nothing
// for it to track. memo() gives the same per-item bail-out (skip re-render
// when title/id are shallow-equal) without the pointless MobX wrapper.
export const BookListItem = memo(function BookListItem({ title }: BookListItemProps) {
  return <li className={styles.item}>{title}</li>;
});
