export const MIN_PUBLISHED_LISTINGS_FOR_INDEX = 3;

export function hasMinimumPublishedListings(count: number): boolean {
  return Number(count || 0) >= MIN_PUBLISHED_LISTINGS_FOR_INDEX;
}
