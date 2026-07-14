import Decimal from "decimal.js-light";

import type { GameState, InventoryItemName } from "features/game/types/game";
import {
  WORKBENCH_TOOLS,
  type WorkbenchToolName,
} from "features/game/types/tools";
import { getToolPrice } from "features/game/events/landExpansion/craftTool";
import { hasRequiredIslandExpansion } from "features/game/lib/hasRequiredIslandExpansion";
import {
  getAscensionLevel,
  meetsLevelRequirement,
} from "features/game/lib/level";
import { getObjectEntries } from "lib/object";

export type ToolPurchase = {
  toolName: WorkbenchToolName;
  amount: number;
  price: number;
  ingredients: Partial<Record<InventoryItemName, Decimal>>;
};

export type ToolPurchasePlan = {
  purchases: ToolPurchase[];
  totalCost: number;
  totalIngredients: Partial<Record<InventoryItemName, Decimal>>;
};

function isToolLocked(toolName: WorkbenchToolName, state: GameState) {
  const tool = WORKBENCH_TOOLS[toolName];

  if (!hasRequiredIslandExpansion(state.island.type, tool.requiredIsland)) {
    return true;
  }

  if (!tool.requiredLevel) return false;

  const ascension = getAscensionLevel({
    experience: state.bumpkin?.experience ?? 0,
    ascensionLevel: state.island.ascensionLevel ?? 0,
  });

  return !meetsLevelRequirement(ascension, tool.requiredLevel);
}

/**
 * Greedily plans the maximum affordable amount of each tool, spending from
 * a single shared coin pool and shared ingredient inventory in the given
 * order. Skips tools that are disabled, locked (missing island expansion
 * or required level), out of stock, blocked by the player's Buy All
 * settings, or already unaffordable/at their configured inventory cap by
 * the time their turn comes up. A `maxInInventory` of 0 (or unset) is
 * treated as unlimited, matching the settings UI's default value.
 */
export function planToolPurchases(
  state: GameState,
  toolNames: WorkbenchToolName[],
): ToolPurchasePlan {
  let remainingCoins = state.coins;
  const remainingIngredients: Partial<Record<InventoryItemName, Decimal>> = {};
  const purchases: ToolPurchase[] = [];
  const seen = new Set<WorkbenchToolName>();

  const getRemainingIngredient = (name: InventoryItemName) =>
    remainingIngredients[name] ?? state.inventory[name] ?? new Decimal(0);

  toolNames.forEach((toolName) => {
    if (seen.has(toolName)) return;
    seen.add(toolName);

    const tool = WORKBENCH_TOOLS[toolName];

    if (tool.disabled) return;
    if (isToolLocked(toolName, state)) return;

    const buyAllSetting = state.settings.toolShop?.buyAll?.[toolName];
    if (buyAllSetting?.blocked) return;

    const stock = state.stock[toolName] ?? new Decimal(0);
    let amount = stock.toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();

    if (amount <= 0) return;

    if (buyAllSetting?.maxInInventory) {
      const currentAmount = (
        state.inventory[toolName] ?? new Decimal(0)
      ).toNumber();
      const room = Math.floor(buyAllSetting.maxInInventory - currentAmount);
      amount = Math.min(amount, room);
    }

    if (amount <= 0) return;

    const price = getToolPrice(tool, 1, state);

    if (price > 0) {
      const affordableByCoins = Math.floor(remainingCoins / price);
      amount = Math.min(amount, affordableByCoins);
    }

    const ingredients = tool.ingredients(state.bumpkin.skills);

    getObjectEntries(ingredients).forEach(
      ([ingredientName, ingredientAmount]) => {
        if (!ingredientAmount) return;

        const affordableByIngredient = getRemainingIngredient(ingredientName)
          .div(ingredientAmount)
          .toDecimalPlaces(0, Decimal.ROUND_DOWN)
          .toNumber();

        amount = Math.min(amount, affordableByIngredient);
      },
    );

    if (amount <= 0) return;

    const purchaseIngredients: Partial<Record<InventoryItemName, Decimal>> = {};

    getObjectEntries(ingredients).forEach(
      ([ingredientName, ingredientAmount]) => {
        if (!ingredientAmount) return;

        const totalIngredientAmount = ingredientAmount.mul(amount);

        purchaseIngredients[ingredientName] = totalIngredientAmount;
        remainingIngredients[ingredientName] = getRemainingIngredient(
          ingredientName,
        ).sub(totalIngredientAmount);
      },
    );

    purchases.push({
      toolName,
      amount,
      price,
      ingredients: purchaseIngredients,
    });
    remainingCoins -= price * amount;
  });

  const totalCost = purchases.reduce(
    (sum, purchase) => sum + purchase.amount * purchase.price,
    0,
  );

  const totalIngredients: Partial<Record<InventoryItemName, Decimal>> = {};

  purchases.forEach((purchase) => {
    getObjectEntries(purchase.ingredients).forEach(
      ([ingredientName, ingredientAmount]) => {
        if (!ingredientAmount) return;

        totalIngredients[ingredientName] = (
          totalIngredients[ingredientName] ?? new Decimal(0)
        ).add(ingredientAmount);
      },
    );
  });

  return { purchases, totalCost, totalIngredients };
}
