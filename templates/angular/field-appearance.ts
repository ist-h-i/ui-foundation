/** Layout intent only; these options never constrain the actual field value. */
export type FieldHintPosition = 'before' | 'after';

export function fieldHintPosition(value: unknown): FieldHintPosition {
  if (value !== 'before' && value !== 'after') throw new Error('FormField hintPosition must be before or after');
  return value;
}

export function fieldCharacterWidth(value: number | null): number | null {
  if (value !== null && (!Number.isSafeInteger(value) || value < 1))
    throw new Error('FormField controlCharacters must be a positive safe integer or null');
  return value;
}
