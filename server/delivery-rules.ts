export type DeliveryClosingStatus = "confirmed" | "partial";

export function canCloseDelivery(status: string, proofType?: string, proof?: string) {
  if (status !== "confirmed" && status !== "partial") return true;
  if (!proofType || !proof?.trim()) return false;
  if (proofType === "code") return /^\d{4,12}$/.test(proof.trim());
  if (proofType === "photo" || proofType === "signature") return /^https:\/\//.test(proof.trim());
  return proofType === "manual";
}
