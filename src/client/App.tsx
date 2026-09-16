import { AuthUser } from '../shared/types/defect';
import { DefectList } from './components/DefectList';

const currentUser: AuthUser = { id: 'u1', role: 'REPORTER' };

export function App() {
  return <DefectList currentUser={currentUser} />;
}
