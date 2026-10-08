import { formatDate } from '../../utils/date';

export default function ActivityLog({ activity }) {
  return (
    <ol className="activity">
      {activity.map((a) => (
        <li key={a.id}>
          <time>{formatDate(a.date)}</time>
          <div>
            <strong>{a.actor}</strong>
            <p>{a.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
