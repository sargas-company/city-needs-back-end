import crypto from 'node:crypto';

type Dict<T = any> = Record<string, T>;

/** ——————— Types from your registries ——————— */
export interface ComponentRegistryItem {
  import: string;
  name: string;
  path: string;
  category?: string;
  description?: string;
  details?: string;
  constraints?: Dict;
  propsSchema?: Dict<string>;
}

export interface SectionRegistryItem {
  name: string;
  import: string;
  path: string;
  category: string;
  baseGenerationEligible?: boolean;
  description?: string;
  styleSupport?: Dict;
  propsSchema?: Dict<string>;
  constraints?: Dict;
}

/** ——————— Types for the Designer plan ——————— */
export interface PlanComponent {
  name: string;
  useFor?: string;
  custom?: string;
}

export interface PlanAsset {
  id: string;
  prompt: string; // enforced: prompt only (no src)
  alt?: string;
  sectionId?: string;
  usage?: string;
  aspectRatio?: string;
}

export interface DesignerPlan {
  randomSalt?: string;
  styles?: Dict;
  components?: PlanComponent[];
  sections?: string[]; // order of sections (labels or ids)
  sectionComponents?: Dict<string[]>; // sectionId -> component names (from componentRegistry ONLY, except footer which is from sectionRegistry)
  sectionStyles?: Dict<{
    wrapperClasses?: string;
    containerClasses?: string;
    text?: { heading?: string; body?: string };
    backgroundOverride?: Dict;
    interactions?: string[]; // e.g., ["hover-lift","underline-reveal","icon-twinkle"]
  }>;
  componentStyles?: Array<{
    name: string;
    className?: string;
    applyTo?: string[] | '*';
    notes?: string;
  }>;
  content?: Dict<{
    title?: string;
    subtitle?: string;
    description?: string;
    paragraphs?: string[];
    bullets?: string[];
    ctas?: Array<{ label: string; href?: string }>;
    images?: string[]; // may contain asset://<id> placeholders or remote urls; generator will resolve via assetMap
    stats?: Array<{ label: string; value: string }>;
  }>;
  assets?: {
    images?: PlanAsset[];
    icons?: PlanAsset[];
  };
  brandVoice?: Dict;
  seo?: Dict;
  nav?: Array<{ title: string; href: string }>;
  iconVocabulary?: string[]; // selected lucide-react icon names used across the site for cohesion
  // internal hints we add for generator
  _hints?: {
    carouselsUseChildrenOnly?: boolean;
    gridFallbackSections?: string[]; // if < 3 images
  };
  // chosen footer (sectionRegistry)
  _footer?: { name: string; import: string; path: string };
}

export interface RegistryBundle {
  componentRegistry: ComponentRegistryItem[];
  sectionRegistry: SectionRegistryItem[];
}

/** ——————— Output from preparePlan ——————— */
export interface PreparedResult {
  plan: DesignerPlan;
  capabilitySheet: CapabilitySheet;
  errors: string[];
  warnings: string[];
}

/** Scoped capability sheet the Generator consumes */
export interface CapabilitySheet {
  components: Array<{
    name: string;
    import: string;
    path: string;
    category?: string;
    supports: {
      children: boolean;
      classNameProp: boolean;
      arrayProps: string[]; // e.g., ['items','options','navItems','kpiItems','columns','steps']
    };
    functionProps: string[]; // enforce () => {}
    styleProps: string[]; // any prop name that ends with 'ClassName' or common style keys
  }>;
  sections: Array<{
    name: string;
    import: string;
    path: string;
    category: string;
    props: string[];
  }>;
}

/** ——————— Public API ——————— */

/**
 * Infer a vibe token if not provided by Designer.
 * Very lightweight heuristic — safe default is 'futuristic_premium' for car/product.
 */
