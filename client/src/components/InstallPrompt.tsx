import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
  interface WindowEventMap { beforeinstallprompt: BeforeInstallPromptEvent; }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handle = (event: BeforeInstallPromptEvent) => { event.preventDefault(); setDeferred(event); setVisible(true); };
    window.addEventListener("beforeinstallprompt", handle);
    return () => window.removeEventListener("beforeinstallprompt", handle);
  }, []);
  if (!visible || !deferred) return null;
  const install = async () => { await deferred.prompt(); const choice = await deferred.userChoice; if (choice.outcome === "accepted") setVisible(false); };
  return <div className="fixed bottom-5 right-5 z-50 flex max-w-[340px] items-center gap-3 rounded-2xl bg-[#214d39] p-4 text-white shadow-lift"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8ad6d] text-[#3d281b]"><Download size={17}/></div><div className="min-w-0 flex-1"><p className="text-xs font-bold">Instale a Atua Loja</p><p className="mt-1 text-[11px] leading-4 text-[#cbd9c8]">Aceda ao catálogo e aos pedidos como uma aplicação.</p></div><button onClick={() => setVisible(false)} className="self-start rounded-full p-1 text-[#cbd9c8] hover:bg-white/10" aria-label="Fechar"><X size={15}/></button><button onClick={install} className="rounded-xl bg-[#e8ad6d] px-3 py-2 text-[11px] font-bold text-[#3d281b]">Instalar</button></div>;
}
