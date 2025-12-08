import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer-core';

export interface ElementStyle {
  selector: string;
  tagName: string;
  className: string;
  computedStyles: Record<string, string>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface Screenshot {
  name: string;
  buffer: Buffer;
  path?: string;
  format?: 'png' | 'jpeg'; // Image format after compression
}

export interface DownloadedImage {
  originalUrl: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
  localPath?: string; // Will be set when saved to project
}

export interface DOMNode {
  tag: string;
  id?: string;
  classes: string[];
  children: DOMNode[];
  depth: number;
  text?: string; // For text content
  attributes?: Record<string, string>;
  computedStyles?: Record<string, string>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CSSVariables {
  customProperties: Record<string, string>; // CSS custom properties: --var-name: value
  scssVariables: Record<string, string>; // SCSS variables: $var-name: value
  colors: Record<string, string>; // Color variables grouped
  spacing: Record<string, string>; // Spacing variables grouped
  typography: Record<string, string>; // Typography variables grouped
  other: Record<string, string>; // Other variables
}

export interface ParsedWebsite {
  url: string;
  title: string;
  html: string;
  bodyHtml: string;
  cleanedHtml: string; // HTML without scripts and dynamic content
  sections: Array<{ name: string; html: string; selector?: string }>;
  domTree?: DOMNode; // NEW: Full DOM tree structure
  layoutInfo?: {
    containers: Array<{
      selector: string;
      type: 'flex' | 'grid' | 'block';
      properties: Record<string, string>;
    }>;
    breakpoints: string[];
  };
  cssVariables?: CSSVariables; // NEW: Extracted CSS/SCSS/SASS variables
  meta: {
    description?: string;
    keywords?: string;
    viewport?: string;
    ogImage?: string;
    charset?: string;
  };
  colors: string[];
  fonts: string[];
  images: string[]; // URLs only
  downloadedImages: DownloadedImage[]; // Downloaded image files
  styles: {
    inline: string[];
    externalUrls: string[];
    externalContent: Array<{ url: string; content: string; filename: string }>;
    computed: ElementStyle[]; // Detailed computed styles per element
  };
  cssClasses: string[];
  screenshots: {
    fullPage?: Screenshot;
    sections: Screenshot[];
  };
  viewport: {
    width: number;
    height: number;
  };
}

@Injectable()
export class WebParserService {
  private readonly logger = new Logger(WebParserService.name);

  async parseWebsite(url: string): Promise<ParsedWebsite> {
    let browser: Browser | null = null;

    try {
      this.logger.log(`Parsing website: ${url}`);

      // Use Puppeteer for comprehensive parsing
      this.logger.log(`Launching Puppeteer browser for: ${url}`);

      // Use puppeteer-core with system-installed Chromium
      // Set CHROMIUM_PATH environment variable to specify custom Chromium location
      const executablePath =
        process.env.CHROMIUM_PATH ||
        process.env.CHROME_PATH ||
        '/usr/bin/chromium-browser' || // Linux default
        '/usr/bin/chromium' || // Alternative Linux path
        '/usr/bin/google-chrome'; // Google Chrome on Linux

      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      const page: Page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to the page with retry logic
      let navigationSuccess = false;
      let lastError: Error | null = null;

      // Try with networkidle0 first (60s timeout)
      try {
        this.logger.log(`  Attempting navigation with networkidle0 (60s timeout)...`);
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 60000,
        });
        navigationSuccess = true;
        this.logger.log(`  ✓ Navigation successful with networkidle0`);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`  ⚠️ networkidle0 failed, trying domcontentloaded...`);

        // Fallback to domcontentloaded (faster, less strict)
        try {
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
          navigationSuccess = true;
          this.logger.log(`  ✓ Navigation successful with domcontentloaded`);
        } catch (error2) {
          lastError = error2 as Error;
          this.logger.warn(`  ⚠️ domcontentloaded failed, trying load...`);

          // Last fallback to just 'load'
          try {
            await page.goto(url, {
              waitUntil: 'load',
              timeout: 30000,
            });
            navigationSuccess = true;
            this.logger.log(`  ✓ Navigation successful with load`);
          } catch (error3) {
            lastError = error3 as Error;
          }
        }
      }

      if (!navigationSuccess) {
        throw new Error(`Failed to navigate to ${url}: ${lastError?.message || 'Unknown error'}`);
      }

      // Wait for additional content to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get the HTML content
      const html = await page.content();
      this.logger.log(`HTML length: ${html?.length || 0} chars`);

      if (!html || typeof html !== 'string') {
        throw new Error(`Invalid response: expected HTML string, got ${typeof html}`);
      }

      if (html.length < 100) {
        this.logger.warn(
          `Suspicious HTML - too short (${html.length} chars): ${html.substring(0, 200)}`,
        );
      }

      const bodyHtml = this.extractBodyContent(html);
      const styles = this.extractStyles(html, url);

      // Download external CSS files with metadata (increase limit from 5 to 10)
      const externalCssContent = await this.downloadExternalCssWithMetadata(
        styles.external.slice(0, 20),
        url,
      );

      // Split into sections
      const sections = this.splitIntoSections(bodyHtml);

      this.logger.log(
        `Parsed ${sections.length} sections from ${(bodyHtml.length / 1024).toFixed(1)} KB of HTML`,
      );

      // Extract and download images from HTML
      this.logger.log(`Extracting images from: ${url}`);
      const imageUrls = this.extractImages(html, url);
      this.logger.log(`Found ${imageUrls.length} image URLs from HTML`);

      // Also extract assets from downloaded CSS files
      const cssAssetUrls: string[] = [];
      for (const cssFile of externalCssContent) {
        const assetsInCss = this.extractAssetsFromCss(cssFile.content, url);
        cssAssetUrls.push(...assetsInCss);
      }
      this.logger.log(`Found ${cssAssetUrls.length} asset URLs from CSS files`);

      // Combine all URLs (unique)
      const allAssetUrls = [...new Set([...imageUrls, ...cssAssetUrls])];
      this.logger.log(`Total unique assets to download: ${allAssetUrls.length}`);
      allAssetUrls.slice(0, 5).forEach((assetUrl) => this.logger.log(`  - ${assetUrl}`));

      const downloadedImages = await this.downloadImages(allAssetUrls);

      this.logger.log(
        `Downloaded ${downloadedImages.length} assets (${(downloadedImages.reduce((sum, img) => sum + img.size, 0) / 1024).toFixed(1)} KB total)`,
      );
      downloadedImages
        .slice(0, 3)
        .forEach((img) => this.logger.log(`  ✓ ${img.filename} from ${img.originalUrl}`));

      // NEW: Extract cleaned HTML without scripts
      const cleanedHtml = await this.extractCleanedHtml(page);
      this.logger.log(`Cleaned HTML: ${(cleanedHtml.length / 1024).toFixed(1)} KB`);

      // NEW: Extract comprehensive computed styles (increase from 100 to 300 elements)
      const computedStyles = await this.extractComputedStyles(page);
      this.logger.log(`Extracted computed styles for ${computedStyles.length} elements`);

      // NEW: Extract DOM tree structure
      const domTree = await this.extractDOMTree(page);
      this.logger.log(`Extracted DOM tree with ${this.countDOMNodes(domTree)} nodes`);

