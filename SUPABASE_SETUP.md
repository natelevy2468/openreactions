# Supabase setup for accounts + saved drawings

Everything in the app is already written and will run without a backend (drawings
persist in the browser). Doing the four steps below turns on real accounts and
cloud sync so drawings follow you between devices.

Total time: about 5 minutes.

---

## Step 1 — Create the project

1. Go to <https://supabase.com> and sign in (free tier is plenty).
2. **New project**
   - Name: `openreactions`
   - Database password: anything — save it in your password manager, you won't
     need it for this app.
   - Region: pick the one closest to you (`West US` is fine).
3. Wait ~2 minutes for it to provision.

## Step 2 — Run the SQL

In the left sidebar click **SQL Editor** → **New query**, paste all of this, and
press **Run**. It is safe to run more than once.

```sql
-- OpenReactions: saved drawings
-- ---------------------------------------------------------------------------
-- One row per drawing. `data` is the whole document (vertices, bonds, atom
-- labels, arrows, Newman projections, pan/zoom). `thumbnail` is a small PNG
-- data URL used for the cards on the homepage.

create extension if not exists pgcrypto;

create table if not exists public.drawings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'Untitled drawing',
  data        jsonb not null default '{}'::jsonb,
  thumbnail   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The homepage and the in-app list both ask for "my drawings, newest first".
create index if not exists drawings_user_updated_idx
  on public.drawings (user_id, updated_at desc);

-- Row Level Security: a signed-in user can only ever touch their own rows.
alter table public.drawings enable row level security;

drop policy if exists "drawings_select_own" on public.drawings;
create policy "drawings_select_own" on public.drawings
  for select using (auth.uid() = user_id);

drop policy if exists "drawings_insert_own" on public.drawings;
create policy "drawings_insert_own" on public.drawings
  for insert with check (auth.uid() = user_id);

drop policy if exists "drawings_update_own" on public.drawings;
create policy "drawings_update_own" on public.drawings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "drawings_delete_own" on public.drawings;
create policy "drawings_delete_own" on public.drawings
  for delete using (auth.uid() = user_id);

-- Keep updated_at honest: the server stamps it, the client can't fake it.
-- Ordering "recent drawings" depends on this being trustworthy.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.user_id    = old.user_id;   -- rows can never change owner
  new.created_at = old.created_at;
  return new;
end;
$$;

drop trigger if exists drawings_touch_updated_at on public.drawings;
create trigger drawings_touch_updated_at
  before update on public.drawings
  for each row execute function public.touch_updated_at();
```

You should see `Success. No rows returned`.

## Step 3 — Turn off "confirm email" (recommended)

By default Supabase makes people click a link in an email before they can sign
in, and the free built-in mailer only sends a couple of messages an hour — so
sign-ups appear broken. Unless you want email verification:

**Authentication** → **Sign In / Providers** → **Email** → turn **Confirm email**
OFF → **Save**.

