/**
 * Score bar showing a value out of 100
 * @param {{ value: number; max?: number; color?: string; size?: 'sm'|'md' }} props
 */
export default function ScoreBar({ value, max = 100, color = "var(--green)", size = "md" }) {
  const pct = Math.min(100, (value / max) * 100);
  const height = size === "sm" ? 4 : 6;
  return (
    <div
      style={{
        width: "100%",
        height,
        background: "#e8ebe5",
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}
