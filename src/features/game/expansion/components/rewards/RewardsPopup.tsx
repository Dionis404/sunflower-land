import React, { useContext, useEffect } from "react";

import { Context } from "features/game/GameProvider";
import { Button } from "components/ui/Button";
import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { useClaimableRewards } from "./useClaimableRewards";
import { RewardsBreakdown } from "./RewardsBreakdown";

/**
 * Auto-shown when the machine lands on "airdrop" or "marketplaceSale" (e.g.
 * right after the daily reward is acknowledged). Claiming everything here
 * sends CLOSE, returning to "playing".
 */
export const RewardsPopup: React.FC = () => {
  const { gameService } = useContext(Context);
  const { t } = useAppTranslation();

  const { game, airdrops, soldListingIds, listings, totalCount, claimAll } =
    useClaimableRewards();

  const onClaimAll = () => {
    claimAll();
    gameService.send("CLOSE");
  };

  // Someone else (e.g. the mailbox Rewards tab) may have already claimed
  // everything while the machine was still sitting in "airdrop" /
  // "marketplaceSale" - without this, the shared modal would be stuck open
  // with nothing to show and no way to dismiss it.
  useEffect(() => {
    if (totalCount === 0) {
      gameService.send("CLOSE");
    }
  }, [totalCount, gameService]);

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="p-1">
      <div className="max-h-[400px] overflow-y-auto scrollable pr-0.5">
        <RewardsBreakdown
          game={game}
          airdrops={airdrops}
          soldListingIds={soldListingIds}
          listings={listings}
        />
      </div>
      <Button className="mt-2" onClick={onClaimAll}>
        {`${t("mailbox.rewards.claimAll")} (${totalCount})`}
      </Button>
    </div>
  );
};
