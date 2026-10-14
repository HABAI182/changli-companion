export function validFullscreenExceptions(items: string[], macos: boolean): boolean {
  if (items.length > 32) return false;
  return items.every((name) =>
    macos
      ? /^[^\\/:*?"<>|]{1,116}\.app$/i.test(name) ||
        (/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/i.test(name) && name.length <= 120)
      : /^[^\\/:*?"<>|]{1,120}\.exe$/i.test(name),
  );
}
