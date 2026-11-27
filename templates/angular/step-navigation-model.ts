/** The consuming app owns step status and transition approval. */
export type StepNavigationStatus = 'not-started' | 'in-progress' | 'complete' | 'error' | 'skipped';
export interface StepNavigationItem {
  id: string;
  label: string;
  status: StepNavigationStatus;
  /** Localized status, supplied by the app; never inferred from its color. */
  statusLabel: string;
  navigable?: boolean;
  disabled?: boolean;
}
const statuses: readonly StepNavigationStatus[] = ['not-started', 'in-progress', 'complete', 'error', 'skipped'];

export function validateStepNavigation(items: readonly StepNavigationItem[], currentId: string | null): readonly StepNavigationItem[] {
  if (!Array.isArray(items)) throw new Error('Steps must be an array');
  const ids = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('Step IDs must be nonempty and unique');
    if (typeof item.label !== 'string' || !item.label.trim() || typeof item.statusLabel !== 'string' || !item.statusLabel.trim())
      throw new Error('Steps require a label and status label');
    if ((item.navigable !== undefined && typeof item.navigable !== 'boolean')
      || (item.disabled !== undefined && typeof item.disabled !== 'boolean')) throw new Error('Step availability must be boolean');
    if (!statuses.includes(item.status)) throw new Error('Unknown step status');
    ids.add(item.id);
  }
  if (currentId !== null && !ids.has(currentId)) throw new Error('Current step must identify an item');
  return items;
}
export function canRequestStep(item: StepNavigationItem, currentId: string | null, busy: boolean): boolean {
  return item.navigable === true && item.disabled !== true && item.id !== currentId && !busy;
}
