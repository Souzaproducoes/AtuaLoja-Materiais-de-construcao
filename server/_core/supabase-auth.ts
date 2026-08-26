import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

/**
 * Register Supabase Auth routes.
 *
 * Flow:
 * 1. Client calls POST /api/auth/supabase with { access_token, refresh_token }
 *    obtained from supabase.auth.signInWithOAuth() on the client side.
 * 2. Server verifies the token with Supabase, upserts user in MySQL,
 *    creates our own JWT session cookie, and returns success.
 *
 * Alternative flow (PKCE):
 * 1. Client redirects to /api/auth/supabase/login?provider=google
 * 2. Server redirects to Supabase hosted auth page
 * 3. Supabase redirects back to /api/auth/supabase/callback
 * 4. Server exchanges code for session, upserts user, sets cookie
 */
export function registerSupabaseAuthRoutes(app: Express) {
  // ── Login redirect (PKCE flow) ──
  app.get("/api/auth/supabase/login", async (req: Request, res: Response) => {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: "Supabase Auth não configurado." });
      return;
    }

    const provider = String(req.query.provider || "google") as
      | "google" | "github" | "facebook" | "apple" | "email";

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      res.status(503).json({ error: "Supabase client unavailable." });
      return;
    }

    const redirectTo = `${req.protocol}://${req.get("host")}/api/auth/supabase/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider === "email" ? undefined : provider as any,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      console.error("[Supabase Auth] Login redirect failed:", error);
      res.status(500).json({ error: "Falha ao iniciar login com Supabase." });
      return;
    }

    res.redirect(302, data.url);
  });

  // ── OAuth callback (PKCE flow) ──
  app.get("/api/auth/supabase/callback", async (req: Request, res: Response) => {
    if (!isSupabaseConfigured()) {
      res.redirect(302, "/?error=supabase_not_configured");
      return;
    }

    const code = String(req.query.code || "");
    if (!code) {
      res.redirect(302, "/?error=no_code");
      return;
    }

    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error("Supabase unavailable");

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data?.user) throw error || new Error("No user in session");

      const sbUser = data.user;
      const openId = `supabase_${sbUser.id}`;
      const email = sbUser.email || null;
      const name = sbUser.user_metadata?.full_name
        || sbUser.user_metadata?.name
        || email?.split("@")[0]
        || null;

      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "supabase",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[Supabase Auth] Callback failed:", error);
      res.redirect(302, "/?error=auth_callback_failed");
    }
  });

  // ── Token exchange (for client-side signInWithPassword / OAuth) ──
  app.post("/api/auth/supabase", async (req: Request, res: Response) => {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: "Supabase Auth não configurado." });
      return;
    }

    const { access_token, refresh_token } = req.body || {};
    if (!access_token) {
      res.status(400).json({ error: "access_token required." });
      return;
    }

    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error("Supabase unavailable");

      // Set the session from the tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || "",
      });

      if (sessionError || !sessionData?.user) throw sessionError || new Error("Invalid session");

      const sbUser = sessionData.user;
      const openId = `supabase_${sbUser.id}`;
      const email = sbUser.email || null;
      const name = sbUser.user_metadata?.full_name
        || sbUser.user_metadata?.name
        || email?.split("@")[0]
        || null;

      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "supabase",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: { name, email } });
    } catch (error) {
      console.error("[Supabase Auth] Token exchange failed:", error);
      res.status(401).json({ error: "Sessão Supabase inválida." });
    }
  });
}
