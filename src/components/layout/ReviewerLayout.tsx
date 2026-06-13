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
  Play,
  LayoutDashboard,
  FileText,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  ClipboardCheck,
  User as UserIcon,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/reviewer" },
  { icon: Clock, label: "Pending Reviews", href: "/reviewer/pending" },
  { icon: FileText, label: "All Assignments", href: "/reviewer/assignments" },
  { icon: CheckCircle, label: "Completed", href: "/reviewer/completed" },
  { icon: BarChart3, label: "Statistics", href: "/reviewer/stats" },
  { icon: UserIcon, label: "Profile", href: "/reviewer/profile" },
];

interface ReviewerLayoutProps {
  children: React.ReactNode;
}

export default function ReviewerLayout({ children }: ReviewerLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({ title: "Signed out successfully" });
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Reviewer";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Fixed on desktop with deep background */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-secondary border-r border-border flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border/50">
          <Link to="/" className="flex items-center gap-2">
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
              <span className="font-bold text-lg text-secondary-foreground">R2PConnect</span>
              <span className="block text-xs text-stat-green">Reviewer Portal</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "bg-stat-green text-white" 
                    : "text-secondary-foreground/80 hover:bg-secondary-foreground/10 hover:text-secondary-foreground",
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isActive ? "bg-white/20" : "bg-stat-blue"
                )}>
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile - Fixed at bottom */}
        <div className="p-4 border-t border-border/50 flex-shrink-0 bg-secondary">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10 ring-2 ring-stat-green">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-stat-green text-white font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-secondary-foreground truncate">{userName}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stat-green text-white">
                reviewer
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                <h1 className="text-xl font-bold text-foreground">Reviewer Dashboard</h1>
                <p className="text-sm text-muted-foreground">Review and approve research papers</p>
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
