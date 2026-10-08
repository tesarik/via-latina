/** Word class: noun, verb, adjective, everything else. */
export type Pos = "n" | "v" | "a" | "o";

export interface Word {
  la: string;
  /** Grammar note shown under the headword (genitive + gender, principal parts, …). */
  info: string;
  cz: string;
  pos: Pos;
}

export type Category = "all" | Pos;
export type Direction = "la" | "cz";

export interface Settings {
  category: Category;
  direction: Direction;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  all: "Vše",
  n: "Podstatná jména",
  v: "Slovesa",
  a: "Přídavná jména",
  o: "Ostatní",
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  la: "latina → čeština",
  cz: "čeština → latina",
};
