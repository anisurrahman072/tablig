import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { token, loading } = useAuth();
  if (loading) return null;
  return <Redirect href={token ? '/(home)' : '/(auth)/welcome'} />;
}
