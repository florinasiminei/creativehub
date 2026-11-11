'use client';

import OwnerOtpGate from '@/components/forms/OwnerOtpGate';
import OwnerPropertyForm from '@/components/forms/OwnerPropertyForm';
import type { FacilityOption } from '@/lib/listings/listingForm';

export default function AddPropertyPage({ initialFacilities, promotionEnabled = false }: { initialFacilities: FacilityOption[]; promotionEnabled?: boolean }) {
  return (
    <OwnerOtpGate purpose="listing-create">
      {({ session }) => (
        <OwnerPropertyForm key={session.user.id} mode="create" initialFacilities={initialFacilities} session={session} promotionEnabled={promotionEnabled} />
      )}
    </OwnerOtpGate>
  );
}
