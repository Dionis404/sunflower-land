import Decimal from "decimal.js-light";
import {
  getBarnDelightCost,
  handleFoodXP,
  isMaxLevel,
  REQUIRED_FOOD_QTY,
} from "features/game/events/landExpansion/feedAnimal";
import { isAnimalFeedable } from "features/game/events/landExpansion/buyAnimal";
import {
  getAnimalFavoriteFood,
  getAnimalLevel,
  getBoostedFoodQuantity,
  makeAnimalBuildingKey,
} from "features/game/lib/animals";
import { isCollectibleBuilt } from "features/game/lib/collectibleBuilt";
import { getKeys } from "lib/object";
import type {
  Animal,
  AnimalFoodName,
  AnimalMedicineName,
  GameState,
} from "features/game/types/game";
import {
  ANIMAL_LEVELS,
  type AnimalLevel,
  type AnimalType,
} from "features/game/types/animals";

const MAX_FEED_STEPS_TO_READY = 100;

const hasFreeFeedBoost = (animalType: AnimalType, game: GameState) => {
  if (animalType === "Chicken") {
    return isCollectibleBuilt({ name: "Gold Egg", game });
  }

  if (animalType === "Cow") {
    return isCollectibleBuilt({ name: "Golden Cow", game });
  }

  if (animalType === "Sheep") {
    return isCollectibleBuilt({ name: "Golden Sheep", game });
  }

  return false;
};

const isAwakeAndRequestingFood = (animal: Animal) =>
  animal.awakeAt <= Date.now() &&
  (animal.state === "idle" ||
    animal.state === "happy" ||
    animal.state === "sad");

const isEligibleToFeed = (
  animal: Animal,
  game: GameState,
  buildingKey: "henHouse" | "barn",
) =>
  animal.state !== "sick" &&
  isAwakeAndRequestingFood(animal) &&
  !hasFreeFeedBoost(animal.type, game) &&
  isAnimalFeedable(buildingKey, game, animal.id);

const isReadyAfterFoodXP = ({
  animal,
  experience,
  foodXp,
}: {
  animal: AnimalType;
  experience: number;
  foodXp: number;
}) => {
  const nextExperience = experience + foodXp;

  if (!isMaxLevel(animal, experience)) {
    return (
      getAnimalLevel(experience, animal) !==
      getAnimalLevel(nextExperience, animal)
    );
  }

  const maxLevel = (getKeys(ANIMAL_LEVELS[animal]).length - 1) as AnimalLevel;
  const levelBeforeMax = (maxLevel - 1) as AnimalLevel;
  const maxLevelXp = ANIMAL_LEVELS[animal][maxLevel];
  const levelBeforeMaxXp = ANIMAL_LEVELS[animal][levelBeforeMax];
  const cycleXP = maxLevelXp - levelBeforeMaxXp;
  const excessXpBeforeFeed = Math.max(experience - maxLevelXp, 0);
  const currentCycleProgress = excessXpBeforeFeed % cycleXP;

  return currentCycleProgress + foodXp >= cycleXP;
};

/**
 * How much of its current favourite food an animal needs in total to reach
 * its next level-up (or, at max level, to complete its current XP cycle) —
 * not just its very next feed. The favourite food stays the same for every
 * step here since the loop stops the moment a level actually changes.
 */
const getFavouriteFoodUntilReady = (animal: Animal, game: GameState) => {
  const favouriteFood = getAnimalFavoriteFood(animal.type, animal.experience);
  let experience = animal.experience;
  let quantity = new Decimal(0);

  for (let step = 0; step < MAX_FEED_STEPS_TO_READY; step += 1) {
    const level = getAnimalLevel(experience, animal.type);
    const { foodXp } = handleFoodXP({
      state: game,
      animal: animal.type,
      level,
      food: favouriteFood,
    });

    if (foodXp <= 0) break;

    const { foodQuantity } = getBoostedFoodQuantity({
      animalType: animal.type,
      foodQuantity: REQUIRED_FOOD_QTY[animal.type],
      game,
      animal: { ...animal, experience },
    });

    quantity = quantity.add(foodQuantity);

    if (isReadyAfterFoodXP({ animal: animal.type, experience, foodXp })) {
      break;
    }

    experience += foodXp;
  }

  return { food: favouriteFood, quantity };
};

/**
 * Total favourite-food requirement for every eligible animal in `building`
 * to reach its next level-up, grouped by the specific food each favours.
 */
const getFavouriteFoodRequests = (
  game: GameState,
  buildingKey: "henHouse" | "barn",
  animals: Animal[],
) => {
  const requests: Partial<Record<AnimalFoodName, Decimal>> = {};

  animals.forEach((animal) => {
    if (!isEligibleToFeed(animal, game, buildingKey)) return;

    const { food, quantity } = getFavouriteFoodUntilReady(animal, game);

    requests[food] = (requests[food] ?? new Decimal(0)).add(quantity);
  });

  return requests;
};

/**
 * How much of `item` is needed right now to feed every animal in `building`
 * that is waiting on it for their next feed.
 *
 * Omnifeed is treated as a fallback rather than a food players mix directly
 * to order: it only counts the portion of each favourite food's requirement
 * that the player's own stock of that food can't already cover, so it never
 * suggests replacing food the player already has on hand.
 */
export function getNeededFeedAmount({
  game,
  building,
  item,
}: {
  game: GameState;
  building: "Hen House" | "Barn";
  item: AnimalFoodName | AnimalMedicineName;
}): Decimal {
  const buildingKey = makeAnimalBuildingKey(building);
  const animals = Object.values(game[buildingKey].animals);

  if (item === "Barn Delight") {
    return animals.reduce((sum, animal) => {
      if (animal.state !== "sick") return sum;

      const { amount } = getBarnDelightCost({ state: game });
      return sum.add(amount);
    }, new Decimal(0));
  }

  const requests = getFavouriteFoodRequests(game, buildingKey, animals);

  if (item === "Omnifeed") {
    return getKeys(requests).reduce((sum, food) => {
      const requested = requests[food] ?? new Decimal(0);
      const inStock = game.inventory[food] ?? new Decimal(0);
      const missing = requested.sub(inStock);

      return missing.gt(0) ? sum.add(missing) : sum;
    }, new Decimal(0));
  }

  return requests[item] ?? new Decimal(0);
}

/**
 * How much of `item` still needs to be mixed after accounting for what's
 * already in the inventory. Omnifeed is a kept-in-reserve item, not a
 * substitute the mixer should reach for automatically, so it's deliberately
 * not counted here even when `item` is a regular food.
 */
export function getFeedShortfall({
  game,
  building,
  item,
}: {
  game: GameState;
  building: "Hen House" | "Barn";
  item: AnimalFoodName | AnimalMedicineName;
}): Decimal {
  const needed = getNeededFeedAmount({ game, building, item });
  const inStock = game.inventory[item] ?? new Decimal(0);

  const shortfall = needed.sub(inStock.gt(needed) ? needed : inStock);

  return shortfall.gt(0) ? shortfall : new Decimal(0);
}
