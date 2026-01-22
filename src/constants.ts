export const VIEW_TYPE_CALENDAR = "photo-calendar";
export const RIBBON_ICON = "calendar-with-checkmark";

export type IWeekStartOption = "locale" | "sunday" | "monday";

export interface ISettings {
  weekStart: IWeekStartOption;
  shouldConfirmBeforeCreate: boolean;
  showWeeklyNote: boolean;
  photoFieldNames: string[];
  showPhotos: boolean;
  photoFillMode: "cover" | "contain";
  wordsPerDot: number;
  showWeekNums: boolean;
  noteBackgroundColor: string;
}

export const DEFAULT_SETTINGS: ISettings = {
  weekStart: "locale",
  shouldConfirmBeforeCreate: true,
  showWeeklyNote: false,
  photoFieldNames: ["image", "cover", "banner"],
  showPhotos: true,
  photoFillMode: "cover",
  wordsPerDot: 250,
  showWeekNums: false,
  noteBackgroundColor: "#E2DCED"
};
