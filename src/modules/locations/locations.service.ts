import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { CITIES } from 'src/common/config/cities.config';

import { AddressSearchItemDto } from './dto/address-search-item.dto';
import { AddressSearchQueryDto } from './dto/address-search-query.dto';
import { AddressSearchResponseDto } from './dto/address-search-response.dto';
import { AddressDto } from './dto/address.dto';
import { LocationDto } from './dto/location.dto';

const GOOGLE_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

const GOOGLE_PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

const AUTOCOMPLETE_LIMIT = 5;
const GOOGLE_TIMEOUT_MS = 8_000;

@Injectable()
export class LocationsService {
  private readonly apiKey = process.env.GOOGLE_PLACES_API_KEY!;

  // ======================================================
  // Public API
  // ======================================================

  async searchAddress(dto: AddressSearchQueryDto): Promise<AddressSearchResponseDto> {
    const cityConfig = CITIES[dto.city];

    const predictions = await this.autocomplete({
      query: dto.query,
      countryCode: cityConfig.countryCode,
      center: cityConfig.center,
      radiusMeters: cityConfig.autocompleteRadiusMeters,
    });

    const items: AddressSearchItemDto[] = [];

    for (const prediction of predictions) {
      const details = await this.fetchPlaceDetails(prediction.placeId);
      const normalized = this.normalizePlace(details, dto.city);

      if (!normalized) continue;

      items.push(normalized);
    }

    return { items };
  }

  // ======================================================
  // Google Places Autocomplete
  // ======================================================

  private async autocomplete(params: {
    query: string;
    countryCode: string;
    center: { lat: number; lng: number };
    radiusMeters: number;
  }): Promise<{ placeId: string; description: string }[]> {
    try {
      const response = await axios.get(GOOGLE_AUTOCOMPLETE_URL, {
        timeout: GOOGLE_TIMEOUT_MS,
        params: {
          input: params.query,
          key: this.apiKey,
          types: 'address',
          components: `country:${params.countryCode}`,
          locationbias: `circle:${params.radiusMeters}@${params.center.lat},${params.center.lng}`,
        },
      });

      if (response.data.status !== 'OK') {
        return [];
      }

      return response.data.predictions.slice(0, AUTOCOMPLETE_LIMIT).map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
      }));
    } catch {
      throw new InternalServerErrorException('Failed to autocomplete address');
    }
  }

  // ======================================================
  // Google Place Details
  // ======================================================

  private async fetchPlaceDetails(placeId: string): Promise<any> {
    try {
      const response = await axios.get(GOOGLE_PLACE_DETAILS_URL, {
        timeout: GOOGLE_TIMEOUT_MS,
        params: {
          place_id: placeId,
          key: this.apiKey,
          fields: 'address_components,geometry,formatted_address,place_id',
        },
      });

      if (response.data.status !== 'OK') {
        return null;
      }

      return response.data.result;
    } catch {
      throw new InternalServerErrorException('Failed to fetch place details');
    }
  }

  // ======================================================
  // Normalize Google Place → DTO
  // ======================================================

  private normalizePlace(place: any, expectedCity: string): AddressSearchItemDto | null {
    if (!place?.geometry?.location) {
      return null;
    }

    const components = this.indexAddressComponents(place.address_components || []);

    const city = components.locality;
    const state = components.administrative_area_level_1;
    const countryCode = components.country;
    const streetNumber = components.street_number;
    const route = components.route;

    if (!city || city !== expectedCity) {
      return null;
    }

    if (!state || !countryCode || !route) {
      return null;
    }

    const addressLine1 = streetNumber ? `${streetNumber} ${route}` : route;

    const location: LocationDto = {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
    };

    const address: AddressDto = {
      addressLine1,
      city,
      state,
      countryCode,
      zip: components.postal_code,
    };

    return {
      label: place.formatted_address,
      location,
      address,
      placeId: place.place_id,
    };
  }

  // ======================================================
  // Helpers
  // ======================================================

  private indexAddressComponents(components: any[]): Record<string, string> {
    const map: Record<string, string> = {};

    for (const component of components) {
      for (const type of component.types) {
        map[type] = component.short_name;
      }
    }

    return map;
  }
}
