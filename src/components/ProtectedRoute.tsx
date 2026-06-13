import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer the role fetch to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data) {
        setUserRole(data.role);
      } else {
        // Fail closed - no role means no access
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      // Fail closed - error means no access
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - redirect to auth page
  if (!user || !session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Redirect to the appropriate dashboard based on user's actual role
    const dashboardMap: Record<UserRole, string> = {
      admin: '/admin',
      institution: '/institution',
      industry: '/industry',
      investor: '/investor',
      ipn: '/ipn',
      job_applicant: '/dashboard',
      researcher: '/dashboard',
      reviewer: '/reviewer',
      supervisor: '/supervisor',
    };
    
    return <Navigate to={dashboardMap[userRole] || '/dashboard'} replace />;
  }

  return <>{children}</>;
}