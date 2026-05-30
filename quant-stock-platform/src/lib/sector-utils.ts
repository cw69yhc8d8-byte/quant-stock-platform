import type { SectorRanking } from "@/lib/types";

export function dedupeSectorRankings(items: SectorRanking[]) {
  const sectorMap = new Map<string, SectorRanking>();

  for (const item of items) {
    const normalizedName = item.name.trim();
    const existing = sectorMap.get(normalizedName);

    if (!existing || item.heat > existing.heat) {
      sectorMap.set(normalizedName, {
        ...item,
        name: normalizedName,
      });
    }
  }

  return Array.from(sectorMap.values()).map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
