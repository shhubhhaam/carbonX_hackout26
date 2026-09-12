/**
 * Page hero header
 * @param {{ eyebrow?: string; title: string; subtitle?: string; actions?: React.ReactNode }} props
 */
export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <section className="hero">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="hero-actions">{actions}</div>}
    </section>
  );
}
