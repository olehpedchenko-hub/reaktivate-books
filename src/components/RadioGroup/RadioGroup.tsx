import type { ReactNode } from "react";
import styles from "./RadioGroup.module.css";

export interface RadioGroupOption<T extends string> {
  value: T;
  label: ReactNode;
  isSelected: boolean;
}

export interface RadioGroupProps<T extends string> {
  name: string;
  options: RadioGroupOption<T>[];
  onSelect: (value: T) => void;
}

export function RadioGroup<T extends string>({ name, options, onSelect }: RadioGroupProps<T>) {
  return (
    <div className={styles.group} role="radiogroup">
      {options.map((option) => (
        <label key={option.value} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.isSelected}
            onChange={() => onSelect(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
