export interface ImportOccurrence { startsAt: string; endsAt: string | null }

export interface ImportEvent {
  legacyId: string;
  legacyUrl: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  featured: boolean;
  accessType: "free" | "check";
  placeSlug: string | null;
  customPlaceName: string | null;
  customAddress: string | null;
  image: string | null;
  categorySlugs: string[];
  occurrences: ImportOccurrence[];
}

export interface ImportPlan {
  events: ImportEvent[];
  categories: { slug: string; name: string }[];
  warnings: string[];
}

export interface EventOnInstance {
  ID: number | string;
  unix_start: number;
  unix_end: number;
  /** Segundos al oeste de UTC con que EventON calculó unix_start (10800 en Argentina). */
  timezone_offset?: number;
  event_pmv?: Record<string, string[]>;
}

export interface WpEvent {
  id: number;
  slug: string;
  link: string;
  title?: { rendered: string };
  content?: { rendered: string };
  event_type?: number[];
  event_type_2?: number[];
  event_type_3?: number[];
}

export declare const PLACE_ALIASES: Record<string, string>;
export declare function decodeEntities(text: string | null | undefined): string;
export declare function htmlToParagraphs(html: string | null | undefined): string[];
export declare function summaryFrom(input: { subtitle?: string | null; metaDescription?: string | null; paragraphs: string[] }): string | null;
export declare function accessTypeFrom(texts: (string | null | undefined)[]): "free" | "check";
export declare function normalizeName(name: string | null | undefined): string;
export declare function categoryName(name: string): string;
export declare function cardDetails(html: string): Map<string, { placeName: string | null; address: string | null; image: string | null }>;
export declare function occurrencesFrom(instances: EventOnInstance[], hideEndTime: boolean): ImportOccurrence[];
export declare function buildPlan(input: {
  wpEvents: WpEvent[];
  instances: EventOnInstance[];
  cardsHtml: string;
  terms: { id: number; slug: string; name: string }[];
  places: { slug: string; name: string }[];
}): ImportPlan;
export declare function summarize(plan: ImportPlan, now?: Date): {
  events: number;
  withPendingDates: number;
  occurrences: number;
  free: number;
  linkedPlaces: Record<string, number>;
  customPlaces: Record<string, number>;
  categories: number;
  images: number;
  warnings: string[];
};
