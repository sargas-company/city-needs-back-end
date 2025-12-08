import type { CapabilitySheet, SectionCapability, ComponentCapability } from './registry-utils';

export function pickBestFooter(
  sectionCaps: SectionCapability[],
  vibe: 'fun_trendy' | 'futuristic_premium' | 'brain_rot',
): string {
  const candidates = sectionCaps.filter((s) => s.category === 'footer');
  if (!candidates.length) return 'FooterBase';

  const score = (s: SectionCapability) => {
    const pk = new Set(s.propsKeys);
    let sc = 0;
    if (pk.has('columns')) sc += 3;
    if (pk.has('logoText') || pk.has('logoSrc')) sc += 1;
    if (vibe === 'futuristic_premium' && (pk.has('gradientClassName') || pk.has('gradientStyle')))
      sc += 1;
    if (vibe !== 'futuristic_premium' && pk.has('items') === false) sc += 0.25;
    sc += s.propsKeys.length > 10 ? 0.5 : 0;
    return sc;
  };

  return candidates.sort((a, b) => score(b) - score(a))[0].name;
}

export function pickBestNavbar(componentCaps: ComponentCapability[]): string {
  const navs = componentCaps.filter((c) => c.category === 'navigation');
  if (!navs.length) return 'NavbarBase';
  const withNavItems = navs.filter((n) => n.supports.itemsProp === 'navItems');
  return (withNavItems[0] ?? navs[0]).name;
}

export function pickFooterAndNavbar(
  caps: CapabilitySheet,
  vibe: 'fun_trendy' | 'futuristic_premium' | 'brain_rot',
) {
  return {
    footer: pickBestFooter(caps.sectionCapabilities, vibe),
    navbar: pickBestNavbar(caps.componentCapabilities),
  };
}
