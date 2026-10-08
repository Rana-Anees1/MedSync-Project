/** Page header with a supporting photograph (used on role dashboards and key pages). */
export default function HeroBanner({ image, title, children, actions }) {
  return (
    <div className="hero-banner">
      {image && <img src={image} alt="" />}
      <div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions}
    </div>
  );
}
