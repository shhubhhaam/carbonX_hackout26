/**
 * Empty / no-data state
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        gap: 12,
        color: "var(--muted)",
        textAlign: "center",
      }}
    >
      {Icon && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "var(--green-soft)",
            color: "var(--green)",
            display: "grid",
            placeItems: "center",
            marginBottom: 4,
          }}
        >
          <Icon size={22} strokeWidth={1.5} />
        </div>
      )}
      <strong style={{ color: "var(--text)", fontSize: 13 }}>{title}</strong>
      {description && <p style={{ fontSize: 11, margin: 0, maxWidth: 320 }}>{description}</p>}
      {action}
    </div>
  );
}
