import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  Building2,
  UserPlus,
  Sun,
  Moon,
  Wallet,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { GraduationCap } from "lucide-react";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/institution" },
  { icon: Users, label: "Researchers", href: "/institution/researchers" },
  { icon: UserPlus, label: "Reviewers", href: "/institution/reviewers" },
  { icon: GraduationCap, label: "Supervisors", href: "/institution/supervisors" },
  { icon: Building2, label: "Departments", href: "/institution/departments" },
  { icon: FileText, label: "Research Papers", href: "/institution/papers" },
  { icon: CheckSquare, label: "Pending Reviews", href: "/institution/reviews" },
  { icon: Shield, label: "Verification", href: "/institution/verification" },
  { icon: BarChart3, label: "Analytics", href: "/institution/analytics" },
  { icon: Wallet, label: "Commissions", href: "/institution/commissions" },
  { icon: Settings, label: "Settings", href: "/institution/settings" },
];

interface InstitutionLayoutProps {
  children: React.ReactNode;
}

export default function InstitutionLayout({ children }: InstitutionLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [institutionName, setInstitutionName] = useState("Institution");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { platformLogo } = usePlatformSettings();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchInstitution(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
    }
  }, [user]);

  const fetchInstitution = async (userId: string) => {
    const { data } = await supabase.from("institutions").select("name").eq("admin_user_id", userId).maybeSingle();

    if (data) {
      setInstitutionName(data.name);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({ title: "Signed out successfully" });
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Fixed on desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-600 to-indigo-700 flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <Link to="/" className="flex items-center gap-3">
            {platformLogo ? (
              <img src={platformLogo} alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg overflow-hidden">
                <img
                  src="/placeholder.svg"
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <span className="font-bold text-lg text-white truncate block max-w-[160px]">{institutionName}</span>
              <span className="block text-xs text-white/70">R2P CONNECT</span>
            </div>
          </Link>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive ? "bg-white text-purple-700 shadow-lg" : "text-white/80 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout - Fixed at bottom */}
        <div className="p-4 border-t border-white/10 flex-shrink-0 bg-gradient-to-b from-transparent to-indigo-800/50">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-white/20 text-white font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{userName}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white/90">
                institution
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content - with left margin on desktop to account for fixed sidebar */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Institution Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage researchers and research approvals</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-xl hover:bg-accent/50"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <Button variant="ghost" size="icon" className="relative rounded-xl">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
