/** Visual emphasis and operation tone are independent of authorization and I/O. */
export type ActionVariant = 'primary' | 'secondary' | 'danger';
export type ActionEmphasis = 'primary' | 'secondary' | 'tertiary';
export type ActionTone = 'normal' | 'danger';

export interface ActionAppearance {
  emphasis: ActionEmphasis;
  tone: ActionTone;
  toneConflict: boolean;
}

/** Retain the old danger signal even when a conflicting normal tone is supplied. */
export function resolveActionAppearance(
  variant: ActionVariant, emphasis: ActionEmphasis | null = null, tone: ActionTone | null = null,
): ActionAppearance {
  if (emphasis !== null && emphasis !== 'primary' && emphasis !== 'secondary' && emphasis !== 'tertiary')
    throw new Error('Invalid action emphasis');
  if (tone !== null && tone !== 'normal' && tone !== 'danger')
    throw new Error('Invalid action tone');
  return {
    emphasis: emphasis ?? (variant === 'primary' || variant === 'danger' ? 'primary' : 'secondary'),
    tone: variant === 'danger' ? 'danger' : tone ?? 'normal',
    toneConflict: variant === 'danger' && tone === 'normal',
  };
}
