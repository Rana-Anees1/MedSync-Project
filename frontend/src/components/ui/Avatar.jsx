import { initials } from '../../utils/format';

export default function Avatar({ name, size = 36, tone = 'brand' }) {
  return (
    <span className={`avatar avatar--${tone}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials(name)}
    </span>
  );
}
