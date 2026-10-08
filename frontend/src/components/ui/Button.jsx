export default function Button({ variant = 'primary', size, icon: Icon, children, className = '', type = 'button', ...rest }) {
  return (
    <button type={type} className={`btn btn--${variant}${size ? ` btn--${size}` : ''} ${className}`} {...rest}>
      {Icon && <Icon size={size === 'sm' ? 15 : 17} aria-hidden />}
      {children && <span>{children}</span>}
    </button>
  );
}
