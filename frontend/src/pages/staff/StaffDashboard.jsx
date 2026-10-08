import { useAuth } from '../../context/AuthContext';
import SurgeonOverview from './overviews/SurgeonOverview';
import AnaesthetistOverview from './overviews/AnaesthetistOverview';
import CoordinatorOverview from './overviews/CoordinatorOverview';

export default function StaffDashboard() {
  const { user } = useAuth();
  if (user.role === 'surgeon') return <SurgeonOverview />;
  if (user.role === 'anaesthetist') return <AnaesthetistOverview />;
  return <CoordinatorOverview />;
}
