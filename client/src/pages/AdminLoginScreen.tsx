import React, { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { isSupabaseConfigured } from "@/lib/supabase";
import { LogIn, Mail } from "lucide-react";

export default function AdminLoginScreen() {
  const localLogin = trpc.auth.localLogin.useMutation({
    onSuccess: () => { toast.success("Sessão administrativa iniciada."); window.location.reload(); },
    onError: error => toast.error(error.message),
  });
  const [localUsername, setLocalUsername] = useState("");
  const [localPassword, setLocalPassword] = useState("");
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f5ee] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#9b5b35]">Atua Loja OS</p>
        <h1 className="mt-2 text-2xl font-bold text-[#214d39]">Área de gestão</h1>
        <p className="mt-2 text-sm text-[#817669]">Entre com OAuth ou use o acesso local configurado no servidor.</p>

        {supabaseReady ? (
          <div className="mt-6 space-y-3">
            <button onClick={() => startLogin("google")} className="flex w-full items-center justify-center gap-3 rounded-full border border-[#e4d9ca] bg-white px-5 py-3 text-sm font-semibold text-[#214d39] hover:bg-[#fbf8f2] transition">
              <LogIn size={18} /> Entrar com Google
            </button>
            <button onClick={() => startLogin("github")} className="flex w-full items-center justify-center gap-3 rounded-full border border-[#e4d9ca] bg-white px-5 py-3 text-sm font-semibold text-[#214d39] hover:bg-[#fbf8f2] transition">
              <LogIn size={18} /> Entrar com GitHub
            </button>
          </div>
        ) : (
          <button onClick={() => startLogin()} className="mt-6 w-full rounded-full border border-[#214d39] px-5 py-3 text-xs font-bold text-[#214d39]">
            Entrar com OAuth
          </button>
        )}

        <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.15em] text-[#a39484]">
          <span className="h-px flex-1 bg-[#e5dbcc]" />Acesso local<span className="h-px flex-1 bg-[#e5dbcc]" />
        </div>

        <form onSubmit={event => { event.preventDefault(); localLogin.mutate({ username: localUsername, password: localPassword }); }} className="space-y-3">
          <label className="block text-left text-xs font-bold text-[#62584e]">
            Utilizador
            <input value={localUsername} onChange={event => setLocalUsername(event.target.value)} autoComplete="username" className="mt-1.5 w-full rounded-xl border border-[#e4d9ca] bg-[#fbf8f2] px-3 py-3 text-sm font-normal outline-none focus:border-[#9b5b35]" />
          </label>
          <label className="block text-left text-xs font-bold text-[#62584e]">
            Password
            <input type="password" value={localPassword} onChange={event => setLocalPassword(event.target.value)} autoComplete="current-password" className="mt-1.5 w-full rounded-xl border border-[#e4d9ca] bg-[#fbf8f2] px-3 py-3 text-sm font-normal outline-none focus:border-[#9b5b35]" />
          </label>
          <button disabled={localLogin.isPending} className="w-full rounded-full bg-[#214d39] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">
            {localLogin.isPending ? "A validar..." : "Entrar na gestão"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] leading-5 text-[#817669]">
          As credenciais locais ficam guardadas no servidor. Esta opção não usa OAuth.
        </p>
      </div>
    </div>
  );
}
