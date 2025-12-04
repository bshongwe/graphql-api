import DataLoader from "dataloader";
import { prisma } from "../infrastructure/prismaClient.js";

export function createLoaders() {
  const userLoader = new DataLoader(async (ids: readonly number[]) => {
    const rows = await prisma.user.findMany({ where: { id: { in: ids as number[] } } });
    const map = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => map.get(id as number) ?? null);
  });

  return { userLoader };
}