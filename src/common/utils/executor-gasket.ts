type Plan = {
  projectName: string;
  promptVersion?: string;
  randomSalt: string;
  theme: { styleVariant: 'funAndTrendy' | 'futuristicAndOutOfBox' | 'brainRot' };
  sections: Array<{ id: string; needs?: string[] }>;
  nav?: string[];
  navbar?: any;
};

type Registry = {
  componentRegistry: Array<any>;
  sectionRegistry: Array<any>;
};

function styleKey(styleVariant: Plan['theme']['styleVariant']) {
  return styleVariant === 'funAndTrendy'
    ? 'fun_trendy'
    : styleVariant === 'brainRot'
      ? 'brain_rot'
      : 'futuristic_premium';
}

function normalizeCategory(cat: string) {
  const c = (cat || '').toLowerCase().replace(/[\s-]/g, '_');
  if (c === 'how_to_buy' || c === 'howtobuy' || c === 'how-to-buy' || c === 'htb')
    return 'how_to_buy';
  if (c === 'tokenomics') return 'tokenomics';
  if (c === 'roadmap' || c === 'timeline' || c === 'process') return 'roadmap';
  if (c === 'faq' || c === 'questions' || c === 'accordion') return 'faq';
  if (c === 'hero') return 'hero';
  if (c === 'about') return 'about';
  if (c === 'footer') return 'footer';
  return c;
}

function matchesStyle(sectionOrComp: any, required: string) {
  if (sectionOrComp?.styleSupport?.availableStyles) {
    return sectionOrComp.styleSupport.availableStyles.includes(required);
  }
  if (Array.isArray(sectionOrComp?.style)) {
    return sectionOrComp.style.includes(required);
  }
  return true;
}

function djb2u32(str: string) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

function mixHash(hash: number): number {
  hash = hash ^ (hash >> 3) ^ (hash << 7);
  hash = (hash * 1664525 + 1013904223) >>> 0;
  return hash;
}

export function pickDeterministic<T>(seed: string, arr: T[]): T {
  if (!arr.length) throw new Error('pickDeterministic: empty array');
  let hash = djb2u32(seed);

  hash = mixHash(hash);
  hash = mixHash(hash ^ arr.length);

  const idx = hash % arr.length;
  return arr[idx];
}

function eligibleSectionsByCategory(sectionRegistry: any[], category: string, style: string) {
  const cat = normalizeCategory(category);
  return sectionRegistry.filter(
    (s) => normalizeCategory(s.category) === cat && matchesStyle(s, style),
  );
}

function eligibleNavbars(componentRegistry: any[], plan: Plan) {
  return componentRegistry.filter((c) => {
    const isNav = c.category === 'navigation';

    if (!isNav) return false;

    const ps = c.propsSchema || {};
    const hasLinksProp = 'navItems' in ps || 'links' in ps || 'items' in ps;
    if (!Object.keys(ps).length) return true;

    if (hasLinksProp && (!Array.isArray(plan.nav) || plan.nav.length < 1)) return false;

    return true;
  });
}

export function buildLockedSelection(plan: Plan, registry: Registry) {
  const style = styleKey(plan.theme.styleVariant);
  const picks: {
    navbar?: { name: string; import: string; path: string };
    sections: Array<{ id: string; name: string; import: string; path: string }>;
    traces: any;
  } = { sections: [], traces: {} };

  const navCandidates = eligibleNavbars(registry.componentRegistry, plan);
  if (navCandidates.length) {
    const seed = `${plan.randomSalt}:${plan.projectName}:NAVBAR:${plan.promptVersion || 'v1'}`;
    const chosen = pickDeterministic(seed, navCandidates);
    picks.navbar = { name: chosen.name, import: chosen.import, path: chosen.path };
    picks.traces.navbar = {
      shortlist: navCandidates.map((n) => n.name),
      picked: chosen.name,
      len: navCandidates.length,
    };
  }

  for (const sec of plan.sections) {
    const cat = normalizeCategory(sec.id);
    const pool = eligibleSectionsByCategory(registry.sectionRegistry, cat, style);

    if (!pool.length) continue;

    const seed =
      cat === 'footer'
        ? `${plan.randomSalt}:${plan.projectName}:FOOTER:${plan.promptVersion || 'v1'}`
        : `${plan.randomSalt}:${plan.projectName}:${sec.id}:${cat}:${plan.promptVersion || 'v1'}`;

    const chosen = pickDeterministic(seed, pool);
    picks.sections.push({
      id: sec.id,
      name: chosen.name,
      import: chosen.import,
      path: chosen.path,
    });
    picks.traces[sec.id] = {
      shortlist: pool.map((p) => p.name),
      picked: chosen.name,
      len: pool.length,
    };
  }

  return picks;
}
