import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Hammer, LogIn, ShieldCheck, Truck, Loader2 } from "lucide-react";

export default function Portal() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading || !isAuthenticated || !user) return;

    const role = user.role;
    if (["admin", "manager"].includes(role)) {
      navigate("/gestao/admin");
    } else if (role === "logistics") {
      navigate("/motorista");
    }
    // Other roles stay here to see the access-denied card
  }, [user, loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f5ee]">
        <div className="flex flex-col items-center gap-3 text-sm text-[#214d39]">
          <Loader2 size={24} className="animate-spin" />
          <span>A validar o acesso...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f5ee] p-6">
        <div className="w-full max-w-md rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#214d39] text-[#f7e5bf] mb-5">
            <Hammer size={28} />
          </div>
          <h1 className="text-2xl font-bold text-[#214d39]">Portal Atua Loja</h1>
          <p className="mt-2 text-sm text-[#817669]">
            Entre com a sua conta para aceder ao portal adequado à sua função.
          </p>
          {isSupabaseConfigured() ? (
            <div className="mt-6 space-y-3">
              <button
                onClick={() => startLogin("google")}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-[#e4d9ca] bg-white px-5 py-3 text-sm font-semibold text-[#214d39] transition hover:bg-[#fbf8f2]"
              >
                <LogIn size={18} /> Entrar com Google
              </button>
              <button
                onClick={() => startLogin("github")}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-[#e4d9ca] bg-white px-5 py-3 text-sm font-semibold text-[#214d39] transition hover:bg-[#fbf8f2]"
              >
                <LogIn size={18} /> Entrar com GitHub
              </button>
            </div>
          ) : (
            <button
              onClick={() => startLogin()}
              className="mt-6 w-full rounded-full bg-[#214d39] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#2d6248]"
            >
              Entrar no sistema
            </button>
          )}
          <p className="mt-4 text-[11px] text-[#a39484]">
            Utilize as credenciais OAuth ou o acesso local configurado no servidor.
          </p>
        </div>
      </div>
    );
  }

  const role = user?.role;
  const isAdmin = ["admin", "manager"].includes(role || "");
  const isDriver = role === "logistics";

  if (isAdmin || isDriver) {
    // Redirect is happening via useEffect, show loading
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f5ee]">
        <div className="flex flex-col items-center gap-3 text-sm text-[#214d39]">
          <Loader2 size={24} className="animate-spin" />
          <span>A abrir o seu portal...</span>
        </div>
      </div>
    );
  }

  // Unauthorized role
  return (
    <div className="grid min-h-screen place-items-center bg-[#f8f5ee] p-6 text-center">
      <div className="max-w-sm rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-8">
        <ShieldCheck className="mx-auto text-[#9b5b35]" size={34} />
        <h1 className="mt-4 text-xl font-bold text-[#214d39]">Acesso não autorizado</h1>
        <p className="mt-2 text-sm text-[#817669]">
          A sua função (<span className="font-semibold">{role}</span>) não tem permissão para aceder a nenhum portal interno.
        </p>
        <p className="mt-2 text-sm text-[#817669]">
          Peça ao administrador para atribuir a função adequada.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href="/"
            className="rounded-full border border-[#214d39] px-5 py-3 text-xs font-bold text-[#214d39] transition hover:bg-[#f2eadf]"
          >
            Voltar à loja
          </a>
        </div>
      </div>
    </div>
  );
}
