import type { Moment } from "moment";
import type { ICalendarSource, IDayMetadata } from "obsidian-calendar-ui";
import { getDailyNote, getAllDailyNotes } from "obsidian-daily-notes-interface";
import { getWeeklyNote, getAllWeeklyNotes } from "./weeklyNotes";
import type PhotoCalendarPlugin from "./main";

export function createPhotoSource(plugin: PhotoCalendarPlugin): ICalendarSource {
  return {
    getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
      const dailyNotes = getAllDailyNotes();
      const file = getDailyNote(date, dailyNotes);

      const classes: string[] = [];

      if (file) {
        classes.push("has-note");
        const photo = await plugin.photoService.getPhotoForDate(file.path);
        if (photo) {
          classes.push("has-photo");
        }
      }

      return { classes, dots: [] };
    },

    getWeeklyMetadata: async (date: Moment): Promise<IDayMetadata> => {
      const weeklyNotes = getAllWeeklyNotes(plugin.app);
      const weeklyNote = getWeeklyNote(date, weeklyNotes);

      const classes: string[] = [];

      if (weeklyNote) {
        classes.push("has-note");
        const photo = await plugin.photoService.getPhotoForDate(weeklyNote.path);
        if (photo) {
          classes.push("has-photo");
        }
      }

      return { classes, dots: [] };
    },
  };
}
