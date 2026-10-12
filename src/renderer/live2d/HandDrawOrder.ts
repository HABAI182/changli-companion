export interface HandDrawOrder { ids: string[]; after: string; alsoAfter?: string[] }

// Move only the opted-in hands in front of the torso. Preserve the relative
// order of every other drawable, including face/hair and clipping masks.
export function handDrawOrder(ids: readonly string[], orders: ArrayLike<number>, rig?: HandDrawOrder) {
  const sorted = ids.map((_, index) => index).sort((a, b) => orders[a] - orders[b]);
  if (!rig || !ids.includes(rig.after)) return sorted;
  const hands = sorted.filter(i => rig.ids.includes(ids[i]));
  const rest = sorted.filter(i => !rig.ids.includes(ids[i]));
  const anchors = [rig.after, ...(rig.alsoAfter || [])];
  const lastAnchor = Math.max(...anchors.map(id => rest.findIndex(i => ids[i] === id)));
  rest.splice(lastAnchor + 1, 0, ...hands);
  return rest;
}