      // NEW: Extract layout information
      const layoutInfo = await this.extractLayoutInfo(page);
      this.logger.log(`Found ${layoutInfo.containers.length} layout containers`);

      // NEW: Take screenshots
      const screenshots = await this.takeScreenshots(page, url);
      this.logger.log(`Captured ${screenshots.sections.length} section screenshots`);

      // NEW: Extract CSS/SCSS/SASS variables
      const cssVariables = await this.extractCSSVariables(page, externalCssContent);
      this.logger.log(
        `Extracted ${Object.keys(cssVariables.customProperties).length} CSS custom properties, ${Object.keys(cssVariables.scssVariables).length} SCSS variables`,
      );
      this.logger.log(
        `  Colors: ${Object.keys(cssVariables.colors).length}, Spacing: ${Object.keys(cssVariables.spacing).length}, Typography: ${Object.keys(cssVariables.typography).length}`,
      );

      await browser.close();

      return {
        url,
        title: this.extractTitle(html),
        html,
        bodyHtml,
        cleanedHtml,
        sections,
        domTree,
        layoutInfo,
        cssVariables,
        meta: this.extractMeta(html),
        colors: this.extractColors(html),
        fonts: this.extractFonts(html),
        images: imageUrls,
        downloadedImages,
        styles: {
          inline: styles.inline,
          externalUrls: styles.external,
          externalContent: externalCssContent,
          computed: computedStyles,
        },
        cssClasses: this.extractCssClasses(bodyHtml),
        screenshots,
        viewport: {
          width: 1920,
          height: 1080,
        },
      };
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      this.logger.error(`Failed to parse ${url}:`, {
        error,
        method: 'parseWebsite',
        service: 'web-parser',
        params: { url },
      });
      throw new Error(
        `Failed to parse website: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  extractBodyContent(html: string): string {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) return '';

    let body = bodyMatch[1];

    // Remove scripts and styles
    body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    body = body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    return body.trim();
  }

  private extractTitle(html: string): string {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return match ? match[1].trim() : 'Untitled';
  }

  private extractMeta(html: string): { description?: string; keywords?: string } {
    const meta: { description?: string; keywords?: string } = {};

    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    );
    if (descMatch) meta.description = descMatch[1];

    const keywordsMatch = html.match(
      /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    );
    if (keywordsMatch) meta.keywords = keywordsMatch[1];

    return meta;
  }

  private extractColors(html: string): string[] {
    const colors = new Set<string>();

    // Extract hex colors
    const hexMatches = html.matchAll(/#([0-9a-f]{3,6})\b/gi);
    for (const match of hexMatches) {
      colors.add(`#${match[1].toLowerCase()}`);
    }

