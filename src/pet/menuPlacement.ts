export function menuPlacement(
  pet: { left: number; top: number; right: number; bottom: number },
  screen: { width: number; height: number },
  width = 260,
  height = 468,
) {
  const gap = 12,
    margin = 8;
  let left = pet.right + gap,
    top = pet.top;
  if (left + width > screen.width - margin) {
    if (pet.left - gap - width >= margin) left = pet.left - gap - width;
    else if (pet.top - gap - height >= margin) {
      left = pet.left;
      top = pet.top - gap - height;
    } else {
      left = pet.left;
      top = pet.bottom + gap;
    }
  }
  return {
    left: Math.max(margin, Math.min(left, screen.width - width - margin)),
    top: Math.max(margin, Math.min(top, screen.height - height - margin)),
    maxHeight: screen.height - margin * 2,
  };
}
