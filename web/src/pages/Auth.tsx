import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card3D } from '../card/Card3D';
import { DiscordMark } from '../components/Icon';
import { Field, ui } from '../components/ui';
import { cs } from '../i18n/cs';
import { safeNext, signInPath, signOut, useUser } from '../lib/auth';
import { fieldErrors, type FieldErrors } from '../lib/errors';
import { users } from '../lib/pb';
import styles from './Auth.module.css';

function AuthLayout({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <main className={styles.main}>
      <div className={styles.panel}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {lead && <p className={styles.lead}>{lead}</p>}
        </div>
        {children}
      </div>
      <aside className={styles.aside} aria-hidden="true">
        <div className={styles.asideFan}>
          <div className={styles.asideLeft}>
            <Card3D variant="tarot" art="slunce" palette="krev" frame="deco" foil="zlata" interactive="none" />
          </div>
          <div className={styles.asideRight}>
            <Card3D variant="tarot" art="hvezda" palette="pulnoc" frame="secese" foil="duha" foilI={80} />
          </div>
        </div>
        <p className={styles.asideTitle}>{cs.auth.asideTitle}</p>
        <p className={styles.asideText}>{cs.auth.asideText}</p>
      </aside>
    </main>
  );
}

function OAuthButtons({ next }: { next: string }) {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<{ name: string; displayName: string }[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    users()
      .listAuthMethods()
      .then((methods) => {
        if (active && methods.oauth2?.enabled) setProviders(methods.oauth2.providers);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (providers.length === 0) return null;

  const signIn = async (provider: string) => {
    setFailed(false);
    try {
      await users().authWithOAuth2({ provider });
      navigate(next, { replace: true });
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className={styles.oauth}>
      <p className={styles.oauthLabel}>{cs.auth.orContinue}</p>
      <div className={styles.oauthButtons}>
        {providers.map((provider) => (
          <button key={provider.name} type="button" className={ui.outline} onClick={() => void signIn(provider.name)}>
            {provider.name === 'discord' && <DiscordMark />}
            {provider.displayName}
          </button>
        ))}
      </div>
      {failed && (
        <p className={ui.error} role="alert">
          {cs.auth.oauthFailed}
        </p>
      )}
    </div>
  );
}

export function SignIn() {
  const user = useUser();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (user && !busy) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      await users().authWithPassword(email, password);
      navigate(next, { replace: true });
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={cs.auth.signInTitle} lead={cs.auth.signInLead}>
      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        {failed && (
          <p className={ui.alert} role="alert">
            {cs.auth.wrongCredentials}
          </p>
        )}
        <Field label={cs.auth.email} type="email" name="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label={cs.auth.password} type="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className={ui.primaryMedium} disabled={busy}>
          {busy ? cs.auth.signingIn : cs.auth.signInSubmit}
        </button>
      </form>
      <OAuthButtons next={next} />
      <div className={styles.links}>
        <Link to="/obnova-hesla">{cs.auth.forgotPassword}</Link>
        <span>
          {cs.auth.noAccount} <Link to={`/registrace${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`}>{cs.auth.toRegister}</Link>
        </span>
      </div>
    </AuthLayout>
  );
}

export function Register() {
  const user = useUser();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ handle: '', displayName: '', email: '', password: '', passwordConfirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (user && !busy) return <Navigate to={next} replace />;

  const bind = (key: keyof typeof form) => ({
    value: form[key],
    error: errors[key],
    onChange: (e: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: e.target.value })),
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.passwordConfirm) {
      setErrors({ passwordConfirm: cs.validation.passwordMismatch });
      return;
    }
    setBusy(true);
    setErrors({});
    setFailed(false);
    try {
      await users().create({ ...form, displayName: form.displayName.trim() || form.handle });
      await users().authWithPassword(form.email, form.password);
      // The account works even when e-mail delivery does not.
      users()
        .requestVerification(form.email)
        .catch(() => undefined);
      navigate(next, { replace: true });
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      setFailed(Object.keys(fields).length === 0);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={cs.auth.registerTitle} lead={cs.auth.registerLead}>
      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        {failed && (
          <p className={ui.alert} role="alert">
            {cs.common.somethingWrong}
          </p>
        )}
        <Field label={cs.auth.handle} hint={cs.auth.handleHint} name="handle" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-z0-9_]+" {...bind('handle')} />
        <Field label={cs.auth.displayName} name="displayName" autoComplete="name" maxLength={60} {...bind('displayName')} />
        <Field label={cs.auth.email} type="email" name="email" autoComplete="email" required {...bind('email')} />
        <Field label={cs.auth.password} hint={cs.auth.passwordHint} type="password" name="password" autoComplete="new-password" required minLength={8} {...bind('password')} />
        <Field label={cs.auth.passwordConfirm} type="password" name="passwordConfirm" autoComplete="new-password" required {...bind('passwordConfirm')} />
        <button type="submit" className={ui.primaryMedium} disabled={busy}>
          {busy ? cs.auth.registering : cs.auth.registerSubmit}
        </button>
      </form>
      <OAuthButtons next={next} />
      <div className={styles.links}>
        <span>
          {cs.auth.hasAccount} <Link to={signInPath(params.get('next') ? next : undefined)}>{cs.auth.toSignIn}</Link>
        </span>
      </div>
    </AuthLayout>
  );
}

export function RequestPasswordReset() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await users().requestPasswordReset(email);
    } catch {
      // The answer must not reveal whether the account exists.
    }
    setBusy(false);
    setSent(true);
  };

  return (
    <AuthLayout title={cs.auth.resetTitle} lead={cs.auth.resetLead}>
      {sent ? (
        <p className={ui.notice} role="status">
          {cs.auth.resetSent}
        </p>
      ) : (
        <form className={styles.form} onSubmit={(e) => void submit(e)}>
          <Field label={cs.auth.email} type="email" name="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className={ui.primaryMedium} disabled={busy}>
            {cs.auth.resetSubmit}
          </button>
        </form>
      )}
      <div className={styles.links}>
        <Link to="/prihlaseni">{cs.auth.backToSignIn}</Link>
      </div>
    </AuthLayout>
  );
}

