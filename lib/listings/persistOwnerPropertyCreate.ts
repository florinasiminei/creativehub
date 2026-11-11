import {
  createOwnerListing,
  reorderOwnerListingImages,
  submitOwnerListing,
  updateOwnerListing,
} from '@/lib/api/ownerListings';

type PersistOwnerPropertyCreateOptions = {
  listingId: string | null;
  creationId: string;
  expectedOwnerId: string;
  payload: Record<string, unknown>;
  facilities: string[];
  honeypot: string;
  uploadPendingFiles: (listingId: string, expectedOwnerId: string) => Promise<void>;
  getOrderedImageIds: () => string[];
  onListingReady: (listingId: string) => void;
};

export default async function persistOwnerPropertyCreate({
  listingId,
  creationId,
  expectedOwnerId,
  payload,
  facilities,
  honeypot,
  uploadPendingFiles,
  getOrderedImageIds,
  onListingReady,
}: PersistOwnerPropertyCreateOptions) {
  if (listingId && listingId !== creationId) {
    throw new Error('Eroare la crearea cazarii');
  }
  const created = await createOwnerListing(
    { ...payload, honeypot },
    facilities,
    expectedOwnerId,
    creationId,
  );
  const activeListingId = created.id;
  onListingReady(activeListingId);

  const editablePayload = { ...payload };
  delete editablePayload.slug;
  delete editablePayload.is_published;
  await updateOwnerListing(
    { ...editablePayload, id: activeListingId, facilities },
    expectedOwnerId,
  );

  await uploadPendingFiles(activeListingId, expectedOwnerId);

  const orderedImageIds = getOrderedImageIds();
  if (orderedImageIds.length > 0) {
    await reorderOwnerListingImages(activeListingId, orderedImageIds, expectedOwnerId);
  }

  await submitOwnerListing(activeListingId, expectedOwnerId, honeypot);
  return activeListingId;
}
