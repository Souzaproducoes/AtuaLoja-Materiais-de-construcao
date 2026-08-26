import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return <div className="grid min-h-screen place-items-center bg-[#f8f5ee] p-6 text-[#2b302b]"><div className="w-full max-w-lg rounded-3xl border border-[#e5dbcc] bg-[#fffdf8] p-8 text-center shadow-[0_14px_45px_rgba(50,40,25,.06)]"><AlertCircle className="mx-auto text-[#9b5b35]" size={42}/><p className="mt-5 text-5xl font-bold text-[#214d39]">404</p><h1 className="mt-3 text-xl font-bold text-[#214d39]">Página não encontrada</h1><p className="mt-2 text-sm leading-6 text-[#817669]">O endereço pode ter sido alterado ou ainda não estar disponível.</p><button onClick={() => setLocation("/")} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#214d39] px-5 py-3 text-xs font-bold text-white"><Home size={16}/> Voltar à loja</button><div className="mt-8 border-t border-[#eee5da] pt-5 text-xs text-[#8a7e70]">Precisa de ajuda? <a href="https://wa.me/5562991444852?text=Olá%20Souza%20produções,%20preciso%20de%20ajuda%20com%20a%20Atua%20Loja." target="_blank" rel="noreferrer" className="font-bold text-[#9b5b35]">Souza produções ↗</a></div></div></div>;
}