export function ConfirmPasswordReset() {
  const { token = '' } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<'form' | 'busy' | 'done' | 'failed'>('form');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrors({ passwordConfirm: cs.validation.passwordMismatch });
      return;
    }
    setState('busy');
    setErrors({});
    try {
      await users().confirmPasswordReset(token, password, confirm);
      setState('done');
    } catch (error) {
      const fields = fieldErrors(error);
      if (fields.password || fields.passwordConfirm) {
        setErrors(fields);
        setState('form');
      } else {
        setState('failed');
      }
    }
  };

  return (
    <AuthLayout title={cs.auth.newPasswordTitle}>
      {state === 'done' && (
        <p className={ui.notice} role="status">
          {cs.auth.newPasswordDone}
        </p>
      )}
      {state === 'failed' && (
        <p className={ui.alert} role="alert">
          {cs.auth.newPasswordFailed}
        </p>
      )}
      {(state === 'form' || state === 'busy') && (
        <form className={styles.form} onSubmit={(e) => void submit(e)}>
          <Field label={cs.auth.newPassword} hint={cs.auth.passwordHint} type="password" autoComplete="new-password" required minLength={8} value={password} error={errors.password} onChange={(e) => setPassword(e.target.value)} />
          <Field label={cs.auth.passwordConfirm} type="password" autoComplete="new-password" required value={confirm} error={errors.passwordConfirm} onChange={(e) => setConfirm(e.target.value)} />
          <button type="submit" className={ui.primaryMedium} disabled={state === 'busy'}>
            {cs.auth.newPasswordSubmit}
          </button>
        </form>
      )}
      <div className={styles.links}>
        <Link to="/prihlaseni">{cs.auth.backToSignIn}</Link>
      </div>
    </AuthLayout>
  );
}

export function ConfirmVerification() {
  const { token = '' } = useParams();
  const [state, setState] = useState<'pending' | 'done' | 'failed'>('pending');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    users()
      .confirmVerification(token)
      .then(() => setState('done'))
      .catch(() => setState('failed'));
  }, [token]);

  return (
    <AuthLayout title={cs.auth.verifyTitle}>
      {state === 'pending' && <p className={ui.hint}>{cs.auth.verifyPending}</p>}
      {state === 'done' && (
        <p className={ui.notice} role="status">
          {cs.auth.verifyDone}
        </p>
      )}
      {state === 'failed' && (
        <p className={ui.alert} role="alert">
          {cs.auth.verifyFailed}
        </p>
      )}
      <div className={styles.links}>
        <Link to="/">{cs.auth.verifyContinue}</Link>
      </div>
    </AuthLayout>
  );
}

export function ConfirmEmailChange() {
  const { token = '' } = useParams();
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'form' | 'busy' | 'done' | 'failed'>('form');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState('busy');
    try {
      await users().confirmEmailChange(token, password);
      signOut();
      setState('done');
    } catch {
      setState('failed');
    }
  };

  return (
    <AuthLayout title={cs.auth.emailChangeTitle} lead={cs.auth.emailChangeLead}>
      {state === 'done' ? (
        <p className={ui.notice} role="status">
          {cs.auth.emailChangeDone}
        </p>
      ) : (
        <form className={styles.form} onSubmit={(e) => void submit(e)}>
          {state === 'failed' && (
            <p className={ui.alert} role="alert">
              {cs.auth.emailChangeFailed}
            </p>
          )}
          <Field label={cs.auth.password} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className={ui.primaryMedium} disabled={state === 'busy'}>
            {cs.auth.emailChangeSubmit}
          </button>
        </form>
      )}
      <div className={styles.links}>
        <Link to="/prihlaseni">{cs.auth.backToSignIn}</Link>
      </div>
    </AuthLayout>
  );
}
