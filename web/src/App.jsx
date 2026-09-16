import { useState } from 'react';
import { DefectForm } from './components/DefectForm.jsx';

export function App() {
  const [createdDefect, setCreatedDefect] = useState(null);

  return (
    <div>
      <h1>Report a Defect</h1>
      <DefectForm onSubmitSuccess={setCreatedDefect} />
      {createdDefect && <p>Defect {createdDefect.id} created with status {createdDefect.status}.</p>}
    </div>
  );
}
