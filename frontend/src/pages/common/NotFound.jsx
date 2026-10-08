import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../config/navigation';
import { EmptyState } from '../../components/ui';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <EmptyState title="This page does not exist" action={<Link className="btn btn--primary" to={homeFor(user.role)}>Go to your home page</Link>}>
      Check the address or use the menu.
    </EmptyState>
  );
}
