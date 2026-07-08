import { produce } from "immer";
import type { CookableName } from "features/game/types/consumables";
import type { GameState } from "features/game/types/game";

export type UpdateBulkFeedExclusionsAction = {
  type: "pets.bulkFeedExclusionsUpdated";
  exclusions: CookableName[];
};

type Options = {
  state: Readonly<GameState>;
  action: UpdateBulkFeedExclusionsAction;
};

export function updateBulkFeedExclusions({ state, action }: Options) {
  return produce(state, (stateCopy) => {
    if (!stateCopy.pets) {
      stateCopy.pets = {};
    }

    stateCopy.pets.bulkFeedExclusions = action.exclusions;

    return stateCopy;
  });
}
