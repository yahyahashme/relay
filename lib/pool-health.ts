import { shopRating } from "./credit";
import type { PoolHealth, Shop } from "./types";

/** Pool-level numbers from every shop (#220): how many, the default rate, and the spread of ratings. */
export function poolHealth(shops: Shop[], creditEver: number, now: number): PoolHealth {
  const ratings = { high: 0, good: 0, fair: 0, low: 0 };
  let writtenOff = 0;
  for (const shop of shops) {
    writtenOff += shop.writtenOff ?? 0;
    const { rating } = shopRating(shop, now);
    if (rating >= 8) ratings.high += 1;
    else if (rating >= 6) ratings.good += 1;
    else if (rating >= 4) ratings.fair += 1;
    else ratings.low += 1;
  }
  return { shops: shops.length, defaultRate: creditEver > 0 ? writtenOff / creditEver : 0, ratings };
}
