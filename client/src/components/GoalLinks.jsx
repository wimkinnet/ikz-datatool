import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// The operational goals that contribute to a signal or strategic goal, per school year. Goals of another year
// open after switching to that year, because the goals page shows one school year.
export default function GoalLinks({ goals }) {
  const { setYear } = useApp();
  if (!goals.length) return <p className="muted" style={{ margin: 0 }}>Nog geen operationele doelen gekoppeld.</p>;
  return (
    <ul className="dash-list">
      {goals.map((g) => (
        <li key={g._id}>
          <Link to={`/doelen?goal=${g._id}`} onClick={() => setYear(g.schoolYear)}>{g.title}</Link> <span className="muted">· {g.schoolYear}</span>
        </li>
      ))}
    </ul>
  );
}
