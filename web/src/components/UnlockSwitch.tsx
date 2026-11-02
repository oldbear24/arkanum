import { usePrefersReducedMotion } from '../card/usePrefersReducedMotion';
import { cs } from '../i18n/cs';
import { Icon } from './Icon';
import styles from './UnlockSwitch.module.css';

const w = cs.workshop;

interface UnlockSwitchProps {
  on: boolean;
  onToggle: () => void;
  /** The look of the buttons around it. */
  className?: string;
  /** Only the lock, for where a label and a track do not fit. */
  iconOnly?: boolean;
}

/** Unlocks a card, so that it goes on turning after a flick. Without motion there is nothing to unlock. */
export function UnlockSwitch({ on, onToggle, className, iconOnly = false }: UnlockSwitchProps) {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return null;
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={w.unlockLabel} title={w.unlockHint} className={`${className ?? ''} ${styles.unlock}`} onClick={onToggle}>
      <Icon name={on ? 'unlock' : 'lock'} size={18} />
      {!iconOnly && (
        <>
          {w.unlock}
          <span aria-hidden="true" className={styles.track}>
            <span className={styles.knob} />
          </span>
        </>
      )}
    </button>
  );
}
