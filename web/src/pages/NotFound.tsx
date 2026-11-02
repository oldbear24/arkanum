import { Link } from 'react-router-dom';
import { ui } from '../components/ui';
import { cs } from '../i18n/cs';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <main className={styles.main}>
      <p className={styles.mark} aria-hidden="true">
        XIII
      </p>
      <h1 className={styles.title}>{cs.notFound.title}</h1>
      <p className={styles.text}>{cs.notFound.text}</p>
      <Link to="/" className={ui.primary}>
        {cs.notFound.back}
      </Link>
    </main>
  );
}
