"use client";

/**
 * Tab navigation
 * @param {{ tabs: string[]; active: string; onChange: (tab: string) => void }} props
 */
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tab-nav">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`tab-item${active === tab ? " active" : ""}`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
