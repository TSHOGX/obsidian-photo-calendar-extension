import { App, TFile } from "obsidian";
import type { ISettings } from "./constants";

export class PhotoService {
  private app: App;
  private settings: ISettings;
  private cache: Map<string, string | null> = new Map();

  constructor(app: App, settings: ISettings) {
    this.app = app;
    this.settings = settings;
  }

  updateSettings(settings: ISettings): void {
    this.settings = settings;
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(path: string): void {
    this.cache.delete(path);
  }

  getPhotoForDate(date: string): Promise<string | null> {
    if (this.cache.has(date)) {
      return Promise.resolve(this.cache.get(date) || null);
    }

    const file = this.app.vault.getAbstractFileByPath(date);
    if (!(file instanceof TFile)) {
      this.cache.set(date, null);
      return Promise.resolve(null);
    }

    return Promise.resolve().then(() => {
      const photo = this.extractPhotoFromFile(file);
      this.cache.set(date, photo);
      return photo;
    });
  }

  private extractPhotoFromFile(file: TFile): string | null {
    const metadata = this.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter) {
      return null;
    }

    for (const fieldName of this.settings.photoFieldNames) {
      const frontmatter = metadata.frontmatter as Record<string, unknown>;
      const value = frontmatter[fieldName];
      if (typeof value === "string" && value.trim().length > 0) {
        return this.resolveImagePath(value, file);
      }
      if (Array.isArray(value) && typeof value[0] === "string") {
        return this.resolveImagePath(value[0], file);
      }
    }

    return null;
  }

  private resolveImagePath(value: string, sourceFile: TFile): string {
    // Handle wikilinks [[image.jpg]]
    const wikiLinkMatch = value.match(/\[\[([^\]]+)\]\]/);
    if (wikiLinkMatch) {
      const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
        wikiLinkMatch[1],
        sourceFile.path
      );
      if (linkedFile) {
        return this.app.vault.getResourcePath(linkedFile);
      }
    }

    // Handle URLs
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }

    // Handle relative paths
    const file = this.app.vault.getAbstractFileByPath(value);
    if (file instanceof TFile) {
      return this.app.vault.getResourcePath(file);
    }

    return value;
  }
}
