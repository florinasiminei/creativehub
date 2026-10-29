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

// Inline scripts are required by Next.js; Google Maps also requires unsafe-eval.
// Keep this compatible policy when navigating to the property forms client-side.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.ggpht.com https://*.googleusercontent.com https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https: wss:" + (process.env.NODE_ENV === 'production' ? '' : ' ws:'),
  "frame-src 'self' https://*.google.com https://vercel.live",
  "worker-src 'self' blob:",
  "media-src 'self' blob: https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'self'",
  ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig = {
  // Keep the running dev server from overwriting a production build.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }]
            : []),
        ],
      },
    ];
  },
  images: {
    // Serve R2 image URLs directly; do not enable Vercel Image Optimization.
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [48, 64, 96, 128, 192, 224, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.cabn.ro',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sjxiiqywwmcnluhaijxh.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'wqogynlfehnwdlbvquos.supabase.co',
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
