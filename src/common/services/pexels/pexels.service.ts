import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  page: number;
  per_page: number;
  total_results: number;
  next_page: string;
  prev_page: string;
}

@Injectable()
export class PexelsService {
  private readonly logger = new Logger(PexelsService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.pexels.com/v1';

  constructor(private readonly http: HttpService) {
    this.apiKey = process.env.PEXELS_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('PEXELS_API_KEY not found in environment variables');
    }
  }

  async searchPhotos(query: string, perPage = 1): Promise<PexelsPhoto[]> {
    if (!this.apiKey) {
      throw new Error('Pexels API key not configured');
    }

    try {
      const response = await firstValueFrom(
        this.http.get<PexelsResponse>(`${this.baseUrl}/search`, {
          params: {
            query,
            per_page: perPage,
            orientation: 'landscape', // Prefer landscape for web use
          },
          headers: {
            Authorization: this.apiKey,
          },
        }),
      );

      return response.data.photos;
    } catch (error) {
      this.logger.error('Pexels API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch images from Pexels: ${errorMessage}`);
    }
  }

  async getRandomPhoto(query: string): Promise<PexelsPhoto | null> {
    try {
      const photos = await this.searchPhotos(query, 1);
      return photos.length > 0 ? photos[0] : null;
    } catch (error) {
      this.logger.error('Failed to get random photo:', error);
      return null;
    }
  }

  getPhotoUrl(
    photo: PexelsPhoto,
    size: 'small' | 'medium' | 'large' | 'large2x' = 'large',
  ): string {
    return photo.src[size];
  }

  getAltText(photo: PexelsPhoto, fallbackQuery: string): string {
    return photo.alt || `${fallbackQuery} - Photo by ${photo.photographer}`;
  }
}
