import { useParams } from 'react-router-dom';

export function LogDetailPage() {
  const { id } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Log Detail</h1>
      <p>Log ID: {id}</p>
    </div>
  );
}
