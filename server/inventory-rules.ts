export type InventoryLocation = { id: number; location: string; available: number };

export function allocateInventory(rows: InventoryLocation[], requested: number) {
  if (!Number.isFinite(requested) || requested <= 0) throw new Error("Quantity must be positive");
  let remaining = requested;
  const allocations: Array<{ id: number; location: string; quantity: number }> = [];
  for (const row of rows) {
    if (remaining <= 0) break;
    const quantity = Math.min(Math.max(0, row.available), remaining);
    if (quantity > 0) allocations.push({ id: row.id, location: row.location, quantity });
    remaining -= quantity;
  }
  if (remaining > 0.0005) throw new Error("Insufficient stock across inventory locations");
  return allocations;
}
