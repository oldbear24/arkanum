import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cs } from '../i18n/cs';
import { profilePath, signInPath, signOut, useUser } from '../lib/auth';
import { avatarUrl, displayName } from '../lib/cards';
import { Icon, LogoMark } from './Icon';
import styles from './SiteLayout.module.css';
import { ui } from './ui';

function HeaderSearch({ onTemplates }: { onTemplates: boolean }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(Boolean(params.get('q')));
  const [value, setValue] = useState(params.get('q') ?? '');
  const input = useRef<HTMLInputElement>(null);

  const q = params.get('q') ?? '';
  useEffect(() => {
    setValue(q);
    if (q) setOpen(true);
  }, [q]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const label = onTemplates ? cs.header.searchTemplates : cs.header.searchCards;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = value.trim();
    const query = term ? `?q=${encodeURIComponent(term)}` : '';
    navigate(onTemplates ? `/sablony${query}` : `/${query}#galerie`);
  };

  const close = () => {
    setOpen(false);
    setValue('');
    if (q) navigate(onTemplates ? '/sablony' : '/');
  };

  if (!open) {
    return (
      <button type="button" className={styles.searchButton} aria-label={label} onClick={() => setOpen(true)}>
        <Icon name="search" strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <form role="search" className={styles.searchForm} onSubmit={submit}>
      <label htmlFor="site-search" className="sr-only">
        {label}
      </label>
      <Icon name="search" size={18} strokeWidth={1.8} />
      <input
        ref={input}
        id="site-search"
        type="search"
        className={styles.searchInput}
        placeholder={onTemplates ? cs.header.searchPlaceholderTemplates : cs.header.searchPlaceholderCards}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
      />
      <button type="button" className={styles.searchClose} aria-label={cs.header.closeSearch} onClick={close}>
        <Icon name="close" size={16} strokeWidth={2} />
      </button>
    </form>
  );
}

function AccountMenu() {
  const user = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (e: PointerEvent) => {
      if (!holder.current?.contains(e.target as Node)) setOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  if (!user) {
    return (
      <Link to={signInPath(location.pathname + location.search)} className={styles.account} aria-label={cs.header.signIn}>
        <Icon name="user" />
      </Link>
    );
  }

  const avatar = avatarUrl(user);
  return (
    <div className={styles.accountHolder} ref={holder}>
      <button type="button" className={styles.account} aria-label={cs.header.account} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}>
        {avatar ? <img src={avatar} alt="" className={styles.accountImage} /> : <span className={styles.accountInitial}>{displayName(user).charAt(0).toUpperCase()}</span>}
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <p className={styles.menuName}>@{user.handle}</p>
          <Link role="menuitem" className={styles.menuItem} to={profilePath(user.handle)} onClick={() => setOpen(false)}>
            {cs.header.myProfile}
          </Link>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => {
              setOpen(false);
              signOut();
              navigate('/');
            }}
          >
            {cs.header.signOut}
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const onTemplates = pathname.startsWith('/sablony');
  const navClass = ({ isActive }: { isActive: boolean }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link to="/" aria-label={cs.header.homeLabel} className={styles.logo}>
          <LogoMark />
          <span className={styles.logoText}>{cs.brand}</span>
        </Link>
        <nav aria-label={cs.header.navLabel} className={styles.nav}>
          <NavLink to="/" end className={navClass}>
            {cs.header.gallery}
          </NavLink>
          <NavLink to="/sablony" className={navClass}>
            {cs.header.templates}
          </NavLink>
          <NavLink to="/dilna" className={navClass}>
            {cs.header.workshop}
          </NavLink>
        </nav>
        <div className={styles.actions}>
          <HeaderSearch onTemplates={onTemplates} />
          {!onTemplates && (
            <Link to="/sablony" className={ui.primary}>
              <Icon name="plus" size={16} strokeWidth={2.2} />
              {cs.header.newCard}
            </Link>
          )}
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span className={styles.footerBrand}>{cs.brand}</span>
        <span>{cs.footer.note}</span>
      </div>
    </footer>
  );
}

/** The starry page with the shared header and footer. The editor has its own layout. */
export function SiteLayout() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash, pathname]);

  return (
    <div className={styles.page}>
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </div>
  );
}
