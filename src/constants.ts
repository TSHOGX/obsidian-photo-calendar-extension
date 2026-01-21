export const VIEW_TYPE_CALENDAR = "photo-calendar";
export const RIBBON_ICON = "calendar-with-checkmark";

export type IWeekStartOption = "locale" | "sunday" | "monday";

export interface ISettings {
  weekStart: IWeekStartOption;
  shouldConfirmBeforeCreate: boolean;
  showWeeklyNote: boolean;
  photoFieldNames: string[];
  showPhotos: boolean;
  photoSize: "small" | "medium" | "large";
  wordsPerDot: number;
  showWeekNums: boolean;
}

export const DEFAULT_SETTINGS: ISettings = {
  weekStart: "locale",
  shouldConfirmBeforeCreate: true,
  showWeeklyNote: false,
  photoFieldNames: ["image", "cover", "banner"],
  showPhotos: true,
  photoSize: "medium",
  wordsPerDot: 250,
  showWeekNums: false
};
