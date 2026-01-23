declare module "moment" {
  export interface Locale {
    monthsShort(): string[];
  }

  export interface LocaleData {
    monthsShort(): string[];
  }

  export interface Moment {
    clone(): Moment;
    date(): number;
    format(formatStr?: string): string;
    isSame(other: Moment, unit?: string): boolean;
    isValid(): boolean;
    locale(): string;
    localeData(): LocaleData;
    month(): number;
    startOf(unit: string): Moment;
    weekday(): number;
    year(): number;
  }
  export interface MomentStatic {
    (input?: string, format?: string, strict?: boolean): Moment;
    monthsShort(): string[];
  }

  const moment: MomentStatic;
  export default moment;
}
