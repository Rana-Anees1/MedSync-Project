import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ title = 'Something went wrong', message, onRetry, fullPage = false }) {
  return (
    <div className={`error-state ${fullPage ? 'loading--page' : ''}`} role="alert">
      <AlertTriangle size={28} aria-hidden />
      <p className="empty__title">{title}</p>
      {message && <p className="empty__text">{message}</p>}
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
