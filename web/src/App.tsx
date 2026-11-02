import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { refreshSession } from './lib/auth';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

const named = <T extends string>(load: () => Promise<Record<T, React.ComponentType>>, name: T) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

const auth = () => import('./pages/Auth');
const Templates = named(() => import('./pages/Templates'), 'Templates');
const SignIn = named(auth, 'SignIn');
const Register = named(auth, 'Register');
const RequestPasswordReset = named(auth, 'RequestPasswordReset');
const ConfirmPasswordReset = named(auth, 'ConfirmPasswordReset');
const ConfirmVerification = named(auth, 'ConfirmVerification');
const ConfirmEmailChange = named(auth, 'ConfirmEmailChange');
const Profile = named(() => import('./pages/Profile'), 'Profile');
const WorkshopEntry = named(() => import('./pages/WorkshopEntry'), 'WorkshopEntry');
const DevCards = named(() => import('./pages/DevCards'), 'DevCards');

export function App() {
  useEffect(() => {
    void refreshSession();
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="sablony" element={<Templates />} />
            <Route path="prihlaseni" element={<SignIn />} />
            <Route path="registrace" element={<Register />} />
            <Route path="obnova-hesla" element={<RequestPasswordReset />} />
            <Route path="obnova-hesla/:token" element={<ConfirmPasswordReset />} />
            <Route path="overeni/:token" element={<ConfirmVerification />} />
            <Route path="zmena-emailu/:token" element={<ConfirmEmailChange />} />
            <Route path="dilna" element={<WorkshopEntry />} />
            {/* React Router has no partial segments, so `/@handle` is checked in the page. */}
            <Route path=":atHandle" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="dev/karty" element={<DevCards />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