export function inferVibe(styles?: Dict): 'fun_trendy' | 'futuristic_premium' | 'brain_rot' {
  const bg = styles?.background ?? styles?.bg ?? {};
  const isDark = !!bg.isDark || /#0[b-f]|black|#000|navy|indigo/i.test(JSON.stringify(bg));
  if (isDark) return 'futuristic_premium';

  const primary = (styles?.primaryColor ?? '').toString();
  if (/ff|ea|f3|e6/i.test(primary)) return 'fun_trendy';

  return 'futuristic_premium';
}

/**
 * Normalize Designer plan:
 * - Ensure a navbar from componentRegistry and a footer from sectionRegistry (best-fit).
 * - Enforce children/items/className rules via a scoped capability sheet.
 * - Add missing components referenced by sectionComponents into components[].
 * - Convert assets to prompt-only; add logo prompt when required.
 * - Guarantee nav includes #footer; ensure consistent section ids (kebab-case).
 */
export function preparePlan(
  registry: RegistryBundle,
  rawPlan: DesignerPlan,
  vibe: ReturnType<typeof inferVibe> = inferVibe(rawPlan?.styles),
): PreparedResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const plan: DesignerPlan = JSON.parse(JSON.stringify(rawPlan || {}));

  // Initialize randomSalt and iconVocabulary if missing
  if (!plan.randomSalt) {
    plan.randomSalt = crypto.randomUUID();
  }
  if (!Array.isArray(plan.iconVocabulary)) {
    plan.iconVocabulary = [];
  }

  // ——— 1) Normalize section ids to kebab-case and ensure Footer exists last
  const { sections } = normalizeSections(plan.sections, plan.content);
  plan.sections = sections;

  // ——— 2) Build quick lookup maps for registries
  const compByName = indexBy(registry.componentRegistry, 'name');
  const sectionsByName = indexBy(registry.sectionRegistry, 'name');

  // ——— 3) Ensure a NAVBAR from componentRegistry (category === 'navigation')
  const chosenNavbar = chooseNavbar(registry.componentRegistry, plan);
  if (!chosenNavbar) {
    errors.push('No navigation component available in componentRegistry.');
  } else {
    // add to components[] if missing
    addComponentIfMissing(plan, chosenNavbar.name);
  }

  // ——— 4) Ensure a FOOTER from sectionRegistry (category === 'footer')
  const chosenFooter = chooseFooter(registry.sectionRegistry, plan, vibe);
  if (!chosenFooter) {
    errors.push('No footer found in sectionRegistry (category "footer").');
  } else {
    plan._footer = {
      name: chosenFooter.name,
      import: chosenFooter.import,
      path: chosenFooter.path,
    };

    // guarantee last section label "Footer" (or kebab 'footer')
    ensureFooterInSections(plan.sections);

    // ensure sectionComponents.footer contains footer NAME (from sectionRegistry)
    plan.sectionComponents = plan.sectionComponents || {};
    plan.sectionComponents['footer'] = [chosenFooter.name];
  }

  // ——— 5) Ensure every sectionComponents[*] name exists; add missing into components[] (except footer)
  if (plan.sectionComponents) {
    for (const [sec, names] of Object.entries(plan.sectionComponents)) {
      for (const n of names) {
        if (sec.toLowerCase() === 'footer') continue; // footer comes from sectionRegistry, do not merge to components[]
        if (!compByName[n]) {
          warnings.push(`Section "${sec}" references unknown component "${n}" — removing.`);
          plan.sectionComponents[sec] = plan.sectionComponents[sec].filter((x) => x !== n);
        } else {
          addComponentIfMissing(plan, n);
        }
      }
    }
  }

  // ——— 6) Scoped capability sheet limited to used components + selected footer section
  const usedComponentNames = new Set<string>([
    ...(plan.components?.map((c) => c.name) || []),
    ...Object.values(plan.sectionComponents || {})
      .flat()
      .filter((n) => !!compByName[n]),
  ]);

  const capabilitySheet: CapabilitySheet = {
    components: Array.from(usedComponentNames).map((name) =>
      buildComponentCaps(compByName[name], errors),
    ),
    sections: plan._footer ? [buildSectionCaps(sectionsByName[plan._footer.name])] : [],
  };

  // ——— 7) Children/items/className global hints (for your Generator)
  plan._hints = plan._hints || {};
  plan._hints.carouselsUseChildrenOnly = allCarouselsChildrenOnly(capabilitySheet);

  // ——— 8) Ensure carousels won’t be rendered with < 3 items (mark grid fallback sections)
  plan._hints.gridFallbackSections = computeGridFallbackSections(plan);

  // ——— 9) Assets: enforce prompt-only, synthesize prompts from src/alt if designer sent srcs
  plan.assets = plan.assets || {};
  plan.assets.images = normalizeAssetsToPrompt(plan.assets.images);
  plan.assets.icons = normalizeAssetsToPrompt(plan.assets.icons);

  // ——— 10) Logo prompt if navbar/footer require a logo
  if (navbarNeedsLogo(chosenNavbar) || footerNeedsLogo(chosenFooter)) {
    plan.assets.icons = plan.assets.icons || [];
    if (!plan.assets.icons.some((a) => a.id === 'logo-mark')) {
      plan.assets.icons.push({
        id: 'logo-mark',
        prompt: defaultLogoPrompt(plan, vibe),
      });
    }
  }

  // ——— 11) NAV items: ensure a #footer link exists & basic coverage
  plan.nav = normalizeNav(plan.nav, plan.sections);

  // ——— 12) Validate componentStyles: never pass className if prop not declared
  if (plan.componentStyles?.length) {
    const filtered: typeof plan.componentStyles = [];
    for (const cs of plan.componentStyles) {
      const def = compByName[cs.name];
      if (!def) continue;
      const hasClassName = !!def.propsSchema?.className;
      if (!hasClassName && cs.className) {
        // keep note for wrapper usage; generator already wraps
        filtered.push({ ...cs, className: cs.className }); // we leave as-is (generator will wrap)
      } else {
        filtered.push(cs);
      }
    }
    plan.componentStyles = filtered;
  }

  // ——— 13) Prop-check: if component declares children prop, ensure sections using it show it in sectionComponents (Generator will implement children)
  // (Informational only — Generator enforces children rendering)
  for (const compName of usedComponentNames) {
    const def = compByName[compName];
    if (!def) continue;
    if (def.propsSchema && 'children' in def.propsSchema) {
      // ok; nothing to mutate — we only surface capabilities
    }
  }

  return { plan, capabilitySheet, errors, warnings };
}

