export const LEGAL_REACCEPT_REQUIRED = 'LEGAL_REACCEPT_REQUIRED';
export const AGE_CONFIRM_REQUIRED = 'AGE_CONFIRM_REQUIRED';

export type LegalType = 'terms' | 'privacy';

export const LEGAL_TYPES = ['terms', 'privacy'] as const;

export function toLegalDocumentType(type: string): 'TERMS' | 'PRIVACY' {
  const t = type?.toLowerCase();
  if (t === 'terms') return 'TERMS';
  if (t === 'privacy') return 'PRIVACY';
  throw new Error(`Invalid legal type: ${type}`);
}
