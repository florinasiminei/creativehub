import { permanentRedirect } from "next/navigation";

type LegacyPageProps = {
  params: {
    type: string;
    facility: string;
    slug: string;
  };
};

export default function LegacyTypeFacilityCountyRedirect({ params }: LegacyPageProps) {
  permanentRedirect(`/cazari/${params.type}/${params.facility}/${params.slug}`);
}
