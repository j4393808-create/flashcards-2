export const SITE = {
  name: 'Kart w Ketab',
  tagline: 'Medical flashcards, word for word',
  /** Optional. Set NEXT_PUBLIC_CONTACT_EMAIL in the environment to show an official email address on the site. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || '',
  legalUpdated: 'October 22, 2026',
  export const SITE = {
  name: 'Kart w Ketab',
  tagline: 'Medical flashcards, word for word',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || '',
  contactPhone: '+201062590087', // حط رقمك هنا بالكود الدولي
  legalUpdated: 'October 22, 2026',
}
}

export const FOOTER_LINKS = [
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact us' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
] as const
