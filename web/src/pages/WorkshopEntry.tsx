import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ui } from '../components/ui';
import { cs } from '../i18n/cs';
import { signInPath, useUser } from '../lib/auth';
import { cards, pb } from '../lib/pb';

/** "Dílna" in the navigation opens the most recently edited card of the user. */
export function WorkshopEntry() {
  const user = useUser();
  const [target, setTarget] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    cards()
      .getList(1, 1, {
        filter: pb.filter('owner = {:owner} || editors.id ?= {:owner}', { owner: userId }),
        sort: '-updated',
        skipTotal: true,
        fields: 'id',
      })
      .then((result) => {
        if (active) setTarget(result.items[0] ? `/dilna/${result.items[0].id}` : '/sablony');
      })
      .catch(() => {
        if (active) setTarget('/sablony');
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!user) return <Navigate to={signInPath('/dilna')} replace />;
  if (target) return <Navigate to={target} replace />;
  return (
    <main>
      <p className={ui.spinnerRow}>{cs.common.loading}</p>
    </main>
  );
}
