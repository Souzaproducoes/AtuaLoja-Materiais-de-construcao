import { isSupabaseConfigured } from "@/lib/supabase";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = (provider?: string) => {
  if (isSupabaseConfigured()) {
    window.location.href = `/api/auth/supabase/login?provider=${provider || "google"}`;
    return;
  }

  if (window.location.pathname !== "/gestao") {
    window.location.href = "/gestao";
  }
};
