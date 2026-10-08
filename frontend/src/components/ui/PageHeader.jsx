export default function PageHeader({ title, children, actions, back }) {
  return (
    <div className="page-head">
      <div className="page-head__text">
        {back}
        <h1>{title}</h1>
        {children && <p className="page-head__sub">{children}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}
