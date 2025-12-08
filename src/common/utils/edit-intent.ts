export type EditIntent = {
  navbar?: {
    action: 'none' | 'replace' | 'update';
    preferredName?: string;
  };
  sections: Array<{
    id?: string;
    category?: string;
    action: 'replace' | 'remove' | 'update';
    preferredName?: string;
  }>;
};

const CAT_WORDS: Record<string, string[]> = {
  hero: ['hero', 'landing', 'banner', 'intro', 'welcome'],
  about: ['about', 'us', 'company', 'story', 'mission'],
  feature: ['feature', 'features', 'capabilities', 'benefits', 'highlights'],
  product: ['product', 'products', 'offering', 'solution', 'solutions'],
  pricing: ['pricing', 'plans', 'cost', 'subscription', 'tiers'],
  metric: ['metric', 'metrics', 'stats', 'statistics', 'numbers'],
  team: ['team', 'members', 'crew', 'staff', 'people'],
  testimonial: ['testimonial', 'testimonials', 'reviews', 'customer', 'stories'],
  socialProof: ['social proof', 'logos', 'partners', 'clients', 'trusted by'],
  faq: ['faq', 'questions', 'accordion', 'help', 'answers'],
  blog: ['blog', 'articles', 'posts', 'news', 'insights'],
  contact: ['contact', 'form', 'signup', 'newsletter', 'subscribe'],
  footer: ['footer', 'bottom', 'end'],
  navbar: ['navbar', 'navigation', 'menu', 'top bar', 'header'],
};

export function extractEditIntent(editPrompt: string, registryJson: string): EditIntent {
  const text = editPrompt.toLowerCase();
  const intent: EditIntent = { navbar: { action: 'none' }, sections: [] };

  const wantsReplace = /\b(change|switch|replace|use another|different)\b/.test(text);
  const wantsNavbar = CAT_WORDS.navbar.some((w) => text.includes(w));

  let preferredNavbarName: string | undefined;
  interface RegistryItem {
    name: string;
    [key: string]: any; // For any additional properties
  }

  interface Registry {
    componentRegistry?: Record<string, RegistryItem[]>;
    sectionRegistry?: Record<string, RegistryItem[]>;
  }

  const reg = JSON.parse(registryJson) as Registry;

  const allComponentNames = Object.values(reg.componentRegistry || {}).flatMap((components) =>
    Array.isArray(components) ? components.map((c) => c.name) : [],
  );

  const allSectionNames = Object.values(reg.sectionRegistry || {}).flatMap((sections) =>
    Array.isArray(sections) ? sections.map((s) => s.name) : [],
  );
  const allNames: string[] = [...allComponentNames, ...allSectionNames].filter(Boolean);

  const mentionedName = allNames.find((n) => text.includes(n.toLowerCase()));
  if (mentionedName && wantsNavbar) preferredNavbarName = mentionedName;

  if (wantsNavbar && wantsReplace) {
    intent.navbar = { action: 'replace', preferredName: preferredNavbarName };
  } else if (wantsNavbar) {
    intent.navbar = { action: 'update' };
  }

  for (const category of Object.keys(CAT_WORDS)) {
    if (category === 'navbar') continue;
    const hit = CAT_WORDS[category].some((w) => text.includes(w));
    if (!hit) continue;

    let preferredName: string | undefined = undefined;
    if (mentionedName) preferredName = mentionedName;

    const action: 'replace' | 'remove' | 'update' = /\b(remove|delete)\b/.test(text)
      ? 'remove'
      : wantsReplace
        ? 'replace'
        : 'update';

    intent.sections.push({ category, action, preferredName });
  }

  const idMatches = text.match(/(#|id\s*)([a-z0-9]+)/g) ?? [];
  idMatches.forEach((m) => {
    const id = m.replace(/^#|^id\s*/g, '');
    const sec = intent.sections.find((s) => s.id === id);
    if (!sec) intent.sections.push({ id, action: wantsReplace ? 'replace' : 'update' });
  });

  return intent;
}
