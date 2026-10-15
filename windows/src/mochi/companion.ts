/** The fork has one companion. Old profile values migrate on read. */
export type Companion = "morbido";
export const parseCompanion = (_value: unknown): Companion => "morbido";
export const setCompanion = (_value: unknown): void => {};
export const getCompanion = (): Companion => "morbido";
