import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  role: string | null;
  fullName: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  fullName: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialCheckDone = useRef(false);

  // Effect 1: Auth only — resolves session, NO database calls.
  // Keeping DB calls out of the auth SDK callback chain prevents the lock
  // contention that caused infinite loading (getSession lock + emitInitialSession
  // internal getSession + fetchRole's internal getSession all competing).
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) setUser(session?.user ?? null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        initialCheckDone.current = true;
        if (mounted) setIsLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted || event === 'INITIAL_SESSION') return;
        if (!initialCheckDone.current) return;
        setUser(session?.user ?? null);
        if (!session?.user) {
          setRole(null);
          setFullName(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Effect 2: Fetch role from DB — runs whenever user.id changes,
  // completely decoupled from the auth SDK so no lock contention possible.
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', user.id)
          .single();
          
        if (!mounted || error || !data) return;
        setRole(data.role ?? null);
        setFullName(data.full_name ?? null);
      } catch (err) {
        // ignore
      }
    };
    
    fetchRole();

    return () => { mounted = false; };
  }, [user?.id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setFullName(null);
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--color-bg, #0f0f0f)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid #333', borderTopColor: '#c9a84c',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, fullName, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