    // Extract rgb/rgba
    const rgbMatches = html.matchAll(/rgba?\(([^)]+)\)/gi);
    for (const match of rgbMatches) {
      const values = match[1].split(',').map((v) => v.trim());
      if (values.length >= 3) {
        const r = parseInt(values[0]);
        const g = parseInt(values[1]);
        const b = parseInt(values[2]);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          colors.add(hex);
        }
      }
    }

    return Array.from(colors).slice(0, 20);
  }

  private extractFonts(html: string): string[] {
    const fonts = new Set<string>();

    // Extract from font-family
    const fontMatches = html.matchAll(/font-family:\s*([^;}"']+)/gi);
    for (const match of fontMatches) {
      const fontList = match[1].split(',').map((f) => f.trim().replace(/['"]/g, ''));
      fontList.forEach((f) => fonts.add(f));
    }

    // Extract Google Fonts
    const googleFontMatch = html.match(/fonts\.googleapis\.com\/css[^"']*family=([^"'&]+)/i);
    if (googleFontMatch) {
      const fontNames = googleFontMatch[1].split('|');
      fontNames.forEach((f) => fonts.add(f.replace(/\+/g, ' ')));
    }

    return Array.from(fonts).slice(0, 10);
  }

  private extractImages(html: string, baseUrl: string): string[] {
    const images: string[] = [];

    this.logger.log('Extracting images from HTML...');

    // Extract from <img> tags
    const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
      const src = this.resolveUrl(match[1], baseUrl);
      if (src && !src.startsWith('data:')) {
        images.push(src);
      }
    }
    this.logger.log(`  Found ${images.length} <img> tags`);

    // Extract from CSS background-image - CRITICAL
    const bgImageMatches = html.matchAll(/background-image:\s*url\(["']?([^"')]+)["']?\)/gi);
    let bgImageCount = 0;
    for (const match of bgImageMatches) {
      const src = this.resolveUrl(match[1], baseUrl);
      if (src && !src.startsWith('data:')) {
        images.push(src);
        bgImageCount++;
      }
    }
    this.logger.log(`  Found ${bgImageCount} background-image URLs`);

    // Extract from background: url() shorthand
    const bgShorthandMatches = html.matchAll(/background:\s*[^;]*?url\(["']?([^"')]+)["']?\)/gi);
    let bgShorthandCount = 0;
    for (const match of bgShorthandMatches) {
      const src = this.resolveUrl(match[1], baseUrl);
      if (src && !src.startsWith('data:')) {
        images.push(src);
        bgShorthandCount++;
      }
    }
    this.logger.log(`  Found ${bgShorthandCount} background shorthand URLs`);

    // Extract from url() in any CSS context (including fonts, icons, masks)
    const urlMatches = html.matchAll(/url\(["']?([^"')]+)["']?\)/gi);
    let urlCount = 0;
    for (const match of urlMatches) {
      const src = this.resolveUrl(match[1], baseUrl);
      if (src && !src.startsWith('data:')) {
        // Check if it's an image file
        if (this.isImageUrl(src)) {
          images.push(src);
          urlCount++;
        }
      }
    }
    this.logger.log(`  Found ${urlCount} other url() image references`);

    // Extract SVG, fonts, and other assets from src/href attributes
    const assetMatches = html.matchAll(
      /(?:src|href)=["']([^"']+\.(?:svg|woff|woff2|ttf|eot|otf|png|jpg|jpeg|gif|webp|avif))["']/gi,
    );
    let assetCount = 0;
    for (const match of assetMatches) {
      const src = this.resolveUrl(match[1], baseUrl);
      if (src && !src.startsWith('data:')) {
        images.push(src);
        assetCount++;
      }
    }
    this.logger.log(`  Found ${assetCount} assets from src/href attributes`);

    const uniqueImages = [...new Set(images)];
    this.logger.log(`  Total unique images: ${uniqueImages.length}`);

    return uniqueImages.slice(0, 200); // Increased limit from 100 to 200
  }

  /**
   * Check if URL is an image file
   */
  private isImageUrl(url: string): boolean {
    const imageExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.webp',
      '.avif',
      '.svg',
      '.bmp',
      '.ico',
    ];
    const lowerUrl = url.toLowerCase().split('?')[0]; // Remove query params
    return imageExtensions.some((ext) => lowerUrl.endsWith(ext));
  }

  /**
   * Extract asset URLs (images, fonts, etc.) from CSS content
   * ENHANCED: Better extraction of background-image and other CSS images
   */
  private extractAssetsFromCss(css: string, baseUrl: string): string[] {
    const assets: string[] = [];

    this.logger.log(`  Extracting assets from CSS (${(css.length / 1024).toFixed(1)} KB)...`);

    // 1. Extract from background-image: url() - CRITICAL for relative paths
    const bgImageMatches = css.matchAll(/background-image:\s*url\(["']?([^"')]+)["']?\)/gi);
    let bgCount = 0;
    for (const match of bgImageMatches) {
      let assetUrl = match[1].trim();
      if (assetUrl.startsWith('data:')) continue;

      // Log what we're trying to resolve
      this.logger.log(`    Found background-image: ${assetUrl}`);

      const resolved = this.resolveUrl(assetUrl, baseUrl);
      if (resolved && resolved !== '') {
        assets.push(resolved);
        bgCount++;
        this.logger.log(`      ✓ Resolved to: ${resolved}`);
      } else {
        this.logger.warn(`      ✗ Failed to resolve: ${assetUrl}`);
      }
    }
    if (bgCount > 0) this.logger.log(`    → ${bgCount} background-image URLs extracted`);

    // 2. Extract from background: url() (shorthand property)
    const bgShorthandMatches = css.matchAll(/background:\s*[^;]*?url\(["']?([^"')]+)["']?\)/gi);
    let bgShorthandCount = 0;
    for (const match of bgShorthandMatches) {
      let assetUrl = match[1].trim();
      if (assetUrl.startsWith('data:')) continue;

      this.logger.log(`    Found background shorthand: ${assetUrl}`);

      const resolved = this.resolveUrl(assetUrl, baseUrl);
      if (resolved && resolved !== '') {
        assets.push(resolved);
        bgShorthandCount++;
        this.logger.log(`      ✓ Resolved to: ${resolved}`);
      } else {
        this.logger.warn(`      ✗ Failed to resolve: ${assetUrl}`);
      }
    }
    if (bgShorthandCount > 0)
      this.logger.log(`    → ${bgShorthandCount} background shorthand URLs extracted`);

    // 3. Extract all other url() references in CSS (fonts, masks, content, etc.)
    const urlMatches = css.matchAll(/url\(["']?([^"')]+)["']?\)/gi);
    let otherCount = 0;
    for (const match of urlMatches) {
      let assetUrl = match[1].trim();

      // Skip data URIs
      if (assetUrl.startsWith('data:')) continue;

      // Resolve relative URLs
      const resolved = this.resolveUrl(assetUrl, baseUrl);
      if (resolved && !assets.includes(resolved)) {
        assets.push(resolved);
        otherCount++;
      }
    }
    if (otherCount > 0) this.logger.log(`    → ${otherCount} other url() references`);

    const uniqueAssets = [...new Set(assets)];
    this.logger.log(`  Total unique assets from CSS: ${uniqueAssets.length}`);

    return uniqueAssets;
  }

  /**
   * Download images from URLs
   * Supports various image formats and handles errors gracefully
   */
  private async downloadImages(imageUrls: string[]): Promise<DownloadedImage[]> {
    this.logger.log(`Downloading ${imageUrls.length} assets (images, fonts, icons)...`);

    const downloaded: DownloadedImage[] = [];
    const maxAssets = 100; // Increased for fonts and icons
    const maxSizePerAsset = 5 * 1024 * 1024; // 5MB per asset

    const urlsToDownload = imageUrls.slice(0, maxAssets);

    await Promise.allSettled(
      urlsToDownload.map(async (url, index) => {
        try {
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000, // 10 seconds per asset
            maxContentLength: maxSizePerAsset,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            },
          });

          const buffer = Buffer.from(response.data);
          const mimeType = response.headers['content-type'] || 'image/png';

          // Generate filename from URL - preserve original name when possible
          let filename: string;
          try {
            const urlPath = new URL(url).pathname;
            const originalFilename = urlPath.split('/').pop() || `image-${index}`;

            // Clean filename but preserve the name (don't add too many underscores)
            const cleanName = originalFilename
              .replace(/[?#]/g, '') // Remove query params markers
              .split('?')[0] // Remove query string
              .split('#')[0] // Remove hash
              .replace(/[^a-zA-Z0-9.-]/g, '_'); // Replace special chars with underscore

            // If we have a clean name, use it with timestamp prefix to ensure uniqueness
            if (cleanName && cleanName.length > 0 && cleanName !== '_') {
              // Add timestamp prefix but keep original name recognizable
              const timestamp = Date.now();
              const nameParts = cleanName.split('.');
              if (nameParts.length > 1) {
                // Has extension
                const ext = nameParts.pop();
                const name = nameParts.join('.');
                filename = `${name}-${timestamp}.${ext}`;
              } else {
                // No extension
                filename = `${cleanName}-${timestamp}.${this.getExtensionFromMime(mimeType)}`;
              }
            } else {
              filename = `image-${Date.now()}-${index}.${this.getExtensionFromMime(mimeType)}`;
            }
          } catch {
            filename = `image-${Date.now()}-${index}.${this.getExtensionFromMime(mimeType)}`;
          }

          downloaded.push({
            originalUrl: url,
            filename,
            buffer,
            mimeType,
            size: buffer.length,
          });

          this.logger.log(`✓ Downloaded: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
        } catch (error) {
          this.logger.warn(
            `✗ Failed to download ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }),
    );

    this.logger.log(`Successfully downloaded ${downloaded.length}/${urlsToDownload.length} images`);
    return downloaded;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMime(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/avif': 'avif',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff',
    };

    return mimeMap[mimeType] || 'png';
  }

  private extractStyles(html: string, baseUrl: string): { inline: string[]; external: string[] } {
    const inline: string[] = [];
    const external: string[] = [];

    // Inline styles
    const styleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const match of styleMatches) {
      if (match[1].trim()) {
        inline.push(match[1].trim());
      }
    }

    // External stylesheets
    const linkMatches = html.matchAll(
      /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    );
    for (const match of linkMatches) {
      const href = this.resolveUrl(match[1], baseUrl);
      if (href) {
        external.push(href);
      }
    }

    return { inline, external };
  }

  /**
   * Resolve relative URLs to absolute URLs
   * ENHANCED: Better handling of relative paths for background-image
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      // Remove whitespace
      url = url.trim();

      // Skip data URIs
      if (url.startsWith('data:')) {
        return '';
      }

      // Already absolute URL with protocol
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // Protocol-relative URL (//example.com/image.jpg)
      if (url.startsWith('//')) {
        return `https:${url}`;
      }

      // Absolute path (/a/b/parrot.png) - CRITICAL for background-image
      if (url.startsWith('/')) {
        const urlObj = new URL(baseUrl);
        const resolved = `${urlObj.protocol}//${urlObj.host}${url}`;
        this.logger.log(`    Resolved absolute path: ${url} → ${resolved}`);
        return resolved;
      }

      // Relative path (a/b/parrot.png or ../images/bg.jpg)
      const resolved = new URL(url, baseUrl).href;
      this.logger.log(`    Resolved relative path: ${url} → ${resolved}`);
      return resolved;
    } catch (error) {
      this.logger.warn(`    Failed to resolve URL: ${url} (base: ${baseUrl})`);
      return '';
    }
  }

  private extractCssClasses(html: string): string[] {
    const classes = new Set<string>();

    // Extract from class attributes
    const classMatches = html.matchAll(/class=["']([^"']+)["']/gi);
    for (const match of classMatches) {
      const classList = match[1].split(/\s+/).filter((c) => c.length > 0);
      classList.forEach((c) => classes.add(c));
    }

    return Array.from(classes).slice(0, 100); // Limit to 100 classes
  }

  private splitIntoSections(
    html: string,
  ): Array<{ name: string; html: string; selector?: string }> {
    const sections: Array<{ name: string; html: string; selector?: string }> = [];
    this.logger.log('Splitting HTML into logical sections for React components...');

    // Extract semantic sections for proper React component structure

    // 1. Header
    const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
    if (headerMatch) {
      sections.push({ name: 'header', html: headerMatch[0], selector: 'header' });
      this.logger.log(
        `  ✓ Found <header> section (${(headerMatch[0].length / 1024).toFixed(1)} KB)`,
      );
    }

    // 2. Navigation
    const navMatch = html.match(/<nav[^>]*>[\s\S]*?<\/nav>/i);
    if (navMatch) {
      sections.push({ name: 'navigation', html: navMatch[0], selector: 'nav' });
      this.logger.log(`  ✓ Found <nav> section (${(navMatch[0].length / 1024).toFixed(1)} KB)`);
    }

    // 3. Main content
    const mainMatch = html.match(/<main[^>]*>[\s\S]*?<\/main>/i);
    if (mainMatch) {
      sections.push({ name: 'main-content', html: mainMatch[0], selector: 'main' });
      this.logger.log(`  ✓ Found <main> section (${(mainMatch[0].length / 1024).toFixed(1)} KB)`);
    }

    // 4. All <section> tags
    const sectionMatches = Array.from(html.matchAll(/<section[^>]*>[\s\S]*?<\/section>/gi));
    sectionMatches.forEach((match, i) => {
      sections.push({
        name: `section-${i + 1}`,
        html: match[0],
        selector: 'section',
      });
      this.logger.log(`  ✓ Found <section> #${i + 1} (${(match[0].length / 1024).toFixed(1)} KB)`);
    });

    // 5. Footer
    const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
    if (footerMatch) {
      sections.push({ name: 'footer', html: footerMatch[0], selector: 'footer' });
      this.logger.log(
        `  ✓ Found <footer> section (${(footerMatch[0].length / 1024).toFixed(1)} KB)`,
      );
    }

    // 6. If no semantic tags found, use entire body
    if (sections.length === 0) {
      this.logger.warn('  ⚠️ No semantic sections found, using full body');
      sections.push({ name: 'full-body', html: html });
    }

    this.logger.log(`Total sections: ${sections.length}`);
    return sections;
  }

  private async downloadExternalCssWithMetadata(
    cssUrls: string[],
    refererUrl: string,
  ): Promise<Array<{ url: string; content: string; filename: string }>> {
    const downloadedCss: Array<{ url: string; content: string; filename: string }> = [];

    for (let i = 0; i < cssUrls.length; i++) {
      const cssUrl = cssUrls[i];
      try {
        this.logger.log(`Downloading CSS: ${cssUrl}`);
        const response = await axios.get(cssUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/css,*/*;q=0.1',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            Referer: refererUrl, // Откуда пришли
          },
          timeout: 30000,
          maxRedirects: 5,
        });

        if (response.data && typeof response.data === 'string') {
          // Extract filename from URL or use index
          const urlParts = cssUrl.split('/');
          const lastPart = urlParts[urlParts.length - 1] || `external-${i + 1}.css`;
          const filename = lastPart.includes('.css')
            ? lastPart.split('?')[0]
            : `external-${i + 1}.css`;

          downloadedCss.push({
            url: cssUrl,
            content: response.data,
            filename: `external-${i + 1}.css`, // Простое имя для избежания конфликтов
          });

          this.logger.log(`Downloaded CSS: ${filename}, size: ${response.data.length} bytes`);
        }
      } catch (error) {
        this.logger.warn(`Failed to download CSS from ${cssUrl}:`, {
          error,
          method: 'downloadExternalCssWithMetadata',
          service: 'web-parser',
          params: { cssUrl, refererUrl },
        });
      }
    }

    return downloadedCss;
  }

  /**
   * Extract detailed computed styles from page
   * Captures final rendered CSS including compiled and inherited properties
   */
  private async extractComputedStyles(page: Page): Promise<ElementStyle[]> {
    try {
      this.logger.log('Extracting detailed computed styles from page...');

      const elementStyles = await page.evaluate(() => {
        const styles: ElementStyle[] = [];

        // Key CSS properties to extract (comprehensive list)
        const importantProps = [
          // Layout & Box Model
          'display',
          'position',
          'top',
          'right',
          'bottom',
          'left',
          'zIndex',
          'width',
          'height',
          'minWidth',
          'minHeight',
          'maxWidth',
          'maxHeight',
          'margin',
          'marginTop',
          'marginRight',
          'marginBottom',
          'marginLeft',
          'padding',
          'paddingTop',
          'paddingRight',
          'paddingBottom',
          'paddingLeft',
          'boxSizing',
          'overflow',
          'overflowX',
          'overflowY',

          // Flexbox
          'flexDirection',
          'flexWrap',
          'justifyContent',
          'alignItems',
          'alignContent',
          'flex',
          'flexGrow',
          'flexShrink',
          'flexBasis',
          'order',
          'gap',
          'rowGap',
          'columnGap',

          // Grid
          'gridTemplateColumns',
          'gridTemplateRows',
          'gridTemplateAreas',
          'gridAutoFlow',
          'gridColumn',
          'gridRow',
          'gridArea',

          // Typography
          'color',
          'fontSize',
          'fontFamily',
          'fontWeight',
          'fontStyle',
          'lineHeight',
          'letterSpacing',
          'textAlign',
          'textDecoration',
          'textTransform',
          'whiteSpace',
          'wordBreak',
          'textShadow',

          // Background & Borders
          'backgroundColor',
          'backgroundImage',
          'backgroundSize',
          'backgroundPosition',
          'backgroundRepeat',
          'border',
          'borderWidth',
          'borderStyle',
          'borderColor',
          'borderRadius',
          'borderTop',
          'borderRight',
          'borderBottom',
          'borderLeft',

          // Visual Effects
          'boxShadow',
          'opacity',
          'transform',
          'transition',
          'animation',
          'filter',
          'backdropFilter',
          'cursor',

          // Other
          'visibility',
          'pointerEvents',
          'userSelect',
          'objectFit',
          'objectPosition',
        ];

        // Get all significant elements (semantic tags + class/id elements)
        const selectors = [
          'header',
          'nav',
          'main',
          'section',
          'article',
          'aside',
          'footer',
          'div[class]',
          'div[id]',
          'span[class]',
          'a',
          'button',
          'img',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'p',
          'ul',
          'ol',
          'li',
        ];

        const elements = document.querySelectorAll(selectors.join(', '));
        const maxElements = 1000; // Increased from 100 for better coverage

        Array.from(elements)
          .slice(0, maxElements)
          .forEach((element, index) => {
            const computedStyle = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            // Generate meaningful selector
            let selector = element.tagName.toLowerCase();
            if (element.id) {
              selector = `#${element.id}`;
            } else if (element.className && typeof element.className === 'string') {
              const classes = element.className
                .trim()
                .split(/\s+/)
                .filter((c) => c);
              if (classes.length > 0) {
                selector = `.${classes.join('.')}`;
              }
            }

            // Extract only non-default/meaningful styles
            const elementStyles: Record<string, string> = {};
            importantProps.forEach((prop) => {
              const value = computedStyle.getPropertyValue(prop);
              // Filter out default/empty values
              if (
                value &&
                value !== 'none' &&
                value !== 'normal' &&
                value !== 'auto' &&
                value !== 'rgba(0, 0, 0, 0)' &&
                value !== '0px' &&
                value.trim() !== ''
              ) {
                elementStyles[prop] = value;
              }
            });

            if (Object.keys(elementStyles).length > 0) {
              styles.push({
                selector: `${selector}-${index}`,
                tagName: element.tagName.toLowerCase(),
                className: element.className?.toString() || '',
                computedStyles: elementStyles,
                boundingBox: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                },
              });
            }
          });

        return styles;
      });

      this.logger.log(`Extracted computed styles for ${elementStyles.length} elements`);
      return elementStyles;
    } catch (error) {
      this.logger.warn(
        `Failed to extract computed styles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, method: 'extractComputedStyles', service: 'web-parser', params: { page } },
      );
      return [];
    }
  }

  /**
   * Take smart screenshots of the page
   * Includes full page and key sections
   * UPDATED: Resize images to fit Claude API limits (max 8000px per side)
   */
  private async takeScreenshots(
    page: Page,
    _url: string,
  ): Promise<{ fullPage?: Screenshot; sections: Screenshot[] }> {
    try {
      this.logger.log('Taking screenshots of page and sections...');

      const screenshots: { fullPage?: Screenshot; sections: Screenshot[] } = {
        sections: [],
      };

      // Full page screenshot with size limit for Claude API
      try {
        const fullPageBuffer = await page.screenshot({
          fullPage: true,
          type: 'png',
        });

        // Resize if too large for Claude API (max 8000px per dimension)
        const { buffer: resizedBuffer, format } = await this.resizeImageForClaude(
          fullPageBuffer as Buffer,
          'full-page',
        );

        screenshots.fullPage = {
          name: 'full-page',
          buffer: resizedBuffer,
          format,
        };

        this.logger.log('Captured and resized full page screenshot');
      } catch (error) {
        this.logger.warn(
          `Failed to capture full page screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { error, method: 'takeScreenshots', service: 'web-parser', params: { page, _url } },
        );
      }

      // Section screenshots
      const sectionSelectors = [
        { name: 'header', selector: 'header' },
        { name: 'nav', selector: 'nav' },
        { name: 'hero', selector: 'section:first-of-type, .hero, [class*="hero"]' },
        { name: 'main', selector: 'main' },
        { name: 'footer', selector: 'footer' },
      ];

      for (const { name, selector } of sectionSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const buffer = await element.screenshot({ type: 'png' });

            // Resize if needed for Claude API
            const { buffer: resizedBuffer, format } = await this.resizeImageForClaude(
              buffer as Buffer,
              name,
            );

            screenshots.sections.push({
              name,
              buffer: resizedBuffer,
              format,
            });
            this.logger.log(`Captured and resized ${name} section screenshot`);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to capture ${name} section: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { error },
          );
        }
      }

      return screenshots;
    } catch (error) {
      this.logger.warn(
        `Failed to take screenshots: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, method: 'takeScreenshots', service: 'web-parser', params: { page, _url } },
      );
      return { sections: [] };
    }
  }

  /**
   * Resize and compress image if it exceeds Claude API limits
   * - Max dimension: 8000px per side
   * - Max file size: 5 MB (5242880 bytes)
   * Uses sharp library for fast image processing
   * Returns buffer and format information
   */
  private async resizeImageForClaude(
    buffer: Buffer,
    imageName: string,
  ): Promise<{ buffer: Buffer; format: 'png' | 'jpeg' }> {
    try {
      const sharp = require('sharp');
      const MAX_DIMENSION = 8000; // Claude API limit
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

      // Get image metadata
      const metadata = await sharp(buffer).metadata();
      const { width, height } = metadata;

      if (!width || !height) {
        this.logger.warn(`Could not get dimensions for ${imageName}, returning original`);
        // Detect format from buffer signature
        const format = this.detectImageFormat(buffer);
        return { buffer, format };
      }

      let currentBuffer = buffer;
      let currentWidth = width;
      let currentHeight = height;
      const originalWidth = width; // Store original dimensions for final aggressive compression
      const originalHeight = height;
      const originalBuffer = buffer; // Store original buffer for final aggressive compression if needed

      // Step 1: Resize if dimensions exceed limit
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const aspectRatio = width / height;
        let newWidth = width;
        let newHeight = height;

        if (width > height) {
          newWidth = MAX_DIMENSION;
          newHeight = Math.round(MAX_DIMENSION / aspectRatio);
        } else {
          newHeight = MAX_DIMENSION;
          newWidth = Math.round(MAX_DIMENSION * aspectRatio);
        }

        this.logger.log(
          `  ${imageName}: ${width}x${height} → ${newWidth}x${newHeight} (resized for dimension limit)`,
        );

        currentBuffer = await sharp(buffer)
          .resize(newWidth, newHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .png({ quality: 90 })
          .toBuffer();

        currentWidth = newWidth;
        currentHeight = newHeight;
      }

      // Step 2: Compress if file size exceeds 5 MB
      let fileSize = currentBuffer.length;
      let compressionLevel = 9; // Start with maximum PNG compression
      let quality = 85; // For JPEG conversion if needed
      let scale = 1.0;
      let useJpeg = false;
      let iterations = 0;
      const maxIterations = 50; // Prevent infinite loops

      // If file is already small enough, skip compression
      if (fileSize <= MAX_FILE_SIZE) {
        this.logger.log(
          `  ${imageName}: File size ${(fileSize / 1024 / 1024).toFixed(2)} MB is within limit, skipping compression`,
        );
      } else {
        // Start with maximum PNG compression
        this.logger.log(
          `  ${imageName}: File size ${(fileSize / 1024 / 1024).toFixed(2)} MB > 5 MB, starting compression`,
        );

        currentBuffer = await sharp(currentBuffer)
          .png({ compressionLevel: 9 })
          .toBuffer();
        fileSize = currentBuffer.length;

        // If still too large, convert to JPEG (better compression)
        if (fileSize > MAX_FILE_SIZE && !useJpeg) {
          useJpeg = true;
          quality = 85;
          this.logger.log(
            `  ${imageName}: Still too large (${(fileSize / 1024 / 1024).toFixed(2)} MB), converting to JPEG with quality ${quality}`,
          );

          currentBuffer = await sharp(currentBuffer)
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
          fileSize = currentBuffer.length;
        }

        // Continue compressing until under 5 MB or max iterations
        while (fileSize > MAX_FILE_SIZE && iterations < maxIterations) {
          iterations++;

          // Reduce JPEG quality progressively
          if (useJpeg && quality > 30) {
            quality = Math.max(30, quality - 5);
            this.logger.log(
              `  ${imageName}: Still too large (${(fileSize / 1024 / 1024).toFixed(2)} MB), reducing JPEG quality to ${quality}`,
            );

            currentBuffer = await sharp(currentBuffer)
              .jpeg({ quality, mozjpeg: true })
              .toBuffer();
            fileSize = currentBuffer.length;

            // If still too large after quality reduction, also reduce dimensions
            if (fileSize > MAX_FILE_SIZE && scale > 0.3) {
              scale = Math.max(0.3, scale - 0.05);
              const newWidth = Math.round(currentWidth * scale);
              const newHeight = Math.round(currentHeight * scale);

              this.logger.log(
                `  ${imageName}: Still too large (${(fileSize / 1024 / 1024).toFixed(2)} MB), scaling down to ${newWidth}x${newHeight}`,
              );

              currentBuffer = await sharp(currentBuffer)
                .resize(newWidth, newHeight, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .jpeg({ quality, mozjpeg: true })
                .toBuffer();

              fileSize = currentBuffer.length;
              currentWidth = newWidth;
              currentHeight = newHeight;
            }
          } else if (!useJpeg) {
            // If PNG and still too large, convert to JPEG
            useJpeg = true;
            quality = 75;
            this.logger.log(
              `  ${imageName}: Still too large (${(fileSize / 1024 / 1024).toFixed(2)} MB), converting to JPEG with quality ${quality}`,
            );

            currentBuffer = await sharp(currentBuffer)
              .jpeg({ quality, mozjpeg: true })
              .toBuffer();
            fileSize = currentBuffer.length;
          } else {
            // Last resort: reduce dimensions more aggressively
            if (scale > 0.3) {
              scale = Math.max(0.3, scale - 0.05);
              const newWidth = Math.round(currentWidth * scale);
              const newHeight = Math.round(currentHeight * scale);

              this.logger.log(
                `  ${imageName}: Still too large (${(fileSize / 1024 / 1024).toFixed(2)} MB), aggressively scaling down to ${newWidth}x${newHeight}`,
              );

              currentBuffer = await sharp(currentBuffer)
                .resize(newWidth, newHeight, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .jpeg({ quality: 30, mozjpeg: true })
                .toBuffer();

              fileSize = currentBuffer.length;
              currentWidth = newWidth;
              currentHeight = newHeight;
              quality = 30;
            } else {
              // Can't compress more, break
              break;
            }
          }
        }

        if (iterations >= maxIterations) {
          this.logger.warn(
            `  ${imageName}: Reached max compression iterations, final size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
          );
        }
      }

      // Final check: if still too large, apply aggressive compression
      if (currentBuffer.length > MAX_FILE_SIZE) {
        this.logger.warn(
          `  ${imageName}: Final size ${(currentBuffer.length / 1024 / 1024).toFixed(2)} MB still exceeds 5 MB, applying aggressive compression`,
        );

        // Calculate target scale to get under 5 MB
        // Estimate: reduce by factor that should get us under limit
        // File size is roughly proportional to area (width * height), so scale by sqrt of size ratio
        const targetScale = Math.sqrt(MAX_FILE_SIZE / currentBuffer.length) * 0.85; // 0.85 for safety margin
        const aggressiveScale = Math.max(0.2, targetScale);
        const aggressiveWidth = Math.round(originalWidth * aggressiveScale);
        const aggressiveHeight = Math.round(originalHeight * aggressiveScale);
        const aggressiveQuality = 25; // Very low quality as last resort

        this.logger.log(
          `  ${imageName}: Aggressively compressing from ${originalWidth}x${originalHeight} to ${aggressiveWidth}x${aggressiveHeight} with JPEG quality ${aggressiveQuality}`,
        );

        // Use original buffer for better quality when doing aggressive compression
        // This avoids quality loss from multiple re-compressions
        currentBuffer = await sharp(originalBuffer)
          .resize(aggressiveWidth, aggressiveHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: aggressiveQuality, mozjpeg: true })
          .toBuffer();

        currentWidth = aggressiveWidth;
        currentHeight = aggressiveHeight;
        quality = aggressiveQuality;
        useJpeg = true;
        fileSize = currentBuffer.length;

        // If still too large after aggressive compression, try even more aggressive
        if (currentBuffer.length > MAX_FILE_SIZE) {
          const ultraAggressiveScale = Math.sqrt(MAX_FILE_SIZE / currentBuffer.length) * 0.8;
          const finalScale = Math.max(0.15, ultraAggressiveScale);
          const finalWidth = Math.round(originalWidth * finalScale);
          const finalHeight = Math.round(originalHeight * finalScale);

          this.logger.log(
            `  ${imageName}: Ultra-aggressive compression to ${finalWidth}x${finalHeight} with JPEG quality 20`,
          );

          currentBuffer = await sharp(originalBuffer)
            .resize(finalWidth, finalHeight, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 20, mozjpeg: true })
            .toBuffer();

          currentWidth = finalWidth;
          currentHeight = finalHeight;
          quality = 20;
        }
      }

      const originalSize = (buffer.length / 1024 / 1024).toFixed(2);
      const finalSize = (currentBuffer.length / 1024 / 1024).toFixed(2);
      const formatInfo = useJpeg
        ? `JPEG quality: ${quality}`
        : `PNG compression: ${compressionLevel}`;
      this.logger.log(
        `  ${imageName}: ${originalSize} MB → ${finalSize} MB (${currentWidth}x${currentHeight}, ${formatInfo})`,
      );

      if (currentBuffer.length > MAX_FILE_SIZE) {
        this.logger.error(
          `  ${imageName}: ERROR - Final size ${finalSize} MB still exceeds 5 MB limit after aggressive compression. This may cause Claude API to reject the image.`,
        );
      }

      return { buffer: currentBuffer, format: useJpeg ? 'jpeg' : 'png' };
    } catch (error) {
      this.logger.warn(
        `Failed to resize/compress ${imageName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.logger.warn(`Returning original image (may fail Claude API validation)`, {
        error,
        method: 'resizeImageForClaude',
        service: 'web-parser',
        params: { buffer, imageName },
      });
      const format = this.detectImageFormat(buffer);
      return { buffer, format };
    }
  }

  /**
   * Detect image format from buffer signature (magic numbers)
   */
  private detectImageFormat(buffer: Buffer): 'png' | 'jpeg' {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'png';
    }
    // JPEG signature: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }
    // Default to PNG if unknown
    return 'png';
  }

  /**
   * Extract cleaned HTML without scripts and dynamic content
   */
  private async extractCleanedHtml(page: Page): Promise<string> {
    try {
      const cleanedHtml = await page.evaluate(() => {
        // Clone the body to avoid modifying the actual DOM
        const bodyClone = document.body.cloneNode(true) as HTMLElement;

        // Remove scripts
        bodyClone.querySelectorAll('script').forEach((el) => el.remove());

        // Remove noscript tags
        bodyClone.querySelectorAll('noscript').forEach((el) => el.remove());

        // Remove style tags (we get styles separately)
        bodyClone.querySelectorAll('style').forEach((el) => el.remove());

        // Remove comments
        const walker = document.createTreeWalker(bodyClone, NodeFilter.SHOW_COMMENT);
        const commentsToRemove: Node[] = [];
        let node;
        while ((node = walker.nextNode())) {
          commentsToRemove.push(node);
        }
        commentsToRemove.forEach((comment) => comment.parentNode?.removeChild(comment));

        // Remove data attributes used by frameworks (React, Vue, etc.)
        bodyClone.querySelectorAll('*').forEach((el) => {
          Array.from(el.attributes).forEach((attr) => {
            if (
              attr.name.startsWith('data-react') ||
              attr.name.startsWith('data-vue') ||
              attr.name.startsWith('data-v-') ||
              attr.name.startsWith('data-testid')
            ) {
              el.removeAttribute(attr.name);
            }
          });
        });

        return bodyClone.innerHTML;
      });

      return cleanedHtml;
    } catch (error) {
      this.logger.warn(
        `Failed to extract cleaned HTML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, method: 'extractCleanedHtml', service: 'web-parser', params: { page } },
      );
      return '';
    }
  }

  /**
   * Extract DOM tree structure with hierarchy
   * Provides complete page structure for better React component generation
   */
  private async extractDOMTree(page: Page): Promise<DOMNode> {
    try {
      this.logger.log('Extracting DOM tree structure...');

      const domTree = await page.evaluate(() => {
        const buildTree = (element: Element, depth: number = 0): any => {
          if (depth > 30) return null; // Limit depth to avoid too deep trees

          const computedStyle = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          // Only include visible elements
          if (rect.width === 0 && rect.height === 0) return null;

          const node: any = {
            tag: element.tagName.toLowerCase(),
            id: element.id || undefined,
            classes:
              element.className && typeof element.className === 'string'
                ? element.className
                    .trim()
                    .split(/\s+/)
                    .filter((c) => c)
                : [],
            depth,
            children: [],
            boundingBox: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
          };

          // Extract key attributes
          const attributes: Record<string, string> = {};
          ['href', 'src', 'alt', 'title', 'type', 'placeholder', 'aria-label'].forEach((attr) => {
            const value = element.getAttribute(attr);
            if (value) attributes[attr] = value;
          });
          if (Object.keys(attributes).length > 0) {
            node.attributes = attributes;
          }

          // Extract key computed styles for layout
          const keyStyles: Record<string, string> = {};
          [
            'display',
            'position',
            'flexDirection',
            'gridTemplateColumns',
            'width',
            'height',
            'backgroundColor',
            'color',
            'fontSize',
            'fontWeight',
            'padding',
            'margin',
          ].forEach((prop) => {
            const value = computedStyle.getPropertyValue(prop);
            if (value && value !== 'none' && value !== 'normal' && value !== 'auto') {
              keyStyles[prop] = value;
            }
          });
          if (Object.keys(keyStyles).length > 0) {
            node.computedStyles = keyStyles;
          }

          // Extract text content (only direct text, not nested)
          const textContent = Array.from(element.childNodes)
            .filter((n: any) => n.nodeType === Node.TEXT_NODE)
            .map((n: any) => n.textContent?.trim())
            .filter((t) => t && t.length > 0)
            .join(' ');
          if (textContent) {
            node.text = textContent.substring(0, 200); // Limit text length
          }

          // Process children
          Array.from(element.children).forEach((child: Element) => {
            const childNode = buildTree(child, depth + 1);
            if (childNode) {
              node.children.push(childNode);
            }
          });

          return node;
        };

        return buildTree(document.body);
      });

      return domTree;
    } catch (error) {
      this.logger.warn(
        `Failed to extract DOM tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, mehtod: 'extractDOMTree', service: 'web-parser', params: { page } },
      );
      return { tag: 'body', classes: [], children: [], depth: 0 };
    }
  }

  /**
   * Count total nodes in DOM tree
   */
  private countDOMNodes(node: DOMNode): number {
    let count = 1;
    for (const child of node.children) {
      count += this.countDOMNodes(child);
    }
    return count;
  }

  /**
   * Extract CSS custom properties, SCSS/SASS variables from page and CSS files
   * Groups them by type: colors, spacing, typography, etc.
   */
  private async extractCSSVariables(
    page: Page,
    cssFiles: Array<{ url: string; content: string; filename: string }>,
  ): Promise<CSSVariables> {
    try {
      this.logger.log('Extracting CSS/SCSS/SASS variables...');

      const variables: CSSVariables = {
        customProperties: {},
        scssVariables: {},
        colors: {},
        spacing: {},
        typography: {},
        other: {},
      };

      // 1. Extract CSS custom properties from :root in browser
      const customProperties = await page.evaluate(() => {
        const props: Record<string, string> = {};

        // Get custom properties from :root
        const rootStyles = getComputedStyle(document.documentElement);

        // Get all custom property names
        for (let i = 0; i < rootStyles.length; i++) {
          const propName = rootStyles[i];
          if (propName.startsWith('--')) {
            const value = rootStyles.getPropertyValue(propName).trim();
            if (value) {
              props[propName] = value;
            }
          }
        }

        return props;
      });

      this.logger.log(
        `  Found ${Object.keys(customProperties).length} CSS custom properties in :root`,
      );
      variables.customProperties = customProperties;

      // 2. Extract variables from downloaded CSS files
      for (const cssFile of cssFiles) {
        const fileVariables = this.extractVariablesFromCSS(cssFile.content);

        // Merge custom properties
        Object.assign(variables.customProperties, fileVariables.customProperties);
        Object.assign(variables.scssVariables, fileVariables.scssVariables);

        this.logger.log(
          `  Extracted from ${cssFile.filename}: ${Object.keys(fileVariables.customProperties).length} CSS vars, ${Object.keys(fileVariables.scssVariables).length} SCSS vars`,
        );
      }

      // 3. Categorize variables by type
      variables.colors = this.categorizeVariables(
        variables.customProperties,
        variables.scssVariables,
        'color',
      );
      variables.spacing = this.categorizeVariables(
        variables.customProperties,
        variables.scssVariables,
        'spacing',
      );
      variables.typography = this.categorizeVariables(
        variables.customProperties,
        variables.scssVariables,
        'typography',
      );
      variables.other = this.categorizeVariables(
        variables.customProperties,
        variables.scssVariables,
        'other',
      );

      return variables;
    } catch (error) {
      this.logger.warn(
        `Failed to extract CSS variables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, method: 'extractCSSVariables', service: 'web-parser', params: { page, cssFiles } },
      );
      return {
        customProperties: {},
        scssVariables: {},
        colors: {},
        spacing: {},
        typography: {},
        other: {},
      };
    }
  }

  /**
   * Extract CSS custom properties and SCSS/SASS variables from CSS content
   */
  private extractVariablesFromCSS(cssContent: string): {
    customProperties: Record<string, string>;
    scssVariables: Record<string, string>;
  } {
    const customProperties: Record<string, string> = {};
    const scssVariables: Record<string, string> = {};

    // Extract CSS custom properties (--variable-name: value;)
    const cssVarRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = cssVarRegex.exec(cssContent)) !== null) {
      const varName = `--${match[1]}`;
      const value = match[2].trim();
      customProperties[varName] = value;
    }

    // Extract SCSS/SASS variables ($variable-name: value;)
    const scssVarRegex = /\$([\w-]+)\s*:\s*([^;]+);/g;
    while ((match = scssVarRegex.exec(cssContent)) !== null) {
      const varName = `$${match[1]}`;
      const value = match[2].trim();
      scssVariables[varName] = value;
    }

    return { customProperties, scssVariables };
  }

  /**
   * Categorize variables by type (color, spacing, typography, other)
   */
  private categorizeVariables(
    customProperties: Record<string, string>,
    scssVariables: Record<string, string>,
    category: 'color' | 'spacing' | 'typography' | 'other',
  ): Record<string, string> {
    const categorized: Record<string, string> = {};

    const allVariables = {
      ...customProperties,
      ...scssVariables,
    };

    for (const [name, value] of Object.entries(allVariables)) {
      const lowerName = name.toLowerCase();
      const lowerValue = value.toLowerCase();

      if (category === 'color') {
        // Color keywords
        if (
          lowerName.includes('color') ||
          lowerName.includes('bg') ||
          lowerName.includes('background') ||
          lowerName.includes('border') ||
          lowerName.includes('text') ||
          lowerName.includes('primary') ||
          lowerName.includes('secondary') ||
          lowerName.includes('accent') ||
          lowerName.includes('success') ||
          lowerName.includes('error') ||
          lowerName.includes('warning') ||
          lowerName.includes('info')
        ) {
          // Check if value is a color
          if (
            lowerValue.startsWith('#') ||
            lowerValue.startsWith('rgb') ||
            lowerValue.startsWith('hsl') ||
            /^[a-z]+$/.test(lowerValue) // color names
          ) {
            categorized[name] = value;
          }
        }
      } else if (category === 'spacing') {
        // Spacing keywords
        if (
          lowerName.includes('spacing') ||
          lowerName.includes('space') ||
          lowerName.includes('margin') ||
          lowerName.includes('padding') ||
          lowerName.includes('gap') ||
          lowerName.includes('gutter') ||
          lowerName.includes('size')
        ) {
          // Check if value is a size
          if (
            lowerValue.includes('px') ||
            lowerValue.includes('rem') ||
            lowerValue.includes('em') ||
            lowerValue.includes('%') ||
            lowerValue.includes('vh') ||
            lowerValue.includes('vw')
          ) {
            categorized[name] = value;
          }
        }
      } else if (category === 'typography') {
        // Typography keywords
        if (
          lowerName.includes('font') ||
          lowerName.includes('text') ||
          lowerName.includes('heading') ||
          lowerName.includes('title') ||
          lowerName.includes('body') ||
          lowerName.includes('line-height') ||
          lowerName.includes('letter-spacing')
        ) {
          categorized[name] = value;
        }
      } else if (category === 'other') {
        // Everything else not categorized
        const isColor =
          Object.keys(this.categorizeVariables({ [name]: value }, {}, 'color')).length > 0;
        const isSpacing =
          Object.keys(this.categorizeVariables({ [name]: value }, {}, 'spacing')).length > 0;
        const isTypography =
          Object.keys(this.categorizeVariables({ [name]: value }, {}, 'typography')).length > 0;

        if (!isColor && !isSpacing && !isTypography) {
          categorized[name] = value;
        }
      }
    }

    return categorized;
  }

  /**
   * Extract layout information (flex, grid containers, etc.)
   */
  private async extractLayoutInfo(page: Page): Promise<{
    containers: Array<{
      selector: string;
      type: 'flex' | 'grid' | 'block';
      properties: Record<string, string>;
    }>;
    breakpoints: string[];
  }> {
    try {
      this.logger.log('Extracting layout information...');

      const layoutInfo = await page.evaluate(() => {
        const containers: Array<{
          selector: string;
          type: 'flex' | 'grid' | 'block';
          properties: Record<string, string>;
        }> = [];
        const breakpoints: string[] = [];

        // Find all layout containers
        const allElements = document.querySelectorAll('*');
        const processedSelectors = new Set<string>();

        Array.from(allElements).forEach((element, index) => {
          const computedStyle = window.getComputedStyle(element);
          const display = computedStyle.display;

          // Skip if not a layout container
          if (!['flex', 'grid', 'inline-flex', 'inline-grid'].includes(display)) return;

          // Generate selector
          let selector = element.tagName.toLowerCase();
          if (element.id) {
            selector = `#${element.id}`;
          } else if (element.className && typeof element.className === 'string') {
            const classes = element.className
              .trim()
              .split(/\s+/)
              .filter((c) => c);
            if (classes.length > 0) {
              selector = `.${classes[0]}`; // Use first class
            }
          }

          // Add index to ensure uniqueness
          selector = `${selector}-${index}`;

          if (processedSelectors.has(selector)) return;
          processedSelectors.add(selector);

          const type = display.includes('flex') ? 'flex' : 'grid';
          const properties: Record<string, string> = {};

          if (type === 'flex') {
            ['flexDirection', 'justifyContent', 'alignItems', 'flexWrap', 'gap'].forEach((prop) => {
              const value = computedStyle.getPropertyValue(prop);
              if (value && value !== 'normal') properties[prop] = value;
            });
          } else if (type === 'grid') {
            ['gridTemplateColumns', 'gridTemplateRows', 'gap', 'gridAutoFlow'].forEach((prop) => {
              const value = computedStyle.getPropertyValue(prop);
              if (value && value !== 'none') properties[prop] = value;
            });
          }

          if (Object.keys(properties).length > 0) {
            containers.push({ selector, type, properties });
          }
        });

        // Extract media query breakpoints from stylesheets
        try {
          Array.from(document.styleSheets).forEach((sheet) => {
            try {
              Array.from(sheet.cssRules || []).forEach((rule) => {
                if (rule instanceof CSSMediaRule) {
                  breakpoints.push(rule.conditionText || rule.media.mediaText);
                }
              });
            } catch (e) {
              // Cross-origin stylesheet, skip
            }
          });
        } catch (e) {
          // Error accessing stylesheets
        }

        return {
          containers: containers.slice(0, 50), // Limit to 50 containers
          breakpoints: [...new Set(breakpoints)].slice(0, 10), // Unique, limit to 10
        };
      });

      this.logger.log(
        `Found ${layoutInfo.containers.length} layout containers, ${layoutInfo.breakpoints.length} breakpoints`,
      );
      return layoutInfo;
    } catch (error) {
      this.logger.warn(
        `Failed to extract layout info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, method: 'extractLayoutInfo', service: 'web-parser', params: { page } },
      );
      return { containers: [], breakpoints: [] };
    }
  }

  private async fetchWithBrowser(url: string): Promise<string> {
    let browser: Browser | null = null;

    try {
      this.logger.log(`Launching Puppeteer browser for: ${url}`);

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      const page: Page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for additional content to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get the HTML content
      const html = await page.content();

      this.logger.log(`Puppeteer fetched HTML: ${html.length} characters`);

      return html;
    } catch (error) {
      this.logger.error(
        `Puppeteer error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error, method: 'fetchWithBrowser', service: 'web-parser', params: { url } },
      );
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
