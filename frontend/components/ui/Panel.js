import { ChevronDown } from "lucide-react";

/**
 * Section panel card wrapper
 */
export function Panel({ children, className = "", style }) {
  return (
    <div className={`panel ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * Section header with eyebrow + title + optional action
 */
export function SectionHeader({ eyebrow, title, action, onAction }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 15, letterSpacing: "-0.3px", margin: "5px 0 0" }}>
          {title}
        </h2>
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ChevronDown size={14} />
        </button>
      )}
    </div>
  );
}
