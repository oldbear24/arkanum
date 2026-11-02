import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { checkA11y, createCard, PASSWORD } from './helpers';

const CLIENT_ID = 'e2e-client-id';
const SUPERUSER = 'e2e@arkanum.example'; // created in serve.mjs

// PocketBase's real Discord provider and the real popup run against this server.
// Only the three addresses differ from Discord itself.
let fake: Server;
let fakeUrl = '';
let currentUser: Record<string, unknown> = {};
let refuseAccess = false;
let authorizeParams = new URLSearchParams();

function startFake() {
  fake = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://fake');
    if (url.pathname === '/authorize') {
      authorizeParams = url.searchParams;
      const back = new URL(url.searchParams.get('redirect_uri') ?? '');
      back.searchParams.set('state', url.searchParams.get('state') ?? '');
      if (refuseAccess) back.searchParams.set('error', 'access_denied');
      else back.searchParams.set('code', 'fake-code');
      res.writeHead(302, { Location: back.href }).end();
    } else if (url.pathname === '/token') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'fake-token', token_type: 'Bearer', expires_in: 3600 }));
    } else if (url.pathname === '/me') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(currentUser));
    } else {
      res.writeHead(404).end();
    }
  });
  return new Promise<void>((resolve) => {
    fake.listen(0, '127.0.0.1', () => {
      fakeUrl = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
      resolve();
    });
  });
}

// Saves the same collection options as the OAuth2 section of the admin UI.
async function setOAuth(request: APIRequestContext, oauth2: Record<string, unknown>) {
  const auth = await request.post('/api/collections/_superusers/auth-with-password', {
    data: { identity: SUPERUSER, password: PASSWORD },
  });
  expect(auth.ok()).toBe(true);
  const { token } = (await auth.json()) as { token: string };

  const saved = await request.patch('/api/collections/users', {
    headers: { Authorization: token },
    data: { oauth2 },
  });
  expect(saved.ok(), await saved.text()).toBe(true);
}

async function continueWithDiscord(page: Page) {
  await page.goto('/prihlaseni');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Discord' }).click();
  return popup;
}

async function expectSignedIn(page: Page) {
  await expect(page.getByRole('button', { name: 'Můj účet' })).toBeVisible();
}

test('nothing is offered until a provider is set up in PocketBase', async ({ page }) => {
  const methods = page.waitForResponse(/auth-methods/);
  await page.goto('/prihlaseni');
  expect((await methods).ok()).toBe(true);
  await expect(page.getByRole('button', { name: 'Přihlásit se' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Discord' })).toHaveCount(0);
});

test.describe.serial('with Discord set up', () => {
  test.beforeAll(async ({ request }) => {
    await startFake();
    await setOAuth(request, {
      enabled: true,
      providers: [
        {
          name: 'discord',
          displayName: 'Discord',
          clientId: CLIENT_ID,
          clientSecret: 'e2e-client-secret',
          authURL: `${fakeUrl}/authorize`,
          tokenURL: `${fakeUrl}/token`,
          userInfoURL: `${fakeUrl}/me`,
        },
      ],
    });
  });

  test.afterAll(async ({ request }) => {
    await setOAuth(request, { enabled: false, providers: [] });
    fake.closeAllConnections();
    fake.close();
  });

  test.beforeEach(() => {
    refuseAccess = false;
  });

  test('both sign-in pages offer it and stay accessible', async ({ page }) => {
    for (const path of ['/prihlaseni', '/registrace']) {
      await page.goto(path);
      await expect(page.getByRole('button', { name: 'Discord' })).toBeVisible();
      await checkA11y(page);
    }
  });

  test('a new user signs in and gets a profile', async ({ page, baseURL }) => {
    currentUser = {
      id: '100',
      username: 'zofie.novakova',
      global_name: 'Žofie Nováková',
      discriminator: '0',
      avatar: null,
      email: 'zofie@arkanum.example',
      verified: true,
    };

    const popup = await continueWithDiscord(page);
    await expectSignedIn(page);
    await expect.poll(() => popup.isClosed()).toBe(true);

    // Discord compares this address with the registered redirects character by character.
    expect(authorizeParams.get('redirect_uri')).toBe(`${baseURL}/api/oauth2-redirect`);
    expect(authorizeParams.get('client_id')).toBe(CLIENT_ID);
    expect(authorizeParams.get('scope')).toBe('identify email');

    await page.goto('/@zofie_novakova');
    await expect(page.getByRole('heading', { name: 'Žofie Nováková' })).toBeVisible();
    await expect(page.getByText('Tvůj e-mail zatím není ověřený.')).toHaveCount(0);
  });

  test('signing in again returns to the same account, even after a rename on Discord', async ({ page, request }) => {
    currentUser = { ...currentUser, username: 'jine_jmeno', global_name: 'Jiné jméno' };

    await continueWithDiscord(page);
    await expectSignedIn(page);
    await page.getByRole('button', { name: 'Můj účet' }).click();
    await expect(page.getByRole('menu').getByText('@zofie_novakova')).toBeVisible();

    const others = await request.get('/api/collections/users/records', {
      params: { filter: "handle = 'jine_jmeno'" },
    });
    expect(((await others.json()) as { totalItems: number }).totalItems).toBe(0);
  });

  test('an account without a verified address works', async ({ page }) => {
    currentUser = {
      id: '200',
      username: 'bez_adresy',
      global_name: null,
      discriminator: '0',
      avatar: null,
      email: 'neovereny@arkanum.example',
      verified: false,
    };

    await continueWithDiscord(page);
    await expectSignedIn(page);

    await page.goto('/@bez_adresy');
    await expect(page.getByRole('heading', { name: 'bez_adresy' })).toBeVisible();
    await expect(page.getByText('Tvůj e-mail zatím není ověřený.')).toHaveCount(0);

    expect(await createCard(page)).not.toBe('');
  });

  test('refusing access on Discord shows a message and allows another try', async ({ page }) => {
    refuseAccess = true;
    const popup = await continueWithDiscord(page);
    await expect(page.getByRole('alert')).toHaveText('Přihlášení přes externí službu se nepovedlo.');
    await expect.poll(() => popup.isClosed()).toBe(true);
    await expect(page.getByRole('button', { name: 'Můj účet' })).toHaveCount(0);
    await checkA11y(page);

    refuseAccess = false;
    await page.getByRole('button', { name: 'Discord' }).click();
    await expectSignedIn(page);
  });
});
