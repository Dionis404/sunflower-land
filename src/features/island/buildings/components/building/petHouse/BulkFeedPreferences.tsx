import React, { useState } from "react";
import classNames from "classnames";
import { ButtonPanel } from "components/ui/Panel";
import { Label } from "components/ui/Label";
import { Button } from "components/ui/Button";
import { TextInput } from "components/ui/TextInput";
import { SUNNYSIDE } from "assets/sunnyside";
import { ITEM_DETAILS } from "features/game/types/images";
import { FOOD_TO_DIFFICULTY } from "features/game/events/pets/feedPet";
import type { CookableName } from "features/game/types/consumables";
import { PIXEL_SCALE } from "features/game/lib/constants";
import { useAppTranslation } from "lib/i18n/useAppTranslations";

const ALL_PET_FOODS = Array.from(FOOD_TO_DIFFICULTY.keys()).sort((a, b) =>
  a.localeCompare(b),
);

type FoodFilter = "all" | "enabled" | "excluded";

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FoodFilter>("all");

  const visibleFoods = ALL_PET_FOODS.filter((food) => {
    const isExcluded = excludedFoods.includes(food);

    if (filter === "enabled" && isExcluded) return false;
    if (filter === "excluded" && !isExcluded) return false;

    if (search && !food.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row items-center gap-1 justify-between">
        <div className="flex flex-row items-center gap-1">
          <img
            src={SUNNYSIDE.icons.arrow_left}
            style={{ width: `${PIXEL_SCALE * 11}px` }}
            className="cursor-pointer"
            alt={t("close")}
            onClick={onBack}
          />
          <Label type="default">{t("pets.bulkFeedPreferences")}</Label>
        </div>
      </div>
      <p className="text-xs px-1">{t("pets.bulkFeedPreferencesDescription")}</p>
      <TextInput
        value={search}
        onValueChange={setSearch}
        onCancel={() => setSearch("")}
        icon={SUNNYSIDE.icons.search}
        placeholder={t("searchHere")}
      />
      <div className="flex flex-row gap-1 w-full">
        <Button
          className="flex-1 min-w-0"
          disabled={filter === "all"}
          onClick={() => setFilter("all")}
        >
          {t("pets.bulkFeedFilterAll")}
        </Button>
        <Button
          className="flex-1 min-w-0"
          disabled={filter === "enabled"}
          onClick={() => setFilter("enabled")}
        >
          {t("pets.bulkFeedFilterEnabled")}
        </Button>
        <Button
          className="flex-1 min-w-0"
          disabled={filter === "excluded"}
          onClick={() => setFilter("excluded")}
        >
          {t("pets.bulkFeedFilterExcluded")}
        </Button>
      </div>
      <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto scrollable pr-1">
        {visibleFoods.length === 0 && (
          <p className="text-xs p-1">{t("pets.bulkFeedNoFoodsFound")}</p>
        )}
        {visibleFoods.map((food) => {
          const isExcluded = excludedFoods.includes(food);
          const foodImage = ITEM_DETAILS[food]?.image;

          return (
            <ButtonPanel
              key={food}
              className={classNames(
                "relative flex items-center gap-2 p-1 cursor-pointer",
                { "opacity-50": isExcluded },
              )}
              onClick={() => onToggle(food)}
              selected={!isExcluded}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: `${PIXEL_SCALE * 12}px`,
                  height: `${PIXEL_SCALE * 12}px`,
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
              <span className="text-xs text-brown-800 flex-1 text-left">
                {food}
              </span>
              {isExcluded && (
                <img
                  src={SUNNYSIDE.icons.cancel}
                  alt="Excluded"
                  className="w-5 h-5 object-contain shrink-0"
                />
              )}
            </ButtonPanel>
          );
        })}
      </div>
      <Button onClick={onBack}>{t("close")}</Button>
    </div>
  );
};
