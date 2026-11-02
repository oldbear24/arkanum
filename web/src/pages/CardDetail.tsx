import { useParams } from 'react-router-dom';

// Filled in by phase 6.
export function CardDetail() {
  const { id } = useParams();
  return <main style={{ padding: 48 }}>{id}</main>;
}
