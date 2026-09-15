import styles from "./Input.module.css";

export interface InputProps {
  id: string;
  label: string;
  value: string;
  errorMessage: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function Input({ id, label, value, errorMessage, onChange, onBlur }: InputProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {errorMessage && (
        <span className={styles.error} role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
