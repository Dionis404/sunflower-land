import React from "react";
import { ButtonPanel } from "components/ui/Panel";
import { Label } from "components/ui/Label";
import { Button } from "components/ui/Button";
import { SUNNYSIDE } from "assets/sunnyside";
import { ITEM_DETAILS } from "features/game/types/images";
import { FOOD_TO_DIFFICULTY } from "features/game/events/pets/feedPet";
import type { CookableName } from "features/game/types/consumables";
import { PIXEL_SCALE } from "features/game/lib/constants";
import { useAppTranslation } from "lib/i18n/useAppTranslations";

const ALL_PET_FOODS = Array.from(FOOD_TO_DIFFICULTY.keys()).sort((a, b) =>
  a.localeCompare(b),
);

type Props = {
  excludedFoods: CookableName[];
  onToggle: (food: CookableName) => void;
  onBack: () => void;
};

export const BulkFeedPreferences: React.FC<Props> = ({
  excludedFoods,
  onToggle,
  onBack,
}) => {
  const { t } = useAppTranslation();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row items-center gap-1 justify-between">
        <div className="flex flex-row items-center gap-1">
          <img
            src={SUNNYSIDE.icons.arrow_left}
            style={{ width: `${PIXEL_SCALE * 11}px` }}
            className="cursor-pointer"
            onClick={onBack}
          />
          <Label type="default">{t("pets.bulkFeedPreferences")}</Label>
        </div>
      </div>
      <p className="text-xs px-1">{t("pets.bulkFeedPreferencesDescription")}</p>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
        {ALL_PET_FOODS.map((food) => {
          const isExcluded = excludedFoods.includes(food);
          const foodImage = ITEM_DETAILS[food]?.image;

          return (
            <ButtonPanel
              key={food}
              className="relative flex items-center justify-center p-1 cursor-pointer"
              onClick={() => onToggle(food)}
              selected={!isExcluded}
            >
              {isExcluded && (
                <img
                  src={SUNNYSIDE.icons.cancel}
                  alt="Excluded"
                  className="absolute top-0 right-0 w-4 h-4 object-contain z-10"
                />
              )}
              <div
                className="flex items-center justify-center"
                style={{
                  width: `${PIXEL_SCALE * 12}px`,
                  height: `${PIXEL_SCALE * 12}px`,
                  opacity: isExcluded ? 0.4 : 1,
                }}
              >
                {foodImage && (
                  <img
                    src={foodImage}
                    alt={food}
                    className="w-[85%] h-[85%] object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                )}
              </div>
            </ButtonPanel>
          );
        })}
      </div>
      <Button onClick={onBack}>{t("close")}</Button>
    </div>
  );
};
