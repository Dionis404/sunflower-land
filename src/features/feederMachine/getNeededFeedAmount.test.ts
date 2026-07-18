import Decimal from "decimal.js-light";
import { INITIAL_FARM } from "features/game/lib/constants";
import type { Animal } from "features/game/types/game";
import { getFeedShortfall, getNeededFeedAmount } from "./getNeededFeedAmount";

describe("getNeededFeedAmount", () => {
  const animal = ({
    state,
    type,
  }: {
    state: Animal["state"];
    type: Animal["type"];
  }): Animal => ({
    id: "0",
    type,
    createdAt: 0,
    state,
    experience: 0,
    asleepAt: 0,
    awakeAt: 0,
    lovedAt: 0,
    item: "Petting Hand",
  });

  it("sums the favourite food quantity for animals awaiting it", () => {
    const needed = getNeededFeedAmount({
      game: {
        ...INITIAL_FARM,
        henHouse: {
          ...INITIAL_FARM.henHouse,
          animals: {
            "0": animal({ state: "idle", type: "Chicken" }),
            "1": animal({ state: "sad", type: "Chicken" }),
          },
        },
      },
      building: "Hen House",
      item: "Kernel Blend",
    });

    expect(needed).toEqual(new Decimal(2));
  });

  it("projects feeds until the animal's next level-up, not just its next feed", () => {
    const needed = getNeededFeedAmount({
      game: {
        ...INITIAL_FARM,
        barn: {
          ...INITIAL_FARM.barn,
          animals: {
            "0": animal({ state: "idle", type: "Cow" }),
          },
        },
      },
      building: "Barn",
      item: "Kernel Blend",
    });

    // A single feed only grants 60 XP toward Cow's 180 XP level-1 threshold,
    // so 3 feeds of 5 are needed — not just the 5 for one feed.
    expect(needed).toEqual(new Decimal(15));
  });

  it("ignores animals whose favourite food differs", () => {
    const needed = getNeededFeedAmount({
      game: {
        ...INITIAL_FARM,
        henHouse: {
          ...INITIAL_FARM.henHouse,
          animals: {
            "0": animal({ state: "idle", type: "Chicken" }),
          },
        },
      },
      building: "Hen House",
      item: "Hay",
    });

    expect(needed).toEqual(new Decimal(0));
  });

  it("counts Omnifeed against every eligible animal's favourite food when none of it is stocked", () => {
    const needed = getNeededFeedAmount({
      game: {
        ...INITIAL_FARM,
        barn: {
          ...INITIAL_FARM.barn,
          animals: {
            "0": animal({ state: "idle", type: "Cow" }),
            "1": animal({ state: "idle", type: "Sheep" }),
          },
        },
      },
      building: "Barn",
      item: "Omnifeed",
    });

    // Cow needs 3 feeds of 5 Kernel Blend to reach level 1 (15), Sheep needs
    // 2 feeds of 3 (6) — 21 Kernel Blend total until both level up.
    expect(needed).toEqual(new Decimal(21));
  });

  it("only suggests Omnifeed for the portion the regular food's own stock doesn't already cover", () => {
    const needed = getNeededFeedAmount({
      game: {
        ...INITIAL_FARM,
        inventory: {
          "Kernel Blend": new Decimal(5),
        },
        barn: {
          ...INITIAL_FARM.barn,
          animals: {
            "0": animal({ state: "idle", type: "Cow" }),
            "1": animal({ state: "idle", type: "Sheep" }),
          },
        },
      },
      building: "Barn",
      item: "Omnifeed",
    });

    // 21 Kernel Blend requested until level-up; 5 already in stock, so
    // Omnifeed only needs to stand in for the remaining 16.
    expect(needed).toEqual(new Decimal(16));
  });

  it("suggests no Omnifeed once the regular food's own stock fully covers demand", () => {
    const needed = getNeededFeedAmount({
      game: {
        ...INITIAL_FARM,
        inventory: {
          "Kernel Blend": new Decimal(21),
        },
        barn: {
          ...INITIAL_FARM.barn,
          animals: {
            "0": animal({ state: "idle", type: "Cow" }),
            "1": animal({ state: "idle", type: "Sheep" }),
          },
        },
      },
      building: "Barn",
      item: "Omnifeed",
    });

    expect(needed).toEqual(new Decimal(0));
  });

  it("only counts Barn Delight for sick animals", () => {
    const needed = getNeededFeedAmount({
      game: {
        ...INITIAL_FARM,
        barn: {
          ...INITIAL_FARM.barn,
          animals: {
            "0": animal({ state: "sick", type: "Cow" }),
            "1": animal({ state: "idle", type: "Cow" }),
          },
        },
      },
      building: "Barn",
      item: "Barn Delight",
    });

    expect(needed).toEqual(new Decimal(1));
  });

  it("ignores sleeping and ready animals", () => {
    const needed = getNeededFeedAmount({
      game: {
        ...INITIAL_FARM,
        henHouse: {
          ...INITIAL_FARM.henHouse,
          animals: {
            "0": animal({ state: "ready", type: "Chicken" }),
            "1": {
              ...animal({ state: "idle", type: "Chicken" }),
              awakeAt: Date.now() + 60 * 60 * 1000,
            },
          },
        },
      },
      building: "Hen House",
      item: "Kernel Blend",
    });

    expect(needed).toEqual(new Decimal(0));
  });
});

describe("getFeedShortfall", () => {
  const animal = ({
    state,
    type,
  }: {
    state: Animal["state"];
    type: Animal["type"];
  }): Animal => ({
    id: "0",
    type,
    createdAt: 0,
    state,
    experience: 0,
    asleepAt: 0,
    awakeAt: 0,
    lovedAt: 0,
    item: "Petting Hand",
  });

  it("ignores Omnifeed on hand when mixing a regular food — it's kept in reserve, not substituted in", () => {
    const shortfall = getFeedShortfall({
      game: {
        ...INITIAL_FARM,
        inventory: {
          Omnifeed: new Decimal(5),
        },
        henHouse: {
          ...INITIAL_FARM.henHouse,
          animals: {
            "0": animal({ state: "idle", type: "Chicken" }),
            "1": animal({ state: "sad", type: "Chicken" }),
          },
        },
      },
      building: "Hen House",
      item: "Kernel Blend",
    });

    expect(shortfall).toEqual(new Decimal(2));
  });

  it("needs nothing once the regular food's own stock covers the requirement", () => {
    const shortfall = getFeedShortfall({
      game: {
        ...INITIAL_FARM,
        inventory: {
          "Kernel Blend": new Decimal(2),
        },
        henHouse: {
          ...INITIAL_FARM.henHouse,
          animals: {
            "0": animal({ state: "idle", type: "Chicken" }),
            "1": animal({ state: "sad", type: "Chicken" }),
          },
        },
      },
      building: "Hen House",
      item: "Kernel Blend",
    });

    expect(shortfall).toEqual(new Decimal(0));
  });

  it("still uses Omnifeed's own stock when Omnifeed itself is selected", () => {
    const shortfall = getFeedShortfall({
      game: {
        ...INITIAL_FARM,
        inventory: {
          Omnifeed: new Decimal(1),
        },
        henHouse: {
          ...INITIAL_FARM.henHouse,
          animals: {
            "0": animal({ state: "idle", type: "Chicken" }),
            "1": animal({ state: "sad", type: "Chicken" }),
          },
        },
      },
      building: "Hen House",
      item: "Omnifeed",
    });

    // Only the 1 Omnifeed already owned counts — it isn't added a second
    // time as its own "available Omnifeed" offset.
    expect(shortfall).toEqual(new Decimal(1));
  });
});
