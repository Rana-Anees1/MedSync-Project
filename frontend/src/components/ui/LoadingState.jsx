export default function LoadingState({ label = 'Loading…', fullPage = false }) {
  return (
    <div className={`loading ${fullPage ? 'loading--page' : ''}`} role="status" aria-live="polite">
      <span className="spinner" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
