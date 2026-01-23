import { App, TFile, normalizePath, moment } from "obsidian";
import type { Moment, MomentStatic } from "./types";

export interface IWeeklyNoteSettings {
  folder?: string;
  format?: string;
  template?: string;
}

const momentApi = moment as unknown as MomentStatic;

type PeriodicNotesPlugin = {
  settings?: {
    weekly?: IWeeklyNoteSettings;
  };
};

type PluginRegistry = {
  plugins?: Record<string, PeriodicNotesPlugin>;
};

export function getWeeklyNoteSettings(app: App): IWeeklyNoteSettings {
  try {
    // Try to get settings from Periodic Notes plugin
    const periodicNotes = (app as App & { plugins?: PluginRegistry }).plugins?.plugins?.[
      "periodic-notes"
    ];
    if (periodicNotes?.settings?.weekly) {
      return periodicNotes.settings.weekly;
    }
  } catch {
    // Ignore errors
  }

  // Default settings
  return {
    folder: "",
    format: "GGGG-[W]ww",
  };
}

export function getWeeklyNote(
  date: Moment,
  weeklyNotes: Record<string, TFile>,
  app: App
): TFile | null {
  const settings = getWeeklyNoteSettings(app);
  const format = settings.format || "GGGG-[W]ww";
  const filename = date.format(format);
  return weeklyNotes[filename] || null;
}

export function getAllWeeklyNotes(app: App): Record<string, TFile> {
  const settings = getWeeklyNoteSettings(app);
  const folder = settings.folder || "";
  const format = settings.format || "GGGG-[W]ww";

  const weeklyNotes: Record<string, TFile> = {};
  const files = app.vault.getMarkdownFiles();

  for (const file of files) {
    if (folder && !file.path.startsWith(folder)) {
      continue;
    }

    const basename = file.basename;
    const date = momentApi(basename, format, true);

    if (date.isValid()) {
      weeklyNotes[basename] = file;
    }
  }

  return weeklyNotes;
}

export async function createWeeklyNote(app: App, date: Moment): Promise<TFile> {
  const settings = getWeeklyNoteSettings(app);
  const format = settings.format || "GGGG-[W]ww";
  const folder = settings.folder || "";
  const template = settings.template || "";

  const filename = date.format(format);
  const normalizedPath = normalizePath(folder ? `${folder}/${filename}.md` : `${filename}.md`);

  // Ensure folder exists
  if (folder) {
    const folderPath = normalizePath(folder);
    if (!app.vault.getAbstractFileByPath(folderPath)) {
      await app.vault.createFolder(folderPath);
    }
  }

  // Get template content
  let content = "";
  if (template) {
    const templateFile = app.vault.getAbstractFileByPath(normalizePath(template));
    if (templateFile instanceof TFile) {
      content = await app.vault.read(templateFile);
    }
  }

  return await app.vault.create(normalizedPath, content);
}
