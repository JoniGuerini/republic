/** Top-level pages reachable from the footer navbar. */
export type Page = 'trilha' | 'aprimoramentos' | 'compendio';

export interface PageDef {
  id: Page;
  /** Short display label shown in the footer navbar. */
  label: string;
  /** Optional eyebrow (above the label) — kept null for now; could host
   *  badges later (e.g. "3 novos" on aprimoramentos). */
  eyebrow?: string;
}

export const PAGES: readonly PageDef[] = [
  { id: 'trilha', label: 'Trilha' },
  { id: 'aprimoramentos', label: 'Aprimoramentos' },
  { id: 'compendio', label: 'Compêndio' },
];
