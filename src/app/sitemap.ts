import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://betbrain.app'

  // Use a fixed date for static content, updated only when content actually changes.
  const staticDate = '2026-03-15'

  return [
    // Landing page
    {
      url: baseUrl,
      lastModified: staticDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Public informational pages
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: staticDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: staticDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: staticDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Blog
    {
      url: `${baseUrl}/blog`,
      lastModified: staticDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/ai-sports-betting-analytics`,
      lastModified: staticDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/blog/how-to-find-value-in-betting-lines`,
      lastModified: staticDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Auth pages — indexable for acquisition
    {
      url: `${baseUrl}/signup`,
      lastModified: staticDate,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ]
}
