import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CardFace } from '../card/CardFace';
import tileStyles from '../components/CardTile.module.css';
import { CardTile } from '../components/CardTile';
import { Icon } from '../components/Icon';
import { Dialog, Field, ui } from '../components/ui';
import { cs } from '../i18n/cs';
import { profilePath, useUser } from '../lib/auth';
import { avatarUrl, displayName, recordToParams } from '../lib/cards';
import { fieldErrors, type FieldErrors } from '../lib/errors';
import { useLikes } from '../lib/likes';
import { cards, decks, isNotFound, pb, users, type DeckRecord, type UserRecord } from '../lib/pb';
import { usePagedCards } from '../lib/usePagedCards';
import { NotFound } from './NotFound';
import styles from './Profile.module.css';

const PAGE_SIZE = 24;

function Avatar({ user }: { user: UserRecord }) {
  const url = avatarUrl(user);
  return url ? (
    <img src={url} alt="" className={styles.avatar} />
  ) : (
    <span className={styles.avatar} aria-hidden="true">
      {displayName(user).charAt(0).toUpperCase()}
    </span>
  );
}

function EditProfile({ user, open, onClose, onSaved }: { user: UserRecord; open: boolean; onClose: () => void; onSaved: (user: UserRecord) => void }) {
  const [name, setName] = useState(user.displayName);
  const [handle, setHandle] = useState(user.handle);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFailed(false);
    const data = new FormData();
    data.set('displayName', name);
    data.set('handle', handle);
    if (avatar) data.set('avatar', avatar);
    else if (removeAvatar) data.set('avatar', '');
    try {
      const saved = await users().update(user.id, data);
      pb.authStore.save(pb.authStore.token, saved);
      onSaved(saved);
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      setFailed(Object.keys(fields).length === 0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} title={cs.profile.editTitle} onClose={onClose}>
      <form className={styles.editForm} onSubmit={(e) => void submit(e)}>
        {failed && (
          <p className={ui.alert} role="alert">
            {cs.common.somethingWrong}
          </p>
        )}
        <Field label={cs.auth.displayName} maxLength={60} value={name} error={errors.displayName} onChange={(e) => setName(e.target.value)} />
        <Field label={cs.auth.handle} hint={cs.auth.handleHint} required minLength={3} maxLength={24} pattern="[a-z0-9_]+" value={handle} error={errors.handle} onChange={(e) => setHandle(e.target.value)} />
        <Field label={cs.profile.avatar} hint={cs.profile.avatarHint} type="file" accept="image/png,image/jpeg,image/webp" className={styles.fileInput} error={errors.avatar} onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} />
        {user.avatar && !avatar && (
          <label className={styles.checkbox}>
            <input type="checkbox" checked={removeAvatar} onChange={(e) => setRemoveAvatar(e.target.checked)} />
            {cs.profile.removeAvatar}
          </label>
        )}
        <div className={ui.dialogActions}>
          <button type="button" className={ui.outline} onClick={onClose}>
            {cs.common.cancel}
          </button>
          <button type="submit" className={ui.primary} disabled={busy}>
            {busy ? cs.common.saving : cs.common.save}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function VerificationNotice({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  return (
    <div className={styles.notice}>
      <span>{cs.profile.unverified}</span>
      {sent ? (
        <span role="status">{cs.profile.verificationSent}</span>
      ) : (
        <button
          type="button"
          className={ui.outline}
          onClick={() => {
            void users()
              .requestVerification(email)
              .finally(() => setSent(true));
          }}
        >
          {cs.profile.resendVerification}
        </button>
      )}
    </div>
  );
}

function DeckTile({ deck, own }: { deck: DeckRecord; own: boolean }) {
  const preview = useMemo(() => (deck.expand?.cards ?? []).slice(0, 3).map((card) => ({ id: card.id, params: recordToParams(card) })), [deck]);
  return (
    <article className={styles.deck}>
      <Link to={`/balicky/${deck.id}`} className={styles.deckLink}>
        <div className={styles.deckFan}>
          {preview.map(({ id, params }, i) => (
            <div key={id} className={styles.deckCard} style={{ transform: `translate(-50%, -50%) translateX(${(i - (preview.length - 1) / 2) * 42}%) rotate(${(i - (preview.length - 1) / 2) * 8}deg)`, zIndex: i }}>
              <CardFace {...params} />
            </div>
          ))}
        </div>
        <h3 className={styles.deckName}>{deck.name}</h3>
      </Link>
      <p className={styles.deckMeta}>
        {cs.profile.cardsCount(deck.cards.length)}
        {own && deck.visibility !== 'public' && <span className={ui.badge}>{cs.visibility[deck.visibility]}</span>}
      </p>
    </article>
  );
}

export function Profile() {
  const { atHandle = '' } = useParams();
  const handle = atHandle.startsWith('@') ? atHandle.slice(1) : null;
  const viewer = useUser();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deckList, setDeckList] = useState<DeckRecord[]>([]);

  useEffect(() => {
    if (!handle) return;
    let active = true;
    setProfile(null);
    setMissing(false);
    users()
      .getFirstListItem(pb.filter('handle = {:handle}', { handle }))
      .then((record) => {
        if (active) setProfile(record);
      })
      .catch((error) => {
        if (active && isNotFound(error)) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [handle]);

  const profileId = profile?.id;
  const viewerId = viewer?.id;
  useEffect(() => {
    if (!profileId) return;
    let active = true;
    decks()
      .getFullList({ filter: pb.filter('owner = {:owner}', { owner: profileId }), sort: '-updated', expand: 'cards' })
      .then((records) => {
        if (active) setDeckList(records);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [profileId, viewerId]);

  const load = useCallback(
    async (page: number) => {
      if (!profileId) return { items: [], hasMore: false };
      const result = await cards().getList(page, PAGE_SIZE, {
        filter: pb.filter('owner = {:owner}', { owner: profileId }),
        sort: '-updated',
        expand: 'owner',
        skipTotal: true,
      });
      return { items: result.items, hasMore: result.items.length === PAGE_SIZE };
    },
    [profileId],
  );
  const { items, loading, hasMore, setSentinel } = usePagedCards(load, `${profileId}|${viewerId}`);

  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const { liked, toggle } = useLikes(ids);

  if (!handle || missing) return <NotFound />;
  if (!profile) {
    return (
      <main className={styles.main}>
        <p className={ui.spinnerRow}>{cs.common.loading}</p>
      </main>
    );
  }

  const own = viewer?.id === profile.id;

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <Avatar user={profile} />
        <div className={styles.names}>
          <h1 className={styles.name}>{displayName(profile)}</h1>
          <p className={styles.handle}>@{profile.handle}</p>
        </div>
        {own && (
          <button type="button" className={ui.outline} onClick={() => setEditing(true)}>
            <Icon name="pencil" size={18} />
            {cs.profile.edit}
          </button>
        )}
      </header>

      {own && viewer && viewer.verified === false && viewer.email && <VerificationNotice email={viewer.email} />}

      <section aria-labelledby="profil-karty" className={styles.section}>
        <h2 id="profil-karty" className={styles.sectionTitle}>
          {cs.profile.cards}
        </h2>
        {items.length > 0 ? (
          <div className={tileStyles.grid}>
            {items.map((record) => (
              <CardTile key={record.id} record={record} liked={Boolean(liked[record.id])} onToggleLike={toggle} showVisibility={own} />
            ))}
          </div>
        ) : (
          !loading && <p className={styles.empty}>{cs.profile.noCards}</p>
        )}
        {loading && <p className={ui.spinnerRow}>{cs.common.loading}</p>}
        {hasMore && <div ref={setSentinel} aria-hidden="true" />}
      </section>

      <section aria-labelledby="profil-balicky" className={styles.section}>
        <h2 id="profil-balicky" className={styles.sectionTitle}>
          {cs.profile.decks}
        </h2>
        {deckList.length > 0 ? (
          <div className={styles.decks}>
            {deckList.map((deck) => (
              <DeckTile key={deck.id} deck={deck} own={own} />
            ))}
          </div>
        ) : (
          <p className={styles.empty}>{cs.profile.noDecks}</p>
        )}
      </section>

      {own && editing && (
        <EditProfile
          user={profile}
          open={editing}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setProfile(saved);
            setEditing(false);
            if (saved.handle !== profile.handle) navigate(profilePath(saved.handle), { replace: true });
          }}
        />
      )}
    </main>
  );
}
