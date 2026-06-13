import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  Briefcase,
  TrendingUp,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  User as UserIcon,
  DollarSign,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/investor" },
  { icon: Briefcase, label: "Portfolio", href: "/investor/portfolio" },
  { icon: TrendingUp, label: "Opportunities", href: "/investor/opportunities" },
  { icon: Users, label: "Researchers", href: "/investor/researchers" },
  { icon: Play, label: "Documentaries", href: "/investor/documentaries" },
  { icon: BarChart3, label: "Analytics", href: "/investor/analytics" },
  { icon: UserIcon, label: "Profile", href: "/investor/profile" },
];

interface InvestorLayoutProps {
  children: React.ReactNode;
}

export default function InvestorLayout({ children }: InvestorLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

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
      supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        setProfileName(data?.full_name || null);
        setAvatarUrl(data?.avatar_url || null);
      });
    } else {
      setProfileName(null);
      setAvatarUrl(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({ title: "Signed out successfully" });
  };

  const userName = profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            {platformLogo ? (
              <img src={platformLogo} alt="Logo" className="w-10 h-10 rounded-2xl object-contain" />
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
              <span className="font-bold text-lg text-foreground">R2P CONNECT</span>
              <span className="block text-xs text-primary">Investor Portal</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:translate-x-1",
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Portfolio Summary Card */}
        <div className="p-3">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-4 border border-emerald-200/50">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Portfolio Value</span>
            </div>
            <p className="text-2xl font-bold text-foreground">$0.00</p>
            <p className="text-xs text-muted-foreground">Total investments</p>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-border flex-shrink-0 bg-card">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/30 transition-colors mb-2">
            <Avatar className="w-10 h-10 shadow-md">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-primary-foreground font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{userName}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                investor
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Investor Dashboard</h1>
                <p className="text-sm text-muted-foreground">Fund promising research</p>
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

              <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-accent/50">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              </Button>

              <Link to="/investor/profile">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent/50">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
