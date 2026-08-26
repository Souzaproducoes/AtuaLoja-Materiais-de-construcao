export type AddressCandidate = { address?: string | null; isDefault?: number | null; lastUsedAt?: Date | null };

export function resolveDeliveryAddress(explicit: string | undefined, savedAddresses: AddressCandidate[], customerAddress?: string | null) {
  const direct = explicit?.trim();
  if (direct) return direct;
  const preferred = [...savedAddresses]
    .filter(candidate => candidate.address?.trim())
    .sort((a, b) => Number(b.isDefault ?? 0) - Number(a.isDefault ?? 0) || Number(b.lastUsedAt?.getTime() ?? 0) - Number(a.lastUsedAt?.getTime() ?? 0))[0];
  return preferred?.address?.trim() || customerAddress?.trim() || undefined;
}
