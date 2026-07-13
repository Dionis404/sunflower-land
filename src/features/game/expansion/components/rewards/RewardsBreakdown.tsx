import React from "react";
import Decimal from "decimal.js-light";

import { Box } from "components/ui/Box";
import { Label } from "components/ui/Label";
import { OuterPanel } from "components/ui/Panel";
import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { getKeys } from "lib/object";
import { formatNumber } from "lib/utils/formatNumber";
import { SUNNYSIDE } from "assets/sunnyside";
import token from "assets/icons/flower_token.webp";
import trade from "assets/icons/trade.png";
import { MARKETPLACE_TAX } from "features/game/types/marketplace";
import { getTradeableDisplay } from "features/marketplace/lib/tradeables";
import { tradeToId } from "features/marketplace/lib/offers";
import { Rewards } from "features/game/expansion/components/ClaimReward";
import type {
  Airdrop,
  GameState,
  InventoryItemName,
  TradeListing,
} from "features/game/types/game";

interface Props {
  game: GameState;
  airdrops: Airdrop[];
  soldListingIds: string[];
  listings?: Record<string, TradeListing>;
}

export const RewardsBreakdown: React.FC<Props> = ({
  game,
  airdrops,
  soldListingIds,
  listings,
}) => {
  const { t } = useAppTranslation();

  return (
    <div className="flex flex-col gap-2">
      {airdrops.length > 0 && (
        <OuterPanel className="p-2">
          <Label
            type="warning"
            icon={SUNNYSIDE.decorations.treasure_chest}
            className="mb-2"
          >
            {t("reward.discovered")}
          </Label>
          <div className="flex flex-col gap-2">
            {airdrops.map((airdrop) => (
              <div key={airdrop.id}>
                {airdrop.message && (
                  <p className="text-xs mb-1">{airdrop.message}</p>
                )}
                <Rewards reward={airdrop} />
              </div>
            ))}
          </div>
        </OuterPanel>
      )}

      {soldListingIds.length > 0 && (
        <OuterPanel className="p-2">
          <Label type="success" icon={trade} className="mb-2">
            {t("marketplace.itemSold")}
          </Label>
          <div className="flex flex-col gap-1">
            {soldListingIds.map((listingId) => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const listing = listings![listingId];
              const itemName = getKeys(listing.items)[0];
              const amount = listing.items[itemName as InventoryItemName];
              const itemId = tradeToId({ details: listing });
              const details = getTradeableDisplay({
                id: itemId,
                type: listing.collection,
                state: game,
              });

              const tax = listing.tax ?? listing.sfl * MARKETPLACE_TAX;
              const sfl = new Decimal(listing.sfl).sub(tax);

              return (
                <div key={listingId} className="flex items-center space-x-2">
                  <Box image={details.image} />
                  <div className="flex flex-col">
                    <p className="text-xs">{`${amount} x ${itemName}`}</p>
                    <div className="flex items-center space-x-1">
                      <p className="text-xs">{`${formatNumber(sfl, {
                        decimalPlaces: 4,
                      })} FLOWER`}</p>
                      <img src={token} className="w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </OuterPanel>
      )}
    </div>
  );
};
