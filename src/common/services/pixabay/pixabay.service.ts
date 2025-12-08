import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

interface PixabaySearchParams {
  query?: string;
  image_type?: 'all' | 'photo' | 'illustration' | 'vector';
  orientation?: 'all' | 'horizontal' | 'vertical';
  category?: string;
  safesearch?: boolean;
  colors?: string;
  order?: 'popular' | 'latest';
  per_page?: number;
  page?: number;
}

export interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

export interface PixabayImage {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  favorites: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

@Injectable()
export class PixabayService {
  private readonly logger = new Logger(PixabayService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://pixabay.com/api/';
  constructor(private readonly http: HttpService) {
    this.apiKey = process.env.PIXABAY_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('PIXABAY_API_KEY not found in environment variables');
    }
  }

  async searchPhotos(params: PixabaySearchParams): Promise<PixabayImage[]> {
    if (!this.apiKey) {
      throw new Error('Pixabay API key not configured');
    }

    try {
      const searchParams = new URLSearchParams({
        q: params.query ?? '',
        image_type: params.image_type ?? 'photo',
        orientation: params.orientation ?? 'horizontal',
        safesearch: String(params.safesearch ?? true),
        per_page: String(params.per_page ?? 10),
        page: String(params.page ?? 1),
        order: params.order ?? 'popular',
        ...(params.category ? { category: params.category } : {}),
      });

      const url = `${this.baseUrl}?key=${this.apiKey}&${searchParams.toString()}`;

      const response = await firstValueFrom(this.http.get<PixabayResponse>(url));

      return response.data.hits;
    } catch (error) {
      this.logger.error('Pixabay API error:', {
        error,
        method: 'searchPhotos',
        service: 'pixabay',
        params: params,
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch images from Pixabay: ${errorMessage}`);
    }
  }

  async getRandomPhoto(query: string): Promise<PixabayImage | null> {
    try {
      const photos = await this.searchPhotos({ query, per_page: 3 });
      return photos.length > 0 ? photos[0] : null;
    } catch (error) {
      this.logger.error('Failed to get random photo:', {
        error,
        method: 'getRandomPhoto',
        service: 'pixabay',
        params: { query },
      });
      return null;
    }
  }

  getPhotoUrl(photo: PixabayImage, size: 'small' | 'medium' | 'large' = 'large'): string {
    switch (size) {
      case 'small':
        return photo.previewURL;
      case 'medium':
        return photo.webformatURL;
      case 'large':
      default:
        return photo.largeImageURL;
    }
  }

  getAltText(photo: PixabayImage, fallbackQuery: string): string {
    if (photo.tags) {
      return photo.tags;
    }
    return `${fallbackQuery} - Photo by ${photo.user}`;
  }

  async downloadAndStoreImage(imageUrl: string): Promise<Express.Multer.File> {
    try {
      const response = await firstValueFrom(
        this.http.get(imageUrl, { responseType: 'arraybuffer' }),
      );

      const mimeType = response.headers['content-type'] || 'image/jpeg';
      const ext = path.extname(imageUrl.split('?')[0]) || '.jpg';

      const safeName = path
        .basename(imageUrl, ext)
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w.-]/g, '');

      const fileName = `${Date.now()}-${safeName}${ext}`;
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
      this.logger.error('Failed to download or store image:', {
        error,
        service: 'pixabay',
        method: 'downloadAndStoreImage',
        params: { imageUrl },
      });
      throw new Error('Error downloading image from Pixabay');
    }
  }
}
