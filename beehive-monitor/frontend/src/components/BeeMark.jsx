// Final bee mark — hexagon badge, simplified worker (reads at any size).
// Full-detail worker lives in ui-mockups/f-bee.html for print/large use.
export default function BeeMark({ size = 32, dark = false }) {
  const badge = dark ? "#e8c96a" : "#2e4b3c";
  const body = dark ? "#20241f" : "#f7f2e2";
  const head = dark ? "#f7f2e2" : "#20241f";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <polygon points="12,2 36,2 46,24 36,46 12,46 2,24" fill={badge} />
      <ellipse cx="24" cy="32" rx="6.6" ry="9" fill={body} />
      <circle cx="24" cy="19" r="5.4" fill={head} />
    </svg>
  );
}
