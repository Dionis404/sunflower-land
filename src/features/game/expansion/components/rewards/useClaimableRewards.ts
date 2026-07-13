import { useContext } from "react";
import { useSelector } from "@xstate/react";
import confetti from "canvas-confetti";

import { Context } from "features/game/GameProvider";
import type { MachineState } from "features/game/lib/gameMachine";
import type { Airdrop } from "features/game/types/game";
import { getKeys } from "lib/object";

export const _pendingAirdrops = (state: MachineState): Airdrop[] =>
  (state.context.state.airdrops ?? []).filter(
    (airdrop) => !airdrop.coordinates,
  );

export const _soldListingIds = (state: MachineState): string[] => {
  const { listings } = state.context.state.trades;

  return getKeys(listings ?? {}).filter(
    (id) => !!listings?.[id].fulfilledAt || !!listings?.[id].boughtAt,
  );
};

/**
 * Shared claim-all logic for pending airdrops (Telegram quest rewards,
 * dev giveaways) and fulfilled marketplace sales.
 */
export function useClaimableRewards() {
  const { gameService, showAnimations } = useContext(Context);

  const airdrops = useSelector(gameService, _pendingAirdrops);
  const soldListingIds = useSelector(gameService, _soldListingIds);
  const listings = useSelector(
    gameService,
    (state) => state.context.state.trades.listings,
  );
  const game = useSelector(gameService, (state) => state.context.state);

  const totalCount = airdrops.length + soldListingIds.length;

  const claimAll = () => {
    airdrops.forEach((airdrop) => {
      gameService.send("airdrop.claimed", { id: airdrop.id });
    });

    if (soldListingIds.length > 0) {
      gameService.send("purchase.claimed", { tradeIds: soldListingIds });

      // On-chain (signed) listings need a state refresh after claiming.
      if (soldListingIds.some((id) => listings?.[id].signature)) {
        gameService.send("RESET");
      }
    }

    if (showAnimations) confetti();
  };

  return {
    gameService,
    game,
    airdrops,
    soldListingIds,
    listings,
    totalCount,
    claimAll,
  };
}
