import {
  createOwnerListing,
  reorderOwnerListingImages,
  submitOwnerListing,
  updateOwnerListing,
} from '@/lib/api/ownerListings';

type PersistAddPropertyOptions = {
  listingId: string | null;
  expectedOwnerId: string;
  payload: Record<string, unknown>;
  facilities: string[];
  honeypot: string;
  uploadPendingFiles: (listingId: string, expectedOwnerId: string) => Promise<void>;
  getOrderedImageIds: () => string[];
  onListingReady: (listingId: string) => void;
};

export default async function persistAddProperty({
  listingId,
  expectedOwnerId,
  payload,
  facilities,
  honeypot,
  uploadPendingFiles,
  getOrderedImageIds,
  onListingReady,
}: PersistAddPropertyOptions) {
  let activeListingId = listingId;

  if (activeListingId) {
    await updateOwnerListing(
      { id: activeListingId, ...payload, facilities },
      expectedOwnerId,
    );
  } else {
    const created = await createOwnerListing(
      { ...payload, honeypot },
      facilities,
      expectedOwnerId,
    );
    activeListingId = created.id;
    onListingReady(activeListingId);
  }

  await uploadPendingFiles(activeListingId, expectedOwnerId);

  const orderedImageIds = getOrderedImageIds();
  if (orderedImageIds.length > 0) {
    await reorderOwnerListingImages(activeListingId, orderedImageIds, expectedOwnerId);
  }

  await submitOwnerListing(activeListingId, expectedOwnerId, honeypot);
  return activeListingId;
}
