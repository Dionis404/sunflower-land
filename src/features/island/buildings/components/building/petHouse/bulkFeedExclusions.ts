import type { CookableName } from "features/game/types/consumables";

/**
 * Foods the player has opted out of using during Pet House bulk feed.
 * Stored locally (not synced to the farm save) so the choice is a client-side
 * convenience preference rather than game state.
 */
const LOCAL_STORAGE_KEY = "petHouse.bulkFeedExclusions";

export function getBulkFeedExclusions(): CookableName[] {
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);

  if (!cached) {
    return [];
  }

  try {
    return JSON.parse(cached);
  } catch {
    return [];
  }
}

export function setBulkFeedExclusions(exclusions: CookableName[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(exclusions));
}
