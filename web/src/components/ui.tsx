import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cs } from '../i18n/cs';
import { Icon } from './Icon';
import styles from './ui.module.css';

export { styles as ui };

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
}

export function Field({ label, hint, error, className, ...input }: FieldProps) {
  const id = useId();
  const noteId = hint || error ? `${id}-note` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={`${styles.input} ${className ?? ''}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={noteId}
        {...input}
      />
      {error ? (
        <span id={noteId} className={styles.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={noteId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
}

export function TextAreaField({ label, className, ...textarea }: TextAreaFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea id={id} className={`${styles.textarea} ${className ?? ''}`} {...textarea} />
    </div>
  );
}

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** A modal on top of the native dialog, which brings focus trapping and Esc for free. */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      {open && (
        <>
          <div className={styles.dialogHead}>
            <h2 id={titleId} className={styles.dialogTitle}>
              {title}
            </h2>
            <button type="button" className={styles.iconButton} aria-label={cs.common.close} onClick={onClose}>
              <Icon name="close" size={18} strokeWidth={2} />
            </button>
          </div>
          <div className={styles.dialogBody}>{children}</div>
        </>
      )}
    </dialog>
  );
}
