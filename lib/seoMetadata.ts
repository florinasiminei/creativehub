import type { Metadata } from "next";

export const DEFAULT_SOCIAL_IMAGE = "/images/og-default.png";
const DEFAULT_SOCIAL_IMAGE_ALT = "CABN — cabane premium, tiny houses si retreat-uri";
const DEFAULT_TWITTER_SITE = process.env.NEXT_PUBLIC_TWITTER_SITE;
const DEFAULT_TWITTER_CREATOR = process.env.NEXT_PUBLIC_TWITTER_CREATOR;

type BuildSocialMetadataInput = {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
  imageAlt?: string;
  type?: "website" | "article";
  twitterSite?: string;
  twitterCreator?: string;
};

export function buildSocialMetadata({
  title,
  description,
  canonicalUrl,
  imageUrl = DEFAULT_SOCIAL_IMAGE,
  imageAlt,
  type = "website",
  twitterSite,
  twitterCreator,
}: BuildSocialMetadataInput): Pick<Metadata, "openGraph" | "twitter"> {
  const finalImageAlt = imageAlt || title || DEFAULT_SOCIAL_IMAGE_ALT;
  const finalTwitterSite = twitterSite || DEFAULT_TWITTER_SITE;
  const finalTwitterCreator = twitterCreator || DEFAULT_TWITTER_CREATOR;
  const secureImageUrl = imageUrl.startsWith("https://") ? imageUrl : undefined;

  return {
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type,
      siteName: "cabn",
      locale: "ro_RO",
      images: [
        {
          url: imageUrl,
          secureUrl: secureImageUrl,
          width: 1200,
          height: 630,
          alt: finalImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
      ...(finalTwitterSite ? { site: finalTwitterSite } : {}),
      ...(finalTwitterCreator ? { creator: finalTwitterCreator } : {}),
    },
  };
}
