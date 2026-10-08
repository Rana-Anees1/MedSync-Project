import ImageSlider from '../ui/ImageSlider';
import Logo from '../layout/Logo';
import { WELCOME_SLIDES } from '../../assets/images';

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <div className="auth__visual">
        <div className="auth__brand"><Logo /></div>
        <ImageSlider slides={WELCOME_SLIDES} />
      </div>
      <main className="auth__panel">
        <div className="auth__card">{children}</div>
        <p className="auth__foot">MedSync · Perioperative care continuity</p>
      </main>
    </div>
  );
}
