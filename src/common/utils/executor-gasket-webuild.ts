import { Logger } from '@nestjs/common';

type Registry = {
  componentRegistry: Record<string, Array<any>>;
  sectionRegistry: Record<string, Array<any>>;
};

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

export function buildLockedSelection(registry: Registry) {
  const salt = crypto.randomUUID();
  const locked = {
    navbar: null as number | null,
    sections: {} as Record<string, number | null>,
  };

  const navbarComps = registry.componentRegistry['navbar'] || [];
  if (navbarComps.length) {
    const seed = `${salt}:navbar`;
    const indices = Array.from({ length: navbarComps.length }, (_, i) => i);
    locked.navbar = pickDeterministic(seed, indices);
  } else {
    locked.navbar = null;
  }

  for (const [cat, comps] of Object.entries(registry.sectionRegistry)) {
    if (Array.isArray(comps) && comps.length) {
      const seed = `${salt}:${cat}`;
      const indices = Array.from({ length: comps.length }, (_, i) => i);
      locked.sections[cat] = pickDeterministic(seed, indices);
    } else {
      locked.sections[cat] = null;
    }
  }

  return locked;
}

export function selectRandomTheme(colorThemeJson: any, globalTheme?: 'light' | 'dark'): string {
  if (!colorThemeJson) {
    return 'lightTheme.default';
  }

  const selectedGlobalTheme = globalTheme || (Math.random() < 0.5 ? 'light' : 'dark');

  const themeKey = selectedGlobalTheme === 'light' ? 'lightTheme' : 'darkTheme';
  const availableThemes = Object.keys(colorThemeJson[themeKey] || {});

  if (availableThemes.length === 0) {
    return `${themeKey}.default`;
  }

  const randomIndex = Math.floor(Math.random() * availableThemes.length);
  const selectedColorTheme = availableThemes[randomIndex];

  return `${themeKey}.${selectedColorTheme}`;
}

export function selectRandomThemeProperties(brandPersonality?: string): {
  defaultButtonVariant: string;
  defaultTextAnimation: string;
  borderRadius: string;
  contentWidth: string;
  sizing: string;
  background: string;
  cardStyle: string;
  primaryButtonStyle: string;
  secondaryButtonStyle: string;
  showBlurBottom: boolean;
} {
  const buttonVariants = [
    'hover-magnetic',
    'hover-bubble',
    'expand-hover',
    'icon-arrow',
    'shift-hover',
    'text-stagger',
  ];
  const textAnimations = ['entrance-slide', 'reveal-blur', 'background-highlight'];
  const borderRadiusOptions = ['sharp', 'rounded', 'soft', 'pill'];
  const contentWidthOptions = ['small', 'medium', 'large'];
  const sizingOptions = ['small', 'medium', 'large'];
  const backgroundOptions = [
    'none',
    'plain',
    'grid',
    'dotGrid',
    'circleGradient',
    'aurora',
    'floatingGradient',
    'animatedGrid',
    'animatedAurora',
    'fluid',
    'radialGradient',
    'gradientBars',
  ];
  const cardStyleOptions = [
    'glass-elevated',
    'glass-flat',
    'glass-depth',
    'gradient-bordered',
    'solid-bordered',
    'layered-gradient',
  ];
  const primaryButtonStyleOptions = [
    'gradient',
    'shadow',
    'flat',
    'layered-depth',
    'radial-glow',
    'diagonal-gradient',
  ];
  const secondaryButtonStyleOptions = [
    'glass',
    'outline',
    'solid',
    'minimal',
    'layered',
    'radial-glow',
  ];

  // Brand personality-based selection with some randomness
  let buttonVariant: string;
  let textAnimation: string;
  let borderRadius: string;

  if (
    brandPersonality?.toLowerCase().includes('modern') ||
    brandPersonality?.toLowerCase().includes('tech')
  ) {
    buttonVariant =
      Math.random() < 0.7
        ? 'hover-magnetic'
        : buttonVariants[Math.floor(Math.random() * buttonVariants.length)];
    textAnimation =
      Math.random() < 0.7
        ? 'entrance-slide'
        : textAnimations[Math.floor(Math.random() * textAnimations.length)];
    borderRadius =
      Math.random() < 0.6
        ? 'sharp'
        : Math.random() < 0.8
          ? 'rounded'
          : borderRadiusOptions[Math.floor(Math.random() * borderRadiusOptions.length)];
  } else if (
    brandPersonality?.toLowerCase().includes('creative') ||
    brandPersonality?.toLowerCase().includes('artistic')
  ) {
    buttonVariant =
      Math.random() < 0.7
        ? 'hover-magnetic'
        : buttonVariants[Math.floor(Math.random() * buttonVariants.length)];
    textAnimation =
      Math.random() < 0.7
        ? 'text-stagger'
        : textAnimations[Math.floor(Math.random() * textAnimations.length)];
    borderRadius =
      Math.random() < 0.6
        ? 'soft'
        : Math.random() < 0.8
          ? 'pill'
          : borderRadiusOptions[Math.floor(Math.random() * borderRadiusOptions.length)];
  } else if (
    brandPersonality?.toLowerCase().includes('professional') ||
    brandPersonality?.toLowerCase().includes('corporate')
  ) {
    buttonVariant =
      Math.random() < 0.7
        ? 'shift-hover'
        : buttonVariants[Math.floor(Math.random() * buttonVariants.length)];
    textAnimation =
      Math.random() < 0.7
        ? 'entrance-slide'
        : textAnimations[Math.floor(Math.random() * textAnimations.length)];
    borderRadius =
      Math.random() < 0.6
        ? 'rounded'
        : Math.random() < 0.8
          ? 'sharp'
          : borderRadiusOptions[Math.floor(Math.random() * borderRadiusOptions.length)];
  } else if (
    brandPersonality?.toLowerCase().includes('playful') ||
    brandPersonality?.toLowerCase().includes('fun')
  ) {
    buttonVariant =
      Math.random() < 0.7
        ? 'hover-magnetic'
        : buttonVariants[Math.floor(Math.random() * buttonVariants.length)];
    textAnimation =
      Math.random() < 0.7
        ? 'background-highlight'
        : textAnimations[Math.floor(Math.random() * textAnimations.length)];
    borderRadius =
      Math.random() < 0.6
        ? 'soft'
        : Math.random() < 0.8
          ? 'pill'
          : borderRadiusOptions[Math.floor(Math.random() * borderRadiusOptions.length)];
  } else {
    buttonVariant = buttonVariants[Math.floor(Math.random() * buttonVariants.length)];
    textAnimation = textAnimations[Math.floor(Math.random() * textAnimations.length)];
    borderRadius = borderRadiusOptions[Math.floor(Math.random() * borderRadiusOptions.length)];
  }

  const contentWidth = contentWidthOptions[Math.floor(Math.random() * contentWidthOptions.length)];
  const sizing = sizingOptions[Math.floor(Math.random() * sizingOptions.length)];
  const background = backgroundOptions[Math.floor(Math.random() * backgroundOptions.length)];
  const cardStyle = cardStyleOptions[Math.floor(Math.random() * cardStyleOptions.length)];
  const primaryButtonStyle =
    primaryButtonStyleOptions[Math.floor(Math.random() * primaryButtonStyleOptions.length)];
  const secondaryButtonStyle =
    secondaryButtonStyleOptions[Math.floor(Math.random() * secondaryButtonStyleOptions.length)];
  const showBlurBottom = Math.random() < 0.5;

  return {
    defaultButtonVariant: buttonVariant,
    defaultTextAnimation: textAnimation,
    borderRadius: borderRadius,
    contentWidth,
    sizing,
    background,
    cardStyle,
    primaryButtonStyle,
    secondaryButtonStyle,
    showBlurBottom,
  };
}

