import { Component, type ReactNode } from 'react';
import { cs } from '../i18n/cs';
import { ui } from './ui';

/** The last resort for a render error or a chunk that failed to download after a deploy. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
        <p role="alert">{cs.common.somethingWrong}</p>
        <button type="button" className={ui.outline} onClick={() => window.location.reload()}>
          {cs.common.retry}
        </button>
      </main>
    );
  }
}