/** ——————— Helpers ——————— */

function kebab(input: string): string {
  return (input || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function indexBy<T extends Dict>(arr: T[], key: keyof T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of arr || []) {
    const k = String(item[key] ?? '');
    if (k) out[k] = item;
  }
  return out;
}

function normalizeSections(
  sections?: string[],
  content?: DesignerPlan['content'],
): { sections: string[]; sectionIdMap: Dict<string> } {
  const ids = new Set<string>();
  const order: string[] = [];

  // Prefer explicit order; fallback to content keys if needed
  const raw = (sections && sections.length ? sections : Object.keys(content || [])) || [];

  for (const label of raw) {
    const id = kebab(label);
    if (!ids.has(id)) {
      ids.add(id);
      order.push(id);
    }
  }

  // Ensure footer present (as last)
  if (!order.includes('footer')) order.push('footer');

  return { sections: order, sectionIdMap: Object.fromEntries(order.map((s) => [s, s])) };
}

function ensureFooterInSections(sections: string[]) {
  const idx = sections.indexOf('footer');
  if (idx === -1) sections.push('footer');
  else if (idx !== sections.length - 1) {
    sections.splice(idx, 1);
    sections.push('footer');
  }
}

function addComponentIfMissing(plan: DesignerPlan, name: string) {
  plan.components = plan.components || [];
  if (!plan.components.some((c) => c.name === name)) {
    plan.components.push({ name, useFor: 'auto' });
  }
}

function chooseNavbar(
  componentRegistry: ComponentRegistryItem[],
  plan: DesignerPlan,
): ComponentRegistryItem | null {
  const navs = componentRegistry.filter((c) => c.category === 'navigation');
  if (!navs.length) return null;

  const desiredCount = plan.nav?.length || 4;

  const scored = navs
    .map((c) => {
      let score = 0;
      const ps = c.propsSchema || {};
      if ('navItems' in ps) score += 4;
      if ('brandName' in ps || 'logoSrc' in ps) score += 2;
      if ('buttonText' in ps) score += 1;

      // gentle nudge for Apple-style / inline layouts if there are >3 links
      if (/Apple|Inline|FloatingInline/i.test(c.name) && desiredCount >= 4) score += 2;

      // minimal if few links
      if (/Minimal/i.test(c.name) && desiredCount <= 3) score += 1;

      return { c, score };
    })
    .sort((a, b) => b.score - a.score);

  const randomIndex = Math.floor(Math.random() * scored.length);
  return scored[randomIndex]?.c || navs[Math.floor(Math.random() * navs.length)];
}

function chooseFooter(
  sectionRegistry: SectionRegistryItem[],
  plan: DesignerPlan,
  vibe: ReturnType<typeof inferVibe>,
): SectionRegistryItem | null {
  const footers = sectionRegistry.filter((s) => s.category === 'footer');
  if (!footers.length) return null;

  const wantColumns = inferWantsColumns(plan);

  const scored = footers
    .map((s) => {
      let score = 0;
      const ps = s.propsSchema || {};
      if ('columns' in ps) score += 4;
      if ('logoSrc' in ps || 'logoText' in ps) score += 2;
      if (/Reveal/i.test(s.name)) score += 1; // subtle motion bonus
      // vibe nudges
      if (vibe === 'futuristic_premium' && /LogoEmphasis|Base/i.test(s.name)) score += 1;
      if (vibe === 'fun_trendy' && /Base|Logo/i.test(s.name)) score += 1;

      if (wantColumns && 'columns' in ps) score += 2;

      return { s, score };
    })
    .sort((a, b) => b.score - a.score);

  const randomIndex = Math.floor(Math.random() * scored.length);
  return scored[randomIndex]?.s || footers[Math.floor(Math.random() * footers.length)];
}

function inferWantsColumns(plan: DesignerPlan): boolean {
  // Heuristic: if content has multiple sections & CTAs, assume link columns help
  const secCount = (plan.sections || []).length;
  const ctaCount = Object.values(plan.content || {}).reduce((acc, sec: any) => {
    return acc + (Array.isArray(sec?.ctas) ? sec.ctas.length : 0);
  }, 0);
  return secCount >= 4 || ctaCount >= 3;
}

function buildComponentCaps(item: ComponentRegistryItem | undefined, errors: string[]) {
  if (!item) {
    errors.push('Unknown component referenced in plan; capability omitted.');
    // Return a stub to avoid breaking downstream
    return {
      name: 'UNKNOWN',
      import: '',
      path: '',
      category: 'unknown',
      supports: { children: false, classNameProp: false, arrayProps: [] as string[] },
      functionProps: [] as string[],
      styleProps: [] as string[],
    };
  }

  const ps = item.propsSchema || {};
  const propNames = Object.keys(ps);

  const children = propNames.includes('children');
  const classNameProp = propNames.includes('className');

  const arrayProps = propNames.filter((p) =>
    ['items', 'options', 'navItems', 'steps', 'kpiItems', 'columns', 'tokenData'].includes(p),
  );

  const functionProps = propNames.filter(
    (p) => typeof ps[p] === 'string' && ps[p].toLowerCase().includes('function'),
  );

  const styleProps = propNames.filter(
    (p) =>
      p === 'className' || /ClassName$/.test(p) || /(Bg|Text|Icon|Container)ClassName$/.test(p),
  );

  return {
    name: item.name,
    import: item.import,
    path: item.path,
    category: item.category,
    supports: { children, classNameProp, arrayProps },
    functionProps,
    styleProps,
  };
}

function buildSectionCaps(item: SectionRegistryItem | undefined) {
  if (!item) {
    return { name: 'UNKNOWN', import: '', path: '', category: 'unknown', props: [] as string[] };
  }
  return {
    name: item.name,
    import: item.import,
    path: item.path,
    category: item.category,
    props: Object.keys(item.propsSchema || {}),
  };
}

function allCarouselsChildrenOnly(sheet: CapabilitySheet): boolean {
  return sheet.components
    .filter((c) => /^Carousel/.test(c.name) || /carousel/i.test(c.category || ''))
    .every((c) => c.supports.children && !c.supports.arrayProps.length);
}

function computeGridFallbackSections(plan: DesignerPlan): string[] {
  const out: string[] = [];
  for (const secId of plan.sections || []) {
    const imgs = plan.content?.[secId]?.images || [];
    if (imgs.length > 0 && imgs.length < 3) {
      out.push(secId);
    }
  }
  return out;
}

function normalizeAssetsToPrompt(list?: PlanAsset[]): PlanAsset[] {
  if (!Array.isArray(list)) return [];
  return list.map((a) => {
    // If designer mistakenly sent src, convert to a prompt
    let prompt = a.prompt;
    if (!prompt || /^\s*$/.test(prompt)) {
      const guess = a.alt
        ? `${a.alt}. Photorealistic, high detail, clean backdrop`
        : 'Photorealistic automotive shot, high detail, studio light, clean backdrop';
      prompt = guess;
    }
    return {
      id: a.id || makeId('asset'),
      prompt,
      alt: a.alt,
      sectionId: a.sectionId,
      usage: a.usage,
      aspectRatio: a.aspectRatio,
    };
  });
}

function defaultLogoPrompt(plan: DesignerPlan, vibe: ReturnType<typeof inferVibe>): string {
  const brand =
    plan?.seo?.title?.toString().split('—')[0].trim() || plan?.brandVoice?.name || 'DreamDrive';
  const suffix =
    vibe === 'futuristic_premium'
      ? 'minimal premium monogram, geometric, clean, sharp, SVG-ready, single color'
      : vibe === 'fun_trendy'
        ? 'playful rounded monogram, bold, friendly, SVG-ready, single color'
        : 'bold uppercase monogram, high contrast, 4px shadow feel, SVG-ready';

  return `Icon-only logo for ${brand}. ${suffix}`;
}

function navbarNeedsLogo(nav?: ComponentRegistryItem | null) {
  if (!nav?.propsSchema) return false;
  const ps = nav.propsSchema;
  return 'logoSrc' in ps || 'brandName' in ps || 'logoAlt' in ps;
}

function footerNeedsLogo(foot?: SectionRegistryItem | null) {
  if (!foot?.propsSchema) return false;
  const ps = foot.propsSchema;
  return 'logoSrc' in ps || 'logoText' in ps || 'logoAlt' in ps;
}

function normalizeNav(nav: DesignerPlan['nav'], sections: string[]): DesignerPlan['nav'] {
  const base =
    Array.isArray(nav) && nav.length
      ? [...nav]
      : sections
          .filter((s) => s !== 'footer')
          .slice(0, 6)
          .map((s) => ({ title: toTitle(s), href: `#${s}` }));

  if (!base.some((i) => i.href === '#footer')) {
    base.push({ title: 'Footer', href: '#footer' });
  }
  return base;
}

function toTitle(id: string): string {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function makeId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}
