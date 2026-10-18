// The local canvas capture probe observed one RGB level of conversion in
// Chromium's presented video. Restrict this allowance to video markers;
// still-image and background colors continue to require exact RGB values.
export function videoMarkerColorMatches(actual:readonly number[],expected:readonly number[]):boolean {
 return actual.length===3&&expected.length===3&&actual.every((channel,index)=>Number.isInteger(channel)&&channel>=0&&channel<=255&&Math.abs(channel-expected[index])<=1);
}
