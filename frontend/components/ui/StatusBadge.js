/**
 * Status badge pill
 * @param {{ status: string; label?: string }} props
 */
export default function StatusBadge({ status, label }) {
  const normalized = status?.toLowerCase().replace(/\s+/g, "-");
  const display = label || status;
  return (
    <span className={`status-badge ${normalized}`}>
      {display}
    </span>
  );
}
