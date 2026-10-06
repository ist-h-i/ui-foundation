export function sheetStages(stages: readonly number[], index: number): number {
    if (!stages.length || stages.some((value, position) => !Number.isFinite(value) || value <= 0 || value > 1 || position > 0 && value <= stages[position - 1]!))
        throw new Error('BottomSheet stages must be positive strictly ascending ratios no greater than 1.');
    if (!Number.isInteger(index) || index < 0 || index >= stages.length)
        throw new Error('BottomSheet stage must be an existing index.');
    return stages[index]!;
}
export function popupDelay(milliseconds: number): number {
    if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 2 ** 31 - 1)
        throw new Error('Popup delays must be finite nonnegative milliseconds within the native timer range.');
    return milliseconds;
}
export function panelSize(pixels: number | null): number | null {
    if (pixels !== null && (!Number.isFinite(pixels) || pixels <= 0))
        throw new Error('Panel pixel sizes must be positive finite numbers or null for semantic defaults.');
    return pixels;
}
