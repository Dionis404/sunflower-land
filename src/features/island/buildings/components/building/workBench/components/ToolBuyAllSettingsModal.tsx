import React, { useContext, useEffect, useState } from "react";

import { Modal } from "components/ui/Modal";
import { CloseButtonPanel } from "features/game/components/CloseablePanel";
import { NumberInput } from "components/ui/NumberInput";
import { Button } from "components/ui/Button";
import { Label } from "components/ui/Label";
import { Checkbox } from "components/ui/Checkbox";
import { ButtonPanel } from "components/ui/Panel";
import Decimal from "decimal.js-light";

import { Context } from "features/game/GameProvider";
import { ITEM_DETAILS } from "features/game/types/images";
import type { WorkbenchToolName, Tool } from "features/game/types/tools";
import type { ToolShopBuyAllSetting } from "features/game/events/updateToolShopSettings";
import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { SUNNYSIDE } from "assets/sunnyside";

type Props = {
  show: boolean;
  onClose: () => void;
  tools: [WorkbenchToolName, Tool][];
  settings: Partial<Record<WorkbenchToolName, ToolShopBuyAllSetting>>;
  buyAllEnabled: boolean;
};

export const ToolBuyAllSettingsModal: React.FC<Props> = ({
  show,
  onClose,
  tools,
  settings,
  buyAllEnabled,
}) => {
  const { gameService } = useContext(Context);
  const { t } = useAppTranslation();

  const [draft, setDraft] =
    useState<Partial<Record<WorkbenchToolName, ToolShopBuyAllSetting>>>(
      settings,
    );
  const [enabledDraft, setEnabledDraft] = useState(buyAllEnabled);

  // The modal stays mounted between opens (only `show` toggles visibility),
  // so the draft needs to be re-synced from the latest saved settings each
  // time it's reopened - otherwise it keeps showing whatever was in the
  // draft the last time this instance was mounted.
  useEffect(() => {
    if (!show) return;

    setDraft(settings);
    setEnabledDraft(buyAllEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const toggleBlocked = (toolName: WorkbenchToolName) => {
    setDraft((previous) => ({
      ...previous,
      [toolName]: {
        ...previous[toolName],
        blocked: !previous[toolName]?.blocked,
      },
    }));
  };

  const setMaxInInventory = (toolName: WorkbenchToolName, value: Decimal) => {
    setDraft((previous) => ({
      ...previous,
      [toolName]: {
        ...previous[toolName],
        maxInInventory: value.toNumber(),
      },
    }));
  };

  const save = () => {
    gameService.send("toolShop.settingsUpdated", {
      settings: draft,
      buyAllEnabled: enabledDraft,
    });
    onClose();
  };

  const landTools = tools.filter(([, tool]) => tool.type === "land");
  const waterTools = tools.filter(([, tool]) => tool.type === "water");

  const renderColumn = (
    title: string,
    columnTools: [WorkbenchToolName, Tool][],
  ) => (
    <div className="w-64">
      <Label type="default" className="mb-1.5">
        {title}
      </Label>
      <div className="flex items-center mt-1 mb-1 px-1">
        <div className="w-36 pl-2">
          <Label type="warning">{t("tools.buy")}</Label>
        </div>
        <div className="flex justify-center">
          <Label type="warning" className="whitespace-nowrap">
            {t("tools.maxInInventory")}
          </Label>
        </div>
      </div>
      <div className="flex flex-col max-h-[420px] overflow-y-auto scrollable">
        {columnTools.map(([toolName]) => {
          const toolSetting = draft[toolName] ?? {};
          const blocked = !!toolSetting.blocked;

          return (
            <ButtonPanel
              key={toolName}
              onClick={() => toggleBlocked(toolName)}
              className={`flex items-center mb-1 w-60 ${
                blocked ? "grayscale brightness-75" : ""
              }`}
            >
              <div className="flex items-center flex-1">
                <div className="relative">
                  <img src={ITEM_DETAILS[toolName].image} className="h-6" />
                  {blocked && (
                    <img
                      src={SUNNYSIDE.icons.cancel}
                      className="absolute -right-1 -bottom-1 h-4"
                    />
                  )}
                </div>
                <span className="text-xs ml-1 whitespace-nowrap">
                  {toolName}
                </span>
              </div>
              <div className="w-16" onClick={(e) => e.stopPropagation()}>
                <NumberInput
                  value={new Decimal(toolSetting.maxInInventory ?? 0)}
                  maxDecimalPlaces={0}
                  onValueChange={(value) => setMaxInInventory(toolName, value)}
                />
              </div>
            </ButtonPanel>
          );
        })}
      </div>
    </div>
  );

  return (
    <Modal show={show} onHide={onClose} dialogClassName="!max-w-[600px]">
      <CloseButtonPanel title={t("tools.buyAllSettings")} onClose={onClose}>
        <div className="flex flex-col p-1">
          <div className="flex items-center mb-2 px-1">
            <Checkbox checked={enabledDraft} onChange={setEnabledDraft} />
            <span
              className="text-xs ml-2 cursor-pointer"
              onClick={() => setEnabledDraft((previous) => !previous)}
            >
              {t("tools.buyAllEnabled")}
            </span>
          </div>
          <div
            className={
              enabledDraft
                ? "flex items-start justify-center space-x-4"
                : "flex items-start justify-center space-x-4 grayscale brightness-75 pointer-events-none"
            }
          >
            {renderColumn(t("landTools"), landTools)}
            {renderColumn(t("waterTools"), waterTools)}
          </div>
          <Button onClick={save} className="mt-2">
            {t("save")}
          </Button>
        </div>
      </CloseButtonPanel>
    </Modal>
  );
};
