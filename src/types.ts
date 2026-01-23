export interface Moment {
  clone(): Moment;
  date(): number;
  format(formatStr?: string): string;
  isSame(other: Moment, unit?: string): boolean;
  isValid(): boolean;
  locale(): string;
  localeData(): { monthsShort(): string[] };
  month(): number;
  startOf(unit: string): Moment;
  weekday(): number;
  year(): number;
}

export type MomentFactory = (input?: string, format?: string, strict?: boolean) => Moment;
export type MomentStatic = MomentFactory & { monthsShort(): string[] };
