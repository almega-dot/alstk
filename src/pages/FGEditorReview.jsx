import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FGEditorReviewInner from './FGEditorReviewInner';

export default function FGEditorReview() {
  const { profile, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!profile || !['ADMIN', 'EDITOR', 'ENTRY'].includes(profile.role_code)) {
    return <Navigate to="/" replace />;
  }

  return <FGEditorReviewInner profile={profile} />;
}
