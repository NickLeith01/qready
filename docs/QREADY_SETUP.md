# Qready.io – Setup & architecture

This doc describes how the Qready site and app are set up: one codebase, one repo, and how it gets from your computer to the live site.

---

## The folder on your computer: `digital-pager`

`digital-pager` is your **project folder**. It holds:

- The **source code** for both:
  - The **website** (landing page at qready.io)
  - The **app** (dashboard at qready.io/dashboard, customer pager at qready.io/pager/…)
- Config files (e.g. `package.json`, `next.config`), and the `public` folder (e.g. logo).

**So: one folder = one codebase = both the marketing site and the product app.**  
When you run `npm run dev` on your Mac, you’re running that same app locally (localhost).

---

## How it gets from your computer to the live site

| Step | What it is |
|------|------------|
| 1. Your computer | You edit the code in the `digital-pager` folder (in Cursor, etc.). |
| 2. Git | You commit changes and **push** to **GitHub** (repo: NickLeith01/qready). GitHub stores the code and its history. |
| 3. Vercel | Vercel is **connected** to that GitHub repo. When you push to `main`, Vercel automatically **builds** the app (e.g. `npm run build`) and **deploys** it. The live site is whatever Vercel just built. |
| 4. Domain (qready.io) | **Cloudflare** owns the domain and says: “qready.io and www.qready.io go to Vercel’s servers.” So when someone opens qready.io, their browser hits Vercel, which serves the app that was built from your repo. |

**So:**  
`digital-pager` (your folder) → GitHub (code) → Vercel (build + host) → qready.io (domain pointing to Vercel).

---

## What runs where (summary)

- **Your Mac:** Editing and local testing (`npm run dev`).
- **GitHub:** Stores the code; Vercel pulls from here.
- **Vercel:** Builds and hosts the Next.js app (landing + dashboard + pager pages).
- **Supabase:** Hosts the database and realtime (orders, merchants, etc.). The app talks to Supabase via env vars (e.g. `NEXT_PUBLIC_SUPABASE_URL` and anon key) that you set in Vercel.
- **Cloudflare:** DNS for qready.io (and www) so those names point to Vercel.
- **qready.io / www.qready.io:** The public URLs; they just point to the app running on Vercel.

---

## One-line summary

**digital-pager on your computer is the app and website; you change it there, push to GitHub, and Vercel turns that into the live site at qready.io.**

---

## Diagram (the “spider”)

```
                    ┌─────────────────────┐
                    │   Your computer      │
                    │   digital-pager/     │
                    │   (source code)      │
                    └──────────┬──────────┘
                               │
                               │ git push
                               ▼
                    ┌─────────────────────┐
                    │      GitHub         │
                    │  NickLeith01/qready │
                    │   (stores code)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
         ┌──────────────────┐   ┌──────────────────┐
         │      Vercel       │   │    Supabase       │
         │  (builds & hosts  │   │  (database +      │
         │   the Next.js     │◄──┤   realtime)       │
         │   app)            │   │  orders, merchants│
         └────────┬─────────┘   └──────────────────┘
                  │              env vars connect them
                  │
                  │  serves
                  ▼
         ┌──────────────────┐
         │   Live app       │
         │  (HTML, JS, API) │
         └────────┬─────────┘
                  │
                  │  "Where is qready.io?"
                  ▼
         ┌──────────────────┐
         │    Cloudflare    │
         │  (DNS for        │
         │   qready.io)     │
         └────────┬─────────┘
                  │
                  │  points to
                  ▼
         ┌──────────────────┐
         │   qready.io      │
         │   www.qready.io  │
         │  (what users     │
         │   type in browser)│
         └──────────────────┘
```

**In words:**

- **Center of the spider:** your `digital-pager` folder (the app and website).
- **First leg:** you **push** that code to **GitHub**.
- **From GitHub:** one leg goes to **Vercel** (build + host), another to **Supabase** (data); Vercel and Supabase are connected by **env vars**.
- **From Vercel:** the **live app** is what users get.
- **From the internet:** **Cloudflare** (DNS) sends qready.io and www.qready.io to that live app on Vercel.

**So the “spider” is:** Your folder → GitHub → (Vercel + Supabase) → Cloudflare → qready.io.

---

## Maintenance mode (take the site offline)

To show the “Temporarily unavailable” page for all visitors:

1. In **Vercel** → your project → **Settings** → **Environment Variables**, add (or edit):
   - **Name:** `MAINTENANCE_MODE`
   - **Value:** `true`
   - **Environments:** All (or Production only)
2. **Redeploy:** Deployments → … on the latest deployment → **Redeploy** (so the new variable is used).

To bring the site back online, set `MAINTENANCE_MODE` to `false` or remove it, then redeploy again.
