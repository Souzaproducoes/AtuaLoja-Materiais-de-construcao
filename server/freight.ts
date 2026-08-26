export type FreightRule = { zone: string; maxKm: number; base: number; perKm: number; freeAbove?: number };

export const defaultFreightRules: FreightRule[] = [
  { zone: "Niquelândia", maxKm: 15, base: 25, perKm: 0, freeAbove: 500 },
  { zone: "Região", maxKm: 80, base: 35, perKm: 2.5, freeAbove: 1200 },
];

export function calculateFreight(input: { city: string; distanceKm: number; subtotal: number; rules?: FreightRule[] }) {
  const rule = (input.rules || defaultFreightRules).find(item => item.zone.toLowerCase() === input.city.toLowerCase()) || (input.rules || defaultFreightRules).find(item => item.zone === "Região" && input.distanceKm <= item.maxKm);
  if (!rule || input.distanceKm > rule.maxKm) return { eligible: false, amount: 0, reason: "Fora da área de atendimento configurada" };
  if (rule.freeAbove && input.subtotal >= rule.freeAbove) return { eligible: true, amount: 0, reason: "Frete oferecido pela condição comercial" };
  return { eligible: true, amount: Number((rule.base + input.distanceKm * rule.perKm).toFixed(2)), reason: "Frete calculado pela zona e distância" };
}
