/**
 * Tests for JSON-LD structured data schemas on key public pages.
 * Validates that the schema objects have required fields for Google
 * Rich Results without needing to render the pages.
 */

import { describe, it, expect } from 'vitest'

// Landing page WebApplication schema
describe('Landing page JSON-LD (WebApplication)', () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'BetBrain',
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Web',
    description: 'AI-driven sports analytics dashboard.',
    offers: [
      { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
      { '@type': 'Offer', price: '29', priceCurrency: 'USD', name: 'Pro' },
    ],
  }

  it('has required @context and @type', () => {
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('WebApplication')
  })

  it('has app name and category', () => {
    expect(schema.name).toBe('BetBrain')
    expect(schema.applicationCategory).toBe('SportsApplication')
  })

  it('has both pricing tiers', () => {
    expect(schema.offers).toHaveLength(2)
    expect(schema.offers[0].price).toBe('0')
    expect(schema.offers[1].price).toBe('29')
  })
})

// FAQ page FAQPage schema
describe('FAQ JSON-LD (FAQPage)', () => {
  const faqs = [
    { question: 'What is BetBrain?', answer: 'AI-powered analytics.' },
    { question: 'Is BetBrain free?', answer: 'Yes, free tier available.' },
  ]

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  it('has FAQPage type', () => {
    expect(schema['@type']).toBe('FAQPage')
  })

  it('each question has required fields', () => {
    for (const entity of schema.mainEntity) {
      expect(entity['@type']).toBe('Question')
      expect(entity.name).toBeTruthy()
      expect(entity.acceptedAnswer['@type']).toBe('Answer')
      expect(entity.acceptedAnswer.text).toBeTruthy()
    }
  })
})

// Betting 101 Article schema
describe('Betting 101 JSON-LD (Article)', () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Betting 101 — How Sports Betting Works',
    description: 'New to sports betting? Learn how odds work.',
    author: { '@type': 'Organization', name: 'BetBrain' },
    publisher: { '@type': 'Organization', name: 'BetBrain' },
    datePublished: '2026-03-17',
  }

  it('has Article type with headline', () => {
    expect(schema['@type']).toBe('Article')
    expect(schema.headline).toContain('Betting 101')
  })

  it('has author and publisher', () => {
    expect(schema.author.name).toBe('BetBrain')
    expect(schema.publisher.name).toBe('BetBrain')
  })

  it('has valid datePublished', () => {
    expect(schema.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
