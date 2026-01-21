import type { Moment } from "moment";
import type { TFile } from "obsidian";
import type { ICalendarSource, IDayMetadata } from "obsidian-calendar-ui";
import { getDailyNote, getAllDailyNotes } from "obsidian-daily-notes-interface";
import { getWeeklyNote, getAllWeeklyNotes } from "./weeklyNotes";
import type PhotoCalendarPlugin from "./main";

const NUM_MAX_DOTS = 5;

async function getWordCount(file: TFile, plugin: PhotoCalendarPlugin): Promise<number> {
  const content = await plugin.app.vault.cachedRead(file);
  const words = content.trim().split(/\s+/).filter(w => w.length > 0);
  return words.length;
}

async function getDotsForNote(file: TFile | null, plugin: PhotoCalendarPlugin): Promise<Array<{ className: string; color: string; isFilled: boolean }>> {
  if (!file) return [];

  const { wordsPerDot } = plugin.settings;
  if (wordsPerDot <= 0) return [];

  const wordCount = await getWordCount(file, plugin);
  const numDots = Math.floor(wordCount / wordsPerDot);
  const clampedDots = Math.max(1, Math.min(numDots, NUM_MAX_DOTS));

  const dots = [];
  for (let i = 0; i < clampedDots; i++) {
    dots.push({ className: "", color: "default", isFilled: true });
  }
  return dots;
}

export function createWordCountSource(plugin: PhotoCalendarPlugin): ICalendarSource {
  return {
    getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
      const dailyNotes = getAllDailyNotes();
      const file = getDailyNote(date, dailyNotes);

      const classes: string[] = [];
      if (file) {
        classes.push("has-note");
      }

      // In image mode, don't show dots if there's a photo
      let dots: Array<{ className: string; color: string; isFilled: boolean }> = [];
      if (file && plugin.settings.showPhotos) {
        const photo = await plugin.photoService.getPhotoForDate(file.path);
        if (!photo) {
          dots = await getDotsForNote(file, plugin);
        }
      } else if (file) {
        dots = await getDotsForNote(file, plugin);
      }

      return { classes, dots };
    },

    getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => {
      const weeklyNotes = getAllWeeklyNotes(plugin.app);
      const weeklyNote = getWeeklyNote(date, weeklyNotes);

      const classes: string[] = [];
      if (weeklyNote) {
        classes.push("has-note");
      }

      let dots: Array<{ className: string; color: string; isFilled: boolean }> = [];
      if (weeklyNote && plugin.settings.showPhotos) {
        const photo = await plugin.photoService.getPhotoForDate(weeklyNote.path);
        if (!photo) {
          dots = await getDotsForNote(weeklyNote, plugin);
        }
      } else if (weeklyNote) {
        dots = await getDotsForNote(weeklyNote, plugin);
      }

      return { classes, dots };
    },
  };
}
