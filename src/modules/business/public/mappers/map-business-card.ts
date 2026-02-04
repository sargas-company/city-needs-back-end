import { BusinessCardDto } from '../dto/business-card.dto';

export function mapBusinessCard(
  business: {
    id: string;
    name: string;
    price: number;
    ratingAvg: number;
    ratingCount: number;
    serviceOnSite: boolean;
    serviceInStudio: boolean;
    logo: { url: string } | null;
    address: { city: string } | null;
    location: { lat: number; lng: number } | null;
    category: { id: string; title: string; slug: string };
  },
  extra?: {
    distance?: number;
  },
): BusinessCardDto {
  return {
    id: business.id,
    name: business.name,
    logoUrl: business.logo?.url ?? null,
    price: business.price,
    city: business.address?.city ?? '',
    lat: business.location?.lat ?? null,
    lng: business.location?.lng ?? null,
    category: business.category,
    ratingAvg: business.ratingAvg,
    ratingCount: business.ratingCount,
    serviceOnSite: business.serviceOnSite,
    serviceInStudio: business.serviceInStudio,
    ...(extra?.distance !== undefined ? { distanceMeters: Math.round(extra.distance) } : {}),
  };
}
