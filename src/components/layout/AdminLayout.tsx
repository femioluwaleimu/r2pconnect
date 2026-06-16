import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import AppLogo from "./AppLogo";
import {
  Play,
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Trophy,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  Shield,
  Database,
  Crown,
  Wallet,
  Tag,
  GraduationCap,
  Percent,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Building2, label: "Institutions", href: "/admin/institutions" },
  { icon: FileText, label: "Research", href: "/admin/research" },
  { icon: Trophy, label: "Challenges", href: "/admin/challenges" },
  { icon: Play, label: "Documentaries", href: "/admin/documentaries" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: DollarSign, label: "Revenue", href: "/admin/revenue" },
  { icon: Database, label: "System", href: "/admin/system" },
  { icon: Crown, label: "Subscriptions", href: "/admin/subscriptions" },
  { icon: Wallet, label: "Withdrawals", href: "/admin/withdrawals" },
  { icon: Tag, label: "Coupons", href: "/admin/coupons" },
  { icon: GraduationCap, label: "Supervisors", href: "/admin/supervisors" },
  { icon: Shield, label: "FAQ", href: "/admin/faq" },
  { icon: Percent, label: "Commissions", href: "/admin/commission-settings" },
  { icon: Building2, label: "IPN", href: "/admin/ipn" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.full_name) setProfileName(data.full_name);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
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

  const userName = profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on desktop */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-2">
            <AppLogo className="w-10 h-10 rounded-2xl" />
            <div>
              <span className="font-bold text-lg text-white">R2P CONNECT</span>
              <span className="block text-xs text-red-400">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
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
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* System Status Card */}
        <div className="p-3 flex-shrink-0">
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">System Status</span>
            </div>
            <p className="text-lg font-bold text-white">All Systems Online</p>
            <p className="text-xs text-slate-400">Last check: Just now</p>
          </div>
        </div>

        {/* User Profile - Fixed at bottom */}
        <div className="p-3 border-t border-slate-700 flex-shrink-0 bg-slate-900">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors mb-2">
            <Avatar className="w-10 h-10 shadow-md">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-red-500 to-rose-600 text-white font-semibold">
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{userName}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                admin
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
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
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-xl"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage the platform</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-accent/50">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              </Button>
              
              <Link to="/admin/settings">
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent/50">
                  <Settings className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
