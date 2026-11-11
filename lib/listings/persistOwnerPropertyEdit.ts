import {
  reorderOwnerListingImages,
  submitOwnerListing,
  updateOwnerListing,
} from '@/lib/api/ownerListings';
import { getOwnerSession } from '@/lib/api/ownerSession';

type PersistOwnerPropertyEditOptions = {
  listingId: string;
  expectedOwnerId: string;
  payload: Record<string, unknown>;
  facilities: string[];
  isPublished: boolean;
  uploadPendingFiles: (listingId: string, expectedOwnerId: string) => Promise<void>;
  getOrderedImageIds: () => string[];
};

export default async function persistOwnerPropertyEdit({
  listingId,
  expectedOwnerId,
  payload,
  facilities,
  isPublished,
  uploadPendingFiles,
  getOrderedImageIds,
}: PersistOwnerPropertyEditOptions) {
  // Editing keeps the existing slug and publication state.
  const editablePayload = { ...payload };
  delete editablePayload.slug;
  delete editablePayload.is_published;
  await uploadPendingFiles(listingId, expectedOwnerId);
  await updateOwnerListing({ ...editablePayload, id: listingId, facilities }, expectedOwnerId);

  const orderedImageIds = getOrderedImageIds();
  if (orderedImageIds.length > 0) {
    await reorderOwnerListingImages(listingId, orderedImageIds, expectedOwnerId);
  }
  if (!isPublished) await submitOwnerListing(listingId, expectedOwnerId);
  await getOwnerSession(expectedOwnerId);
  return listingId;
}
