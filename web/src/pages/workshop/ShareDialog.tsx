import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Visibility } from '../../card/spec';
import { Icon } from '../../components/Icon';
import { Dialog, Field, ui } from '../../components/ui';
import { cs } from '../../i18n/cs';
import { getUser } from '../../lib/auth';
import { cards, isNotFound, pb, users, type CardRecord } from '../../lib/pb';
import styles from './ShareDialog.module.css';

const w = cs.workshop;
const EXPAND = 'owner,editors';
const VISIBILITIES: Visibility[] = ['private', 'unlisted', 'public'];

const LINK_HINT: Record<Visibility, string> = {
  private: w.linkPrivateHint,
  unlisted: w.linkUnlistedHint,
  public: w.linkPublicHint,
};

interface ShareDialogProps {
  record: CardRecord;
  isOwner: boolean;
  onClose: () => void;
  onChange: (record: CardRecord) => void;
}

export function ShareDialog({ record, isOwner, onClose, onChange }: ShareDialogProps) {
  const link = `${window.location.origin}/karta/${record.id}`;
  const [copied, setCopied] = useState(false);
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [pendingVisibility, setPendingVisibility] = useState<Visibility | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      linkInput.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  const save = async (data: Record<string, unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      onChange(await cards().update(record.id, data, { expand: EXPAND }));
      return true;
    } catch {
      setError(cs.common.somethingWrong);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addCoauthor = async (e: FormEvent) => {
    e.preventDefault();
    const wanted = handle.trim().replace(/^@/, '').toLowerCase();
    if (!wanted) return;
    setError(undefined);
    try {
      const found = await users().getFirstListItem(pb.filter('handle = {:handle}', { handle: wanted }), { fields: 'id' });
      if (found.id === getUser()?.id) {
        setError(w.coauthorSelf);
      } else if (record.editors.includes(found.id)) {
        setError(w.coauthorExists);
      } else if (await save({ 'editors+': found.id })) {
        setHandle('');
      }
    } catch (failure) {
      setError(isNotFound(failure) ? w.coauthorNotFound : cs.common.somethingWrong);
    }
  };

  const editors = record.expand?.editors ?? [];
  const visibility = pendingVisibility ?? record.visibility;

  return (
    <Dialog open title={w.shareTitle} onClose={onClose}>
      <div className={styles.group}>
        <label htmlFor="share-link" className={ui.label}>
          {w.shareLink}
        </label>
        <div className={styles.linkRow}>
          <input id="share-link" ref={linkInput} className={ui.input} readOnly value={link} onFocus={(e) => e.target.select()} />
          <button type="button" className={ui.outline} onClick={() => void copy()}>
            {copied ? cs.common.copied : w.copyLink}
          </button>
        </div>
        <p className={ui.hint}>{LINK_HINT[visibility]}</p>
      </div>

      {isOwner && (
        <>
          <fieldset className={styles.fieldset}>
            <legend className={ui.smallHeading}>{w.visibilityLabel}</legend>
            {VISIBILITIES.map((value) => (
              <label key={value} className={styles.radio}>
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={visibility === value}
                  disabled={busy}
                  onChange={() => {
                    setPendingVisibility(value);
                    void save({ visibility: value }).finally(() => setPendingVisibility(null));
                  }}
                />
                {w.visibilityOptions[value]}
              </label>
            ))}
          </fieldset>

          <div className={styles.group}>
            <h3 className={ui.smallHeading}>{w.coauthors}</h3>
            <p className={ui.hint}>{w.coauthorsHint}</p>
            {editors.length === 0 && <p className={styles.none}>{w.noCoauthors}</p>}
            <ul className={styles.editors}>
              {editors.map((editor) => (
                <li key={editor.id} className={styles.editor}>
                  <span className={styles.editorName}>@{editor.handle}</span>
                  <button type="button" className={ui.iconButton} aria-label={w.removeCoauthor + editor.handle} disabled={busy} onClick={() => void save({ 'editors-': editor.id })}>
                    <Icon name="close" size={16} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
            <form className={styles.addRow} onSubmit={(e) => void addCoauthor(e)}>
              <div className={styles.addField}>
                <Field label={w.coauthorHandle} value={handle} autoComplete="off" onChange={(e) => setHandle(e.target.value)} />
              </div>
              <button type="submit" className={ui.outline} disabled={busy || !handle.trim()}>
                {w.addCoauthor}
              </button>
            </form>
          </div>
        </>
      )}

      {error && (
        <p className={ui.alert} role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
