import Decimal from "decimal.js-light";

import type { GameState } from "features/game/types/game";
import { SEEDS, type SeedName } from "features/game/types/seeds";
import { getBuyPrice } from "features/game/events/landExpansion/seedBought";
import { INVENTORY_LIMIT } from "features/game/lib/constants";
import { setPrecision } from "lib/utils/formatNumber";
import {
  getAscensionLevel,
  meetsLevelRequirement,
} from "features/game/lib/level";
import { makeBulkBuySeeds } from "./makeBulkBuyAmount";

export type SeedPurchase = {
  seedName: SeedName;
  amount: number;
  price: number;
};

export type SeedPurchasePlan = {
  purchases: SeedPurchase[];
  totalCost: number;
};

function isSeedLocked(seedName: SeedName, state: GameState) {
  return !meetsLevelRequirement(
    getAscensionLevel({
      experience: state.bumpkin?.experience ?? 0,
      ascensionLevel: state.island.ascensionLevel ?? 0,
    }),
    SEEDS[seedName].bumpkinLevel,
  );
}

/**
 * Greedily plans the maximum affordable amount of each seed, spending from
 * a single shared coin pool in the given order. Skips seeds that are
 * locked, out of stock, would exceed the inventory limit, whose planting
 * spot isn't owned yet, or that are already unaffordable by the time their
 * turn comes up.
 */
export function planSeedPurchases(
  state: GameState,
  seedNames: SeedName[],
): SeedPurchasePlan {
  let remainingCoins = state.coins;
  const purchases: SeedPurchase[] = [];
  const seen = new Set<SeedName>();

  seedNames.forEach((seedName) => {
    if (seen.has(seedName)) return;
    seen.add(seedName);

    const seed = SEEDS[seedName];

    // Mirrors the planting-spot check in seedBought.ts exactly: only skip
    // when the spot is required AND present with less than 1 - a Decimal
    // is always truthy as a JS object, so a plain `!` check here would
    // wrongly treat an owned-but-zero spot as available.
    const requiredPlantingSpot = seed.plantingSpot;
    if (
      requiredPlantingSpot &&
      state.inventory[requiredPlantingSpot]?.lessThan(1)
    ) {
      return;
    }
    if (isSeedLocked(seedName, state)) return;

    const stock = state.stock[seedName] ?? new Decimal(0);
    const inventoryLimit = INVENTORY_LIMIT(state)[seedName] ?? new Decimal(0);
    const inventoryAmount = setPrecision(
      state.inventory[seedName] ?? new Decimal(0),
      2,
    );
    const bulkBuyLimit = inventoryLimit.minus(inventoryAmount);

    let amount = makeBulkBuySeeds(stock, bulkBuyLimit);

    if (amount <= 0) return;

    const { price } = getBuyPrice(seedName, seed, state);

    if (price > 0) {
      const affordableByCoins = Math.floor(remainingCoins / price);
      amount = Math.min(amount, affordableByCoins);
    }

    if (amount <= 0) return;

    purchases.push({ seedName, amount, price });
    remainingCoins -= amount * price;
  });

  const totalCost = purchases.reduce(
    (sum, purchase) => sum + purchase.amount * purchase.price,
    0,
  );

  return { purchases, totalCost };
}
