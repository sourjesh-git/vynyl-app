import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://vynyl-web.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/api/og'],
      disallow: ['/room/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