export function extractThemeVariables(plan: any, colorThemeJson: any): string | null {
  if (!plan.selectedTheme || !colorThemeJson) {
    return null;
  }

  try {
    // Parse the selectedTheme path (e.g., "lightTheme.lightBlue" -> ["lightTheme", "lightBlue"])
    const themePath = plan.selectedTheme.split('.');
    if (themePath.length !== 2) {
      return null;
    }

    const [themeType, themeName] = themePath;
    const themeData = colorThemeJson[themeType]?.[themeName];

    if (!themeData) {
      return null;
    }

    // Extract the CSS variables we need
    const variables = [];
    const variableNames = [
      '--background',
      '--card',
      '--foreground',
      '--primary-cta',
      '--secondary-cta',
      '--accent',
      '--background-accent',
    ];

    for (const varName of variableNames) {
      if (themeData[varName]) {
        variables.push(`${varName}: ${themeData[varName]};`);
      }
    }

    return variables.length > 0 ? variables.join('\n') : null;
  } catch (error) {
    const logger = new Logger('executor-gasket-webuild');
    logger.error('Error extracting theme variables:', {
      error,
      method: 'extractThemeVariables',
      utils: 'executor-gasket-webuild',
      params: { plan, colorThemeJson },
    });
    return null;
  }
}

export function selectRandomFont(fontThemesJson: any): {
  key: string;
  name: string;
  import: string;
  initialization: string;
  className: string;
  cssVariable: string;
} | null {
  if (!fontThemesJson) {
    return null;
  }

  try {
    const allFonts: Array<{
      key: string;
      name: string;
      import: string;
      initialization: string;
      className: string;
      cssVariable: string;
    }> = [];

    if (fontThemesJson.singleFonts) {
      for (const [key, font] of Object.entries(fontThemesJson.singleFonts)) {
        const fontData = font as any;
        allFonts.push({
          key,
          name: fontData.name || key,
          import: fontData.import || '',
          initialization: fontData.initialization || '',
          className: fontData.className || '',
          cssVariable: fontData.cssVariable || '',
        });
      }
    }

    if (fontThemesJson.fontPairings) {
      for (const [key, pairing] of Object.entries(fontThemesJson.fontPairings)) {
        const pairingData = pairing as any;
        if (pairingData.font1) {
          allFonts.push({
            key: `${key}_font1`,
            name: pairingData.font1.name || `${key} Font 1`,
            import: pairingData.font1.import || '',
            initialization: pairingData.font1.initialization || '',
            className: pairingData.font1.className || '',
            cssVariable: pairingData.font1.cssVariable || '',
          });
        }
      }
    }

    if (allFonts.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * allFonts.length);
    return allFonts[randomIndex];
  } catch (error) {
    const logger = new Logger('executor-gasket-webuild');
    logger.error('Error selecting random font:', {
      error,
      method: 'selectRandomFont',
      utils: 'executor-gasket-webuild',
      params: { fontThemesJson },
    });
    return null;
  }
}
