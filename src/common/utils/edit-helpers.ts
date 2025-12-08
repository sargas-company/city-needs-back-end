import type { EditIntent as ExtractedEditIntent } from './edit-intent';

type PlanSection = {
  id: string;
  needs: string[];
  notes?: string;
  intentHints?: string[];
  contentHints?: Record<string, unknown>;
  imageHints?: Array<{ role?: string; path: string; alt?: string }>;
};

type Plan = {
  projectName?: string;
  goal?: string;
  promptVersion?: string;
  theme?: {
    styleVariant: 'funAndTrendy' | 'futuristicAndOutOfBox';
    colorTemplate: 1 | 2;
    textAnimation: 'slide' | 'rotate' | 'highlight' | 'blur' | 'scale' | 'expand' | 'flip' | 'none';
  };
  sections: PlanSection[];
  nav?: string[];
  navbar?: Record<string, unknown>;
  visualStyle?: Record<string, unknown>;
  designTokens?: Record<string, unknown>;
  brandVoice?: string[] | string;
  backgroundStyle?: Record<string, unknown>;
  randomSalt?: string;
};

type OpReorder = { op: 'reorder_sections'; order: string[] };
type OpRemove = { op: 'remove_section'; id: string };
type OpAdd = {
  op: 'add_section';
  id: string;
  category?: 'hero' | 'about' | 'how_to_buy' | 'tokenomics' | 'faq' | 'roadmap' | 'footer';
  positionAfterId?: string | null;
  needs: string[];
  notes?: string;
};
type OpReplace = {
  op: 'replace_section';
  id: string;
  intent?: string[];
  allowImages?: boolean;
  preferredName?: string;
};
type OpUpdateContent = {
  op: 'update_section_content';
  id: string;
  content: Record<string, unknown>;
};
type OpUpdateImages = {
  op: 'update_images';
  id: string;
  images: Array<{ role?: string; path: string; alt?: string }>;
};
type OpUpdateNavbar = {
  op: 'update_navbar';
  content: Record<string, unknown>;
};

type PlanPatch = {
  randomSalt?: string;
  operations: (
    | OpReorder
    | OpRemove
    | OpAdd
    | OpReplace
    | OpUpdateContent
    | OpUpdateImages
    | OpUpdateNavbar
  )[];
};

type Registry = {
  componentRegistry: {
    [category: string]: Array<{
      name: string;
      import: string;
      path?: string;
      description?: string;
      details?: string;
      constraints?: Record<string, any>;
      propsSchema?: Record<string, string>;
      usage?: string;
    }>;
  };
  sectionRegistry: {
    [category: string]: Array<{
      name: string;
      import: string;
      path?: string;
      description?: string;
      details?: string;
      constraints?: Record<string, any>;
      propsSchema?: Record<string, string>;
      usage?: string;
    }>;
  };
};

type LockedSectionPick = {
  id: string;
  name: string;
  import: string;
  path?: string;
  category?: string;
  /** true = preserve; false = may be replaced */
  locked: boolean;
  /** if provided, downstream MUST use this component name */
  preferredReplacementName?: string;
};

type LockedNavbarPick = {
  name: string;
  import: string;
  path?: string;
  category?: string;
  locked: boolean;
  preferredReplacementName?: string;
};

type LockedSelection = {
  sections: LockedSectionPick[];
  navbar?: LockedNavbarPick;
  traces?: Record<string, unknown>;
};

export type EditIntent = {
  navbar?: {
    action?: 'replace' | 'update' | 'remove' | 'keep' | 'none';
    preferredName?: string;
  };
  sections?: Array<{
    id: string;
    action?: 'replace' | 'remove' | 'update' | 'reorder' | 'add' | 'keep' | 'none';
    preferredName?: string;
  }>;
};

export function applyPlanPatch(lastPlan: Plan, patch: PlanPatch): Plan {
  const plan: Plan = JSON.parse(JSON.stringify(lastPlan || {}));

  const idIndex = (id: string) => plan.sections.findIndex((s) => s.id === id);

  for (const op of patch.operations || []) {
    switch (op.op) {
      case 'reorder_sections': {
        const order = op.order || [];
        const byId = new Map(plan.sections.map((s) => [s.id, s]));
        const seen = new Set<string>();
        const reordered: PlanSection[] = [];

        for (const id of order) {
          const sec = byId.get(id);
          if (sec) {
            reordered.push(sec);
            seen.add(id);
          }
        }
        for (const s of plan.sections) {
          if (!seen.has(s.id)) reordered.push(s);
        }
        plan.sections = reordered;
        break;
      }

      case 'remove_section': {
        const idx = idIndex(op.id);
        if (idx >= 0) {
          plan.sections.splice(idx, 1);
        }
        break;
      }

      case 'add_section': {
        if (!op.id || !op.needs?.length) break;
        if (idIndex(op.id) >= 0) break; // already present, skip
        const newSection: PlanSection = {
          id: op.id,
          needs: [...op.needs],
        };
        if (op.notes) newSection.notes = op.notes;

        if (op.positionAfterId === null) {
          plan.sections.unshift(newSection);
        } else if (op.positionAfterId) {
          const pos = idIndex(op.positionAfterId);
          if (pos >= 0) plan.sections.splice(pos + 1, 0, newSection);
          else plan.sections.push(newSection);
        } else {
          plan.sections.push(newSection);
        }
        break;
      }

      case 'replace_section': {
        const idx = idIndex(op.id);
        if (idx >= 0) {
          const s = plan.sections[idx];
          const hints = Array.isArray(op.intent) ? op.intent.filter(Boolean) : [];
          s.intentHints = hints.length ? hints : undefined;
          if (typeof op.allowImages === 'boolean') {
            s.intentHints = [
              ...(s.intentHints || []),
              op.allowImages ? 'allow images' : 'no images',
            ];
          }
          plan.sections[idx] = s;
        }
        break;
      }

      case 'update_section_content': {
        const idx = idIndex(op.id);
        if (idx >= 0) {
          const s = plan.sections[idx];
          s.contentHints = { ...(s.contentHints || {}), ...(op.content || {}) };
          plan.sections[idx] = s;
        }
        break;
      }

      case 'update_images': {
        const idx = idIndex(op.id);
        if (idx >= 0) {
          const s = plan.sections[idx];
          const imgs = (op.images || []).filter((img) => !!img?.path);
          if (imgs.length) s.imageHints = imgs;
          plan.sections[idx] = s;
        }
        break;
      }

      case 'update_navbar': {
        plan.navbar = { ...(plan.navbar || {}), ...(op.content || {}) };
        break;
      }

      default:
        break;
    }
  }

  if (patch.randomSalt && String(patch.randomSalt).length >= 8) {
    plan.randomSalt = String(patch.randomSalt);
  }

  plan.nav = plan.sections.map((s) => `#${s.id}`);

  return plan;
}

export function buildLockedSelectionForEdit(
  args:
    | {
        currentPageTsx: string;
        registryJson: string;
        lastPlanJson: string | Plan;
        newPlan: Plan;
        planPatch: PlanPatch;
      }
    | {
        currentPageTsx: string;
        registryJson: string;
        intent: EditIntent;
      },
): LockedSelection {
  const registry: Registry = safeParseRegistry(args.registryJson);
  const imports = extractImports(args.currentPageTsx);
  const jsxText = stripComments(args.currentPageTsx);

  // Flatten all components and sections for easy lookup
  // const allComponents = Object.values(registry.componentRegistry || {}).flat();
  // const allSections = Object.values(registry.sectionRegistry || {}).flat();

  // const componentByName = Object.fromEntries(allComponents.map((c) => [c.name, c]));
  // const sectionByName = Object.fromEntries(allSections.map((s) => [s.name, s]));

  const navbarCurrent = resolveNavbarLock(imports, jsxText, registry);

  if ('intent' in args) {
    const intent = args.intent || {};
    const sectionIds = extractSectionIdsFromPage(jsxText);

    const navbarAction = intent.navbar?.action || 'keep';
    const navbarPreferred = intent.navbar?.preferredName?.trim();
    const navbar: LockedNavbarPick | undefined = navbarCurrent
      ? {
          name: navbarCurrent.name,
          import: navbarCurrent.import,
          path: navbarCurrent.path,
          category: findComponentCategory(navbarCurrent.name, registry) || 'navbar',
          locked: navbarAction !== 'replace',
          preferredReplacementName:
            navbarAction === 'replace' && navbarPreferred ? navbarPreferred : undefined,
        }
      : undefined;

    const picks: LockedSectionPick[] = [];
    for (const id of sectionIds) {
      const inner = findInnerComponentForSection(jsxText, id);
      const imp = inner ? imports.find((i) => i.localName === inner) : undefined;
      const matched =
        (imp && matchSectionRegistryByImportOrPath(imp, registry.sectionRegistry)) || null;

      const currentName = matched?.name || (inner ?? 'UnknownSection');
      const currentImport = matched?.import || (imp ? ensureSemi(imp.full) : '');
      const currentPath = matched?.path || (imp?.from ?? undefined);
      // Find category by searching through all section categories
      const category = matched ? findSectionCategory(matched.name, registry) : undefined;

      const secIntent = (intent.sections || []).find((s) => s.id === id);
      const action = secIntent?.action || 'keep';
      const preferred = (secIntent?.preferredName || '').trim();

      picks.push({
        id,
        name: currentName,
        import: currentImport,
        path: currentPath,
        category,
        locked: action !== 'replace' && action !== 'remove' && action !== 'update',
        preferredReplacementName: action === 'replace' && preferred ? preferred : undefined,
      });
    }

    return {
      sections: picks,
      navbar,
      traces: {
        mode: 'intent',
        sectionIds,
        unlockedIds: picks.filter((p) => !p.locked).map((p) => p.id),
        navbarAction,
        navbarPreferred: navbarPreferred || null,
      },
    };
  }

  const lastPlan: Plan =
    typeof args.lastPlanJson === 'string' ? safeParsePlan(args.lastPlanJson) : args.lastPlanJson;
  const newPlan = args.newPlan;
  const planPatch = args.planPatch;

  const changedIds = collectChangedIds(planPatch);
  const navbarChanged = hasNavbarChange(planPatch);
  const preferredNavbarReplacement =
    getPreferredNavbarNameFromPatch(planPatch, registry) || undefined;

  const navbar: LockedNavbarPick | undefined = navbarCurrent
    ? {
        name: navbarCurrent.name,
        import: navbarCurrent.import,
        path: navbarCurrent.path,
        category: findComponentCategory(navbarCurrent.name, registry) || 'navbar',
        locked: !navbarChanged,
        preferredReplacementName: navbarChanged ? preferredNavbarReplacement : undefined,
      }
    : undefined;

  const lastIds = new Set(lastPlan.sections?.map((s) => s.id) || []);
  const sections: LockedSectionPick[] = [];

  for (const sec of newPlan.sections || []) {
    const isNew = !lastIds.has(sec.id);
    const isChanged = changedIds.has(sec.id);
    const locked = !(isNew || isChanged);

    const innerComponent = findInnerComponentForSection(jsxText, sec.id);
    const imp = innerComponent ? imports.find((i) => i.localName === innerComponent) : undefined;

    const matched =
      (imp && matchSectionRegistryByImportOrPath(imp, registry.sectionRegistry)) || null;

    const currentName = matched?.name || (innerComponent ?? 'UnknownSection');
    const currentImport = matched?.import || (imp ? ensureSemi(imp.full) : '');
    const currentPath = matched?.path || (imp?.from ?? undefined);
    const category = matched ? findSectionCategory(matched.name, registry) : undefined;

    const preferredReplacementName =
      getPreferredNameForSectionFromPatch(sec.id, planPatch, registry) || undefined;

    sections.push({
      id: sec.id,
      name: currentName,
      import: currentImport,
      path: currentPath,
      category,
      locked,
      preferredReplacementName: !locked ? preferredReplacementName : undefined,
    });
  }

  return {
    sections,
    navbar,
    traces: {
      mode: 'plan_patch',
      changedIds: Array.from(changedIds),
      lockedSectionCount: sections.filter((s) => s.locked).length,
      unlockedSectionIds: sections.filter((s) => !s.locked).map((s) => s.id),
      preferredReplacements: {
        navbar: preferredNavbarReplacement ?? null,
        sections: Object.fromEntries(
          sections
            .filter((s) => !s.locked && s.preferredReplacementName)
            .map((s) => [s.id, s.preferredReplacementName]),
        ),
      },
      foundNavbar: Boolean(navbar),
    },
  };
}

function safeParseRegistry(json: string): Registry {
  try {
    const obj = JSON.parse(json);
    if (
      !obj ||
      typeof obj.componentRegistry !== 'object' ||
      typeof obj.sectionRegistry !== 'object'
    ) {
      throw new Error('Invalid registry.json shape');
    }
    return obj;
  } catch {
    return { componentRegistry: {}, sectionRegistry: {} };
  }
}

function safeParsePlan(json: string): Plan {
  try {
    return JSON.parse(json);
  } catch {
    return { sections: [], nav: [], randomSalt: undefined };
  }
}

function stripComments(src: string): string {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n\r]*/g, '');
}

function collectChangedIds(patch: PlanPatch): Set<string> {
  const changed = new Set<string>();
  for (const op of patch.operations || []) {
    if (op.op === 'replace_section' || op.op === 'remove_section') {
      changed.add(op.id);
    }
    if (op.op === 'add_section') {
      changed.add(op.id);
    }
  }
  return changed;
}

function hasNavbarChange(patch: PlanPatch): boolean {
  return (patch.operations || []).some((op) => op.op === 'update_navbar');
}

type ImportStmt = {
  full: string;
  localName: string;
  from: string;
};

function extractImports(src: string): ImportStmt[] {
  const out: ImportStmt[] = [];
  const re = /import\s+([A-Za-z0-9_]+)(?:\s*,\s*\{[^}]*})?\s+from\s+['"]([^'"]+)['"]\s*;?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out.push({
      full: m[0],
      localName: m[1],
      from: m[2],
    });
  }
  return out;
}

function findInnerComponentForSection(jsx: string, sectionId: string): string | null {
  const startRe = new RegExp(`<div\\s+[^>]*id=["']${escapeRegExp(sectionId)}["'][^>]*>`, 'i');
  const start = jsx.search(startRe);
  if (start === -1) return null;

  const after = jsx.slice(start);
  const limit = after.slice(0, 5000);

  const tagRe = /<([A-Z][A-Za-z0-9_]*)\b/g;
  const m = tagRe.exec(limit);
  return m ? m[1] : null;
}

function matchSectionRegistryByImportOrPath(
  imp: ImportStmt,
  sectionRegistry: Registry['sectionRegistry'],
) {
  const normFrom = normalizeModulePath(imp.from);
  const allSections = Object.values(sectionRegistry || {}).flat();

  let best =
    allSections.find((s) => normalizeFromImportString(s.import) === normFrom) ||
    allSections.find((s) => normalizeModulePath(s.path || '') === normFrom);

  if (best) return best;

  best = allSections.find((s) => s.name === imp.localName);
  if (best) return best;

  return null;
}

function resolveNavbarLock(imports: ImportStmt[], jsx: string, registry: Registry) {
  const navLike = imports.filter(
    (i) =>
      /nav|navbar|navigation/i.test(i.localName) ||
      /\/navigation\//i.test(i.from) ||
      /nav|navbar|navigation/i.test(i.full),
  );

  const usedNavs = navLike.filter((i) => new RegExp(`<${i.localName}\\b`).test(jsx));
  const pick = usedNavs[0] || navLike[0];
  if (!pick) return null;

  // Search in navbar category first, then all components
  const navbarComponents = registry.componentRegistry.navbar || [];
  const allComponents = Object.values(registry.componentRegistry || {}).flat();

  const match =
    navbarComponents.find(
      (c) => normalizeFromImportString(c.import) === normalizeModulePath(pick.from),
    ) ||
    navbarComponents.find((c) => c.name === pick.localName) ||
    allComponents.find(
      (c) => normalizeFromImportString(c.import) === normalizeModulePath(pick.from),
    ) ||
    allComponents.find((c) => c.name === pick.localName) ||
    null;

  if (!match) {
    return {
      name: pick.localName,
      import: ensureSemi(pick.full),
      path: pick.from,
    };
  }

  return {
    name: match.name,
    import: match.import,
    path: match.path,
  };
}

function normalizeModulePath(p: string): string {
  return String(p)
    .replace(/\.(tsx?|jsx?)$/i, '')
    .replace(/\/index$/i, '')
    .trim();
}

function normalizeFromImportString(importStr: string): string {
  const m = /from\s+['"]([^'"]+)['"]/.exec(importStr);
  if (!m) return '';
  return normalizeModulePath(m[1]);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureSemi(s: string): string {
  return /;\s*$/.test(s) ? s : `${s};`;
}

function getPreferredNameForSectionFromPatch(
  id: string,
  patch: PlanPatch,
  registry: Registry,
): string | undefined {
  const replaceOps = (patch.operations || []).filter(
    (o): o is OpReplace => o.op === 'replace_section' && (o as any).id === id,
  );
  if (!replaceOps.length) return undefined;

  for (const op of replaceOps) {
    if (op.preferredName && isRegistrySectionName(op.preferredName, registry)) {
      return op.preferredName;
    }
  }

  for (const op of replaceOps) {
    const guess = inferNameFromStrings(op.intent || [], registry);
    if (guess) return guess;
  }

  return undefined;
}

function getPreferredNavbarNameFromPatch(patch: PlanPatch, registry: Registry): string | undefined {
  const op = (patch.operations || []).find((o) => o.op === 'update_navbar');
  if (!op?.content) return undefined;

  const c = op.content;
  const candidate =
    (typeof c['preferredName'] === 'string' && c['preferredName']) ||
    (typeof c['componentName'] === 'string' && c['componentName']) ||
    (typeof c['use'] === 'string' && c['use']) ||
    (typeof c['replaceWith'] === 'string' && c['replaceWith']) ||
    '';

  const name = String(candidate || '').trim();
  if (name && isRegistryComponentName(name, registry)) return name;

  const strings = Object.values(c).filter((v) => typeof v === 'string');
  const guess = inferNameFromStrings(strings, registry, true);
  return guess || undefined;
}

function inferNameFromStrings(
  texts: string[],
  registry: Registry,
  searchComponentsFirst = false,
): string | undefined {
  const lc = texts.map((t) => t.toLowerCase());
  const allSections = Object.values(registry.sectionRegistry || {}).flat();
  const allComponents = Object.values(registry.componentRegistry || {}).flat();

  const namesSections = allSections.map((s) => s.name);
  const namesComponents = allComponents.map((c) => c.name);

  const scan = (names: string[]) => names.find((n) => lc.some((t) => t.includes(n.toLowerCase())));

  if (searchComponentsFirst) {
    return scan(namesComponents) || scan(namesSections) || undefined;
  }
  return scan(namesSections) || scan(namesComponents) || undefined;
}

function isRegistrySectionName(name: string, registry: Registry): boolean {
  const allSections = Object.values(registry.sectionRegistry || {}).flat();
  return !!allSections.find((s) => s.name === name);
}

function isRegistryComponentName(name: string, registry: Registry): boolean {
  const allComponents = Object.values(registry.componentRegistry || {}).flat();
  return !!allComponents.find((c) => c.name === name);
}

function findSectionCategory(sectionName: string, registry: Registry): string | undefined {
  for (const [category, sections] of Object.entries(registry.sectionRegistry || {})) {
    if (sections.some((s) => s.name === sectionName)) {
      return category;
    }
  }
  return undefined;
}

function findComponentCategory(componentName: string, registry: Registry): string | undefined {
  for (const [category, components] of Object.entries(registry.componentRegistry || {})) {
    if (components.some((c) => c.name === componentName)) {
      return category;
    }
  }
  return undefined;
}

function extractSectionIdsFromPage(jsx: string): string[] {
  const ids = new Set<string>();
  const re = /<div\s+[^>]*id=["']([^"']+)["'][^>]*\sdata-section=["'][^"']+["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(jsx))) {
    const id = (m[1] || '').trim();
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

export function normalizeIntentForHelpers(intent: ExtractedEditIntent): EditIntent {
  const mapAction = (a?: string): NonNullable<EditIntent['navbar']>['action'] => {
    switch (a) {
      case 'replace':
      case 'update':
      case 'remove':
      case 'keep':
      case 'reorder':
      case 'add':
      case 'none':
        return a as any;
      default:
        return 'keep';
    }
  };

  const sections: EditIntent['sections'] = [];
  for (const s of intent.sections || []) {
    if (!s?.id) continue;
    const entry: NonNullable<EditIntent['sections']>[number] = {
      id: s.id,
      action: mapAction(s.action),
    };
    if (s.preferredName) entry.preferredName = s.preferredName;
    sections.push(entry);
  }

  const navbar: EditIntent['navbar'] | undefined = intent.navbar
    ? {
        action: mapAction(intent.navbar.action),
        ...(intent.navbar.preferredName ? { preferredName: intent.navbar.preferredName } : {}),
      }
    : undefined;

  return { navbar, sections };
}