(The app handles it either way: with confirmation on, new users get a "check your
inbox" message instead of being signed straight in.)

While you're here, **Authentication → URL Configuration** → set **Site URL** to
`https://openreactions.com`, and add `http://localhost:5173/draw/` under
**Redirect URLs** if you want password-reset links to work in local dev.

## Step 4 — Paste your keys into the app

**Project Settings** (gear, bottom left) → **API keys** / **Data API**. Copy:

- **Project URL** — looks like `https://abcdefghijklm.supabase.co`
- **anon public** key — a long `eyJ...` string

Open `supabase-config.js` in the repo root and fill in the two values:

```js
window.OPENREACTIONS_CONFIG = {
  supabaseUrl: 'https://abcdefghijklm.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...'
};
```

That's the **only** place these go — the homepage and the drawing app both read
this one file.

The anon key is meant to be public (it ships in every Supabase web app); the Row
Level Security policies from Step 2 are what actually protect the data. Never put
the `service_role` key in this file.

Then redeploy as usual:

```sh
npm run predeploy && npm run deploy
```

---

## Verifying it works

1. Open the homepage → **Sign in** → the **Create account** tab → make an account.
2. Click **Start Creating** and draw something. The header should flash *Saving…*
   then settle on *All changes saved*.
3. Reload the page — the drawing is still there.
4. Go back to the homepage — it appears under **Your drawings** with a thumbnail.
5. In Supabase, **Table Editor** → `drawings` shows the row.
6. Back in the editor, **My drawings** lists it, and lets you rename, duplicate,
   delete, or start a new one.

## Troubleshooting

| What you see | Cause |
| --- | --- |
| Header says *"Saved on this device"* and there's no Sign in button | `supabase-config.js` still has the placeholder values, or the file 404s. Check the browser console — it logs which. |
| Header says *"Couldn’t reach the server — saved on this device"* | The write failed; hover the message for the reason. Your work is still in the browser and gets pushed as soon as the server answers again. |
| *"Invalid login credentials"* right after signing up | Email confirmation is still on (Step 3), so the account isn't active yet. |
| Sign-up says *"For security purposes..."* | Supabase rate limit on the built-in mailer. Wait a minute, or turn off Confirm email. |
| Drawings save but the list is always empty | The SQL in Step 2 didn't run, or only partly ran. Re-run it. |
| `permission denied for table drawings` | RLS is on but the policies are missing — re-run Step 2. |

## What runs without any of this

If `supabase-config.js` is left blank the app still works completely offline:
drawings are kept in the browser's local storage, reloading keeps your work, and
the account UI hides itself. Nothing errors.

---

## Sign in with Google

Roughly 10 minutes, all in two browser tabs. Nothing in the code needs to change:
the app asks your project which providers are on, so the moment you finish step 4
a **Continue with Google** button appears in both sign-in dialogs. No redeploy.

Keep two tabs open — you'll copy one value from Supabase into Google, then two
values back.

### 1. Get the callback URL from Supabase

Supabase → **Authentication** → **Sign In / Providers** → **Google**.

Toggle **Enable Sign in with Google** on. Two empty boxes appear (Client ID and
Client Secret) plus a read-only **Callback URL (for OAuth)**. Copy that URL — for
your project it is exactly:

```
https://bbyskqvfkuplmuforgfg.supabase.co/auth/v1/callback
```

Leave this tab open; don't save yet.

### 2. Create a Google Cloud project and consent screen

1. Go to <https://console.cloud.google.com/>. Sign in with the Google account that
   should own this.
2. Project picker (top left) → **New project** → name it `OpenReactions` →
   **Create**, then make sure it's the selected project.
3. In the search bar type **Google Auth Platform** and open it (older consoles
   call this **OAuth consent screen**). Click **Get started** and fill in:
   - **App name**: `OpenReactions`
   - **User support email**: your email
   - **Audience**: **External**
   - **Contact email**: your email
   - Agree to the policy → **Create**.
4. Still in Google Auth Platform → **Audience**: while the app is in **Testing**
   only accounts you list can sign in. Either
   - click **Publish app** → **Confirm** (recommended — anyone can sign in; no
     Google review is needed because we only request basic email/profile), or
   - leave it in Testing and add yourself under **Test users** → **Add users**.

### 3. Create the OAuth client

1. Google Auth Platform → **Clients** → **Create client**
   (older consoles: **APIs & Services → Credentials → Create credentials → OAuth
   client ID**).
2. **Application type**: **Web application**.
3. **Name**: `OpenReactions web`.
4. Under **Authorised JavaScript origins** → **Add URI**, add both:
   ```
   https://openreactions.com
   http://localhost:5173
   ```
5. Under **Authorised redirect URIs** → **Add URI**, add the callback URL from
   step 1 — this one must match character for character:
   ```
   https://bbyskqvfkuplmuforgfg.supabase.co/auth/v1/callback
   ```
6. **Create**. A dialog shows **Client ID** and **Client secret**. Keep it open.

### 4. Paste the two values back into Supabase

Back in the Supabase tab (Authentication → Sign In / Providers → Google):

1. **Client ID** → paste the client ID.
2. **Client Secret** → paste the client secret.
3. **Save**.

The client secret belongs *only* here. It must never go into
`supabase-config.js` or any file in this repo.

### 5. Allow the app's own URLs to be returned to

Supabase → **Authentication** → **URL Configuration**:

- **Site URL**: `https://openreactions.com`
- **Redirect URLs** → add each of these (the `**` wildcards matter, because the
  editor signs you back in to a URL like `/draw/?doc=<id>`):
  ```
  https://openreactions.com/**
  http://localhost:5173/**
  ```

**Save.**

### 6. Try it

Reload openreactions.com — a **Continue with Google** button now sits under the
email form in the sign-in dialog. Click it, pick your account, and you should
land back on the page signed in, with your drawings loaded.

The button appears because the app reads your project's enabled providers, so
nothing needs rebuilding. If you'd rather pin the behaviour, set
`enableGoogleSignIn` in `supabase-config.js` to `true` or `false` instead of
`'auto'`.

### Google troubleshooting

| What you see | Fix |
| --- | --- |
| **Error 400: redirect_uri_mismatch** | The redirect URI in step 3.5 doesn't exactly match the Supabase callback URL. No trailing slash, `https`, correct project ref. |
| **Access blocked: OpenReactions has not completed the Google verification process** | The app is still in Testing and you aren't a test user. Publish it (step 2.4) or add your address. |
| Signs in, then bounces to the homepage signed out | The URL you started from isn't in **Redirect URLs** (step 5). Add the `/**` patterns. |
| The button never appears | Google isn't actually enabled, or the provider list is cached for this tab. Hard-reload, or check `enableGoogleSignIn` isn't set to `false`. |
| **invalid_client** | Client ID/secret were pasted into Supabase with a stray space, or they belong to a different Google project. |

## Optional: regenerating the vendored library

The homepage is plain HTML, so it loads Supabase from `vendor/supabase.js`
(committed, no CDN). If you ever upgrade the dependency, refresh that copy:

```sh
cd draw && npm install @supabase/supabase-js@latest
npx esbuild node_modules/@supabase/supabase-js/dist/umd/supabase.js \
  --minify --outfile=../vendor/supabase.js
```
