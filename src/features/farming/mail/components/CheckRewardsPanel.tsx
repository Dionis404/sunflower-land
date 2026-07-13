import React, { useContext, useEffect, useRef, useState } from "react";

import { Context } from "features/game/GameProvider";
import { Button } from "components/ui/Button";
import { Loading } from "features/auth/components";
import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { SUNNYSIDE } from "assets/sunnyside";
import type { MachineState } from "features/game/lib/gameMachine";
import { useClaimableRewards } from "features/game/expansion/components/rewards/useClaimableRewards";
import { RewardsBreakdown } from "features/game/expansion/components/rewards/RewardsBreakdown";

interface Props {
  onClose: () => void;
}

export const CheckRewardsPanel: React.FC<Props> = ({ onClose }) => {
  const { gameService } = useContext(Context);
  const { t } = useAppTranslation();

  const [checking, setChecking] = useState(false);
  const [showNoRewards, setShowNoRewards] = useState(false);
  const checkingRef = useRef(false);

  const { game, airdrops, soldListingIds, listings, totalCount, claimAll } =
    useClaimableRewards();

  const settle = (state: MachineState) => {
    checkingRef.current = false;
    setChecking(false);

    // We show rewards as a claimable list below instead of the machine's
    // own one-by-one popup modals, so dismiss its auto-popup routing.
    if (state.matches("airdrop") || state.matches("marketplaceSale")) {
      gameService.send("CLOSE");
      return;
    }

    if (totalCount === 0) {
      setShowNoRewards(true);
    }
  };

  // settle() closes over totalCount, which changes on every render - keep a
  // ref so the long-lived subscription below always calls the latest
  // version instead of the one captured when it first subscribed.
  const settleRef = useRef(settle);
  useEffect(() => {
    settleRef.current = settle;
  });

  // Watch the machine directly for the settled state that follows our own
  // REFRESH. Some paths (e.g. ART_MODE) resolve "loading" synchronously
  // within the same send() call, so we can't rely on ever observing a
  // transient "loading" state - just react to the first non-loading state
  // seen while a check is in flight.
  useEffect(() => {
    const subscription = gameService.subscribe((state) => {
      if (checkingRef.current && !state.matches("loading")) {
        settleRef.current(state);
      }
    });

    return () => subscription.unsubscribe();
  }, [gameService]);

  useEffect(() => {
    if (!showNoRewards) return;

    const timeout = setTimeout(() => setShowNoRewards(false), 2500);
    return () => clearTimeout(timeout);
  }, [showNoRewards]);

  const onCheck = () => {
    checkingRef.current = true;
    setShowNoRewards(false);
    setChecking(true);
    gameService.send("REFRESH");

    // Synchronous resolutions (e.g. ART_MODE) already settle by the time
    // send() returns, before the subscription above ever sees "loading".
    if (!gameService.state.matches("loading")) {
      settle(gameService.state);
    }
  };

  const onClaimAll = () => {
    claimAll();
    onClose();
  };

  return (
    <div className="flex flex-col p-2 gap-2">
      {totalCount === 0 && (
        <div className="flex flex-col items-center">
          <img
            src={SUNNYSIDE.decorations.treasure_chest}
            className="w-12 mb-2"
          />
          <p className="text-xs mb-2 text-center">
            {t("mailbox.rewards.description")}
          </p>
        </div>
      )}

      <Button onClick={onCheck} disabled={checking}>
        {checking ? (
          <Loading text={t("mailbox.rewards.checking")} />
        ) : (
          t("mailbox.rewards.check")
        )}
      </Button>

      {showNoRewards && (
        <p className="text-xs text-center">{t("mailbox.rewards.none")}</p>
      )}

      {totalCount > 0 && (
        <>
          <div className="max-h-64 overflow-y-auto scrollable pr-0.5">
            <RewardsBreakdown
              game={game}
              airdrops={airdrops}
              soldListingIds={soldListingIds}
              listings={listings}
            />
          </div>
          <Button onClick={onClaimAll}>
            {`${t("mailbox.rewards.claimAll")} (${totalCount})`}
          </Button>
        </>
      )}
    </div>
  );
};
