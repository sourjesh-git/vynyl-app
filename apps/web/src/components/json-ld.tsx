export function JsonLd() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://vynyl-web.vercel.app';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'vynyl',
    url: baseUrl,
    description:
      'Collaborative, real-time synchronized music rooms. Create a room, invite your friends, and jam together in sync with zero login required.',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript and Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Sourjesh Mukherjee',
      url: 'https://github.com/sourjesh-git',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
