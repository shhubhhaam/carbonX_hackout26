import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * @param {{
 *   label: string;
 *   value: string|number;
 *   unit?: string;
 *   change?: string;
 *   direction?: 'up'|'down'|'neutral';
 *   trend?: 'up'|'down'|'neutral';
 *   icon: React.ElementType;
 *   note?: string;
 *   accent?: string;
 * }} props
 */
export default function MetricCard({ label, value, unit, change, direction, trend, icon: Icon, note, accent }) {
  const dir = direction || trend || "neutral";
  const trendClass = dir === "up" ? "trend-up" : dir === "down" ? "trend-down" : "trend-neutral";

  return (
    <div className="metric-card">
      <div className="metric-top">
        <div className="metric-icon" style={accent ? { background: accent + "18", color: accent } : {}}>
          <Icon size={17} strokeWidth={1.8} />
        </div>
        {change && (
          <span className={`trend ${trendClass}`}>
            {dir === "up" ? <ArrowUpRight size={13} /> : dir === "down" ? <ArrowDownRight size={13} /> : null}
            {change}
          </span>
        )}
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {unit && <span>{unit}</span>}
      </div>
      {note && <div className="metric-note">{note}</div>}
    </div>
  );
}
