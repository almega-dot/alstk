import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import EditorReviewInner from './EditorReviewInner';

export default function EditorReview() {
  const { profile, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!profile || !['ADMIN', 'EDITOR'].includes(profile.role_code)) {
    return <Navigate to="/" replace />;
  }

  return <EditorReviewInner profile={profile} />;
}
