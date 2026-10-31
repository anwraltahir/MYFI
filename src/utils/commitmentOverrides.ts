import { Commitment, Occurrence } from '../types';

export type CommitmentOverrideFields = NonNullable<Occurrence['overrides']>;

export const OVERRIDABLE_COMMITMENT_FIELDS: (keyof CommitmentOverrideFields)[] = [
  'title',
  'amount',
  'currency',
  'dueDay',
  'category',
  'icon',
  'notes',
];

// Merges a commitment's recurring template with the per-month edits stored on
// its occurrence, so an edit made while viewing one month never changes how
// the same commitment reads in any other month.
export function getEffectiveCommitment(commitment: Commitment, occurrence?: Occurrence): Commitment {
  const amount = occurrence?.overrides?.amount ?? occurrence?.customAmount ?? commitment.amount;
  if (!occurrence?.overrides) {
    return amount === commitment.amount ? commitment : { ...commitment, amount };
  }
  return { ...commitment, ...occurrence.overrides, amount };
}
