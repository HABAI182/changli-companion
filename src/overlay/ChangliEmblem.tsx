// A small original feather/flower motif echoing Changli's gold ornaments.
// SVG keeps the silhouette clear at desktop-pet sizes without a font glyph.
export function ChangliEmblem() {
  return (
    <svg className="changli-emblem" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 11C7 10 4 6 5 2c4 1 7 4 7 9Zm1 0c1-5 4-8 8-8-1 4-3 7-8 8Zm0 2c5 0 8 3 9 7-4 0-8-2-9-7Zm-2 0c0 5-3 8-7 9 0-4 2-8 7-9Z"
        fill="currentColor"
      />
      <path d="m12 9 3 3-3 3-3-3Z" fill="currentColor" />
      <path
        d="M12 14c0 4 2 7 5 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
