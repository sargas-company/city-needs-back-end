import { Readable } from 'stream';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface UnsplashImage {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    download_location: string;
  };
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashImage[];
}

@Injectable()
export class UnsplashService {
  private readonly logger = new Logger(UnsplashService.name);
  private readonly accessKey: string;
  private readonly baseUrl = 'https://api.unsplash.com';

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.accessKey = this.configService.get<string>('UNSPLASH_ACCESS_KEY') || '';
    if (!this.accessKey) {
      this.logger.warn('UNSPLASH_ACCESS_KEY not found in environment variables');
    }
  }

  async searchPhotos(query: string, perPage = 10): Promise<UnsplashImage[]> {
    if (!this.accessKey) {
      this.logger.error('Unsplash API Key missing');
      return [];
    }

    try {
      const response = await firstValueFrom(
        this.http.get<UnsplashSearchResponse>(`${this.baseUrl}/search/photos`, {
          params: {
            query,
            per_page: perPage,
            orientation: 'landscape',
          },
          headers: {
            Authorization: `Client-ID ${this.accessKey}`,
          },
        }),
      );

      return response.data.results;
    } catch (error) {
      console.error('Unsplash API error:', error);
      this.logger.error('Unsplash API error:', {
        error: error instanceof Error ? error.message : error,
        method: 'searchPhotos',
        service: 'unsplash',
        params: { query },
      });
      return [];
    }
  }

  async getRandomPhoto(query: string): Promise<UnsplashImage | null> {
    try {
      const photos = await this.searchPhotos(query, 3);
      return photos.length > 0 ? photos[0] : null;
    } catch (error) {
      this.logger.error('Failed to get random photo from Unsplash:', {
        error,
        method: 'getRandomPhoto',
        service: 'unsplash',
        params: { query },
      });
      return null;
    }
  }

  async trackDownload(downloadLocation: string): Promise<void> {
    if (!this.accessKey || !downloadLocation) return;
    try {
      await firstValueFrom(
        this.http.get(downloadLocation, {
          headers: { Authorization: `Client-ID ${this.accessKey}` },
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to track download on Unsplash: ${error}`);
    }
  }

  getImageUrl(photo: UnsplashImage): string {
    return photo.urls.regular;
  }

  getAltText(photo: UnsplashImage, fallbackQuery: string): string {
    const desc = photo.alt_description || photo.description;
    if (desc) return desc;
    return `${fallbackQuery} - Photo by ${photo.user.name} on Unsplash`;
  }

  async downloadAndStoreImage(imageUrl: string): Promise<Express.Multer.File> {
    try {
      const response = await firstValueFrom(
        this.http.get(imageUrl, { responseType: 'arraybuffer' }),
      );

      const mimeType = response.headers['content-type'] || 'image/jpeg';
      let ext = '.jpg';
      if (mimeType === 'image/png') ext = '.png';
      if (mimeType === 'image/webp') ext = '.webp';

      const safeName = `unsplash-${Date.now()}`;
      const fileName = `${safeName}${ext}`;

      const buffer = Buffer.from(response.data);
      const stream = Readable.from(buffer);

      const multerFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: fileName,
        encoding: '7bit',
        mimetype: mimeType,
        size: buffer.length,
        destination: '',
        filename: fileName,
        path: '',
        buffer,
        stream,
      };

      return multerFile;
    } catch (error) {
      this.logger.error('Failed to download/store image from Unsplash:', {
        error,
        service: 'unsplash',
        method: 'downloadAndStoreImage',
        params: { imageUrl },
      });
      throw new Error('Error downloading image from Unsplash');
    }
  }
}
