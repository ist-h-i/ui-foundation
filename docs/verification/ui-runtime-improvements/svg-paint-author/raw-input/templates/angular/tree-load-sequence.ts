/** Request identity spans widget instances; a reply to a destroyed widget cannot match a new one. */
let requestSequence = 0;
export function nextTreeRequestId(): number { return ++requestSequence; }
