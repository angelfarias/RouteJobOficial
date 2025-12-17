// frontend/lib/useCurrentUser.ts
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebaseClient';
import { User } from 'firebase/auth';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((firebaseUser) => setUser(firebaseUser));
    return () => unsub();
  }, []);
  return user;
}
