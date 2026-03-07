/** @type {import('next').NextConfig} */
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
let r2RemotePattern = null;

if (r2PublicBaseUrl) {
  try {
    const parsed = new URL(r2PublicBaseUrl);
    const basePath = parsed.pathname.replace(/\/+$/, '');
    r2RemotePattern = {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      pathname: basePath ? `${basePath}/**` : '/**',
    };
  } catch {
    r2RemotePattern = null;
  }
}

const nextConfig = {
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sjxiiqywwmcnluhaijxh.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      ...(r2RemotePattern ? [r2RemotePattern] : []),
    ],
  },
};

export default nextConfig;
