import { computeBoostsForLap, type StackingState } from "./buffs";
import { LAP_COUNT, MIN_LAP_TIME, type Build, type FiredItem } from "./types";

export interface PlayerLap {
  time: number;
  firedItems: FiredItem[];
}

export function firesOnLap(cooldown: number, lap: number): boolean {
  return (lap - 1) % cooldown === 0;
}

export function simulatePlayerLaps(build: Build): PlayerLap[] {
  const activeItems = [
    ...build.board.filter((item): item is NonNullable<typeof item> => item !== null),
    ...build.storage.filter(
      (item): item is NonNullable<typeof item> => item?.activeWhileStored === true
    ),
  ];
  let stackingState: StackingState = {};

  return Array.from({ length: LAP_COUNT }, (_, index) => {
    const lap = index + 1;
    const lapBoosts = computeBoostsForLap(activeItems, lap, stackingState);
    stackingState = lapBoosts.stackingState;
    const firedItems: FiredItem[] = [];
    let time = build.car.baseLapTime;

    activeItems.forEach((item, itemIndex) => {
      if (item.buff) {
        if (item.cooldown === undefined || firesOnLap(item.cooldown, lap)) {
          firedItems.push({
            id: item.id,
            contribution:
              item.cooldown === undefined
                ? item.buff.boostPercent
                : (lapBoosts.stackingState[itemIndex] ?? 0),
          });
        }
        return;
      }
      if (item.cooldown === undefined || !firesOnLap(item.cooldown, lap)) return;

      const boostPercent = item.identityTag
        ? (lapBoosts.boostsByTag[item.identityTag] ?? 0)
        : 0;
      const contribution = item.timeModifier * (1 + boostPercent / 100);
      time += contribution;
      firedItems.push({ id: item.id, contribution });
    });

    return {
      time: Math.max(MIN_LAP_TIME, time),
      firedItems,
    };
  });
}