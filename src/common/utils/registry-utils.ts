export type RegistryEntry = {
  name: string;
  import: string;
  path?: string;
  category?: string;
  propsSchema?: Record<string, any>;
};

export type ComponentCapability = {
  name: string;
  category: string;
  import: string;
  supports: {
    children: boolean;
    classNameProp: boolean;
    itemsProp: string | null;
    allItemsProps: string[];
  };
  functionProps: string[];
  propsKeys: string[];
};

export type SectionCapability = ComponentCapability;

export type CapabilitySheet = {
  componentCapabilities: ComponentCapability[];
  sectionCapabilities: SectionCapability[];
};

export const CLASSNAME_KEYS = new Set<string>([
  'className',
  'containerClassName',
  'gridClassName',
  'itemClassName',
  'titleClassName',
  'descriptionClassName',
  'logoClassName',
  'buttonClassName',
  'buttonContentClassName',
  'textClassName',
  'bgClassName',
  'iconClassName',
  'rowClassName',
  'sectionClassName',
  'imageClassName',
  'imageContainerClassName',
  'columnsClassName',
  'columnClassName',
  'columnTitleClassName',
  'columnItemClassName',
  'copyrightContainerClassName',
  'copyrightTextClassName',
  'privacyButtonClassName',
  'gradientClassName',
  'backgroundBlobClassName',
  'valueClassName',
  'longDescriptionClassName',
  'accordionContainerClassName',
  'dividerClassName',
  'sideContainerClassName',
  'navItemClassName',
  'buttonBgClassName',
  'itemsClassName',
]);

export const ITEMS_PROP_NAMES = new Set<string>([
  'items',
  'navItems',
  'options',
  'steps',
  'kpiItems',
  'tokenData',
  'cardItems',
  'columns',
]);

function isFunctionType(t: any): boolean {
  if (!t) return false;
  if (typeof t === 'string') return /(=>|function|\bFunc\b|\bHandler\b)/i.test(t);
  if (typeof t === 'object') return t.kind === 'function' || /function|=>/i.test(JSON.stringify(t));
  return false;
}

function collectFunctionProps(props: Record<string, any> = {}) {
  return Object.entries(props)
    .filter(([, v]) => isFunctionType(v))
    .map(([k]) => k);
}

function hasChildren(props: Record<string, any> = {}) {
  return Object.prototype.hasOwnProperty.call(props, 'children');
}

function classNameSupport(props: Record<string, any> = {}) {
  const keys = Object.keys(props);
  const hasAny =
    keys.some((k) => CLASSNAME_KEYS.has(k)) || keys.some((k) => /class(Name)?$/i.test(k));
  return hasAny;
}

function findItemsProps(props: Record<string, any> = {}) {
  const keys = Object.keys(props);
  const named = keys.filter((k) => ITEMS_PROP_NAMES.has(k));
  // Prefer a stable order of common names
  const pref = ['items', 'navItems', 'options', 'steps', 'kpiItems', 'columns'];
  const primary = pref.find((p) => named.includes(p)) ?? named[0] ?? null;
  return { primary, all: named };
}

function summarize(r: RegistryEntry): ComponentCapability {
  const props = r.propsSchema ?? {};
  const itemsInfo = findItemsProps(props);
  return {
    name: r.name,
    category: r.category ?? '',
    import: r.import,
    supports: {
      children: hasChildren(props),
      classNameProp: classNameSupport(props),
      itemsProp: itemsInfo.primary,
      allItemsProps: itemsInfo.all,
    },
    functionProps: collectFunctionProps(props),
    propsKeys: Object.keys(props),
  };
}

export function buildCapabilitySheet(
  componentRegistry: RegistryEntry[],
  sectionRegistry: RegistryEntry[],
): CapabilitySheet {
  return {
    componentCapabilities: componentRegistry.map(summarize),
    sectionCapabilities: sectionRegistry.map(summarize),
  };
}

export function extractComponentNamesFromPage(pageContent: string): Set<string> {
  const componentNames = new Set<string>();

  const importRegex = /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(pageContent)) !== null) {
    if (match[1]) {
      const namedImports = match[1].split(',').map((s) => s.trim());
      namedImports.forEach((name) => {
        const cleanName = name.split(/\s+as\s+/)[0].trim();
        if (cleanName && !cleanName.startsWith('type ')) {
          componentNames.add(cleanName);
        }
      });
    } else if (match[2]) {
      componentNames.add(match[2]);
    }
  }

  return componentNames;
}

export function filterRegistryByComponentNames(
  registryJson: string,
  componentNames: Set<string>,
): string {
  const registry = JSON.parse(registryJson);

  const filteredComponentRegistry: Record<string, any[]> = {};
  if (registry.componentRegistry) {
    for (const [category, components] of Object.entries(registry.componentRegistry)) {
      if (Array.isArray(components)) {
        const filtered = components.filter((comp: any) => {
          return componentNames.has(comp.name);
        });
        if (filtered.length > 0) {
          filteredComponentRegistry[category] = filtered;
        }
      }
    }
  }

  const filteredSectionRegistry: Record<string, any[]> = {};
  if (registry.sectionRegistry) {
    for (const [category, sections] of Object.entries(registry.sectionRegistry)) {
      if (Array.isArray(sections)) {
        const filtered = sections.filter((section: any) => {
          return componentNames.has(section.name);
        });
        if (filtered.length > 0) {
          filteredSectionRegistry[category] = filtered;
        }
      }
    }
  }

  const filteredRegistry = {
    componentRegistry: filteredComponentRegistry,
    sectionRegistry: filteredSectionRegistry,
  };

  return JSON.stringify(filteredRegistry);
}

export function filterRegistryByPageContent(pageContent: string, registryJson: string): string {
  const componentNames = extractComponentNamesFromPage(pageContent);
  return filterRegistryByComponentNames(registryJson, componentNames);
}
