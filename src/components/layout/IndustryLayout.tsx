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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatLagos } from "@/lib/dateUtils";
import {
  LayoutDashboard,
  Trophy,
  FileText,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Menu,
  Briefcase,
  User as UserIcon,
  Sun,
  Moon,
  CreditCard,
  Wallet,
  MessageSquare,
  Check,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/industry" },
  { icon: Trophy, label: "My Challenges", href: "/industry/challenges" },
  { icon: FileText, label: "Submissions", href: "/industry/submissions" },
  { icon: Briefcase, label: "Job Postings", href: "/industry/job-postings" },
  { icon: FileText, label: "Applications", href: "/industry/applications" },
  { icon: Users, label: "Hired Students", href: "/industry/hired-students" },
  { icon: Users, label: "Researchers", href: "/industry/researchers" },
  { icon: Play, label: "Documentaries", href: "/industry/documentaries" },
  { icon: MessageSquare, label: "Invites", href: "/industry/invites" },
  { icon: BarChart3, label: "Analytics", href: "/industry/analytics" },
  { icon: Wallet, label: "Wallet", href: "/industry/wallet" },
  { icon: CreditCard, label: "Subscription", href: "/industry/subscriptions" },
  { icon: UserIcon, label: "Profile", href: "/industry/profile" },
];

interface IndustryLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  link: string | null;
}

export default function IndustryLayout({ children }: IndustryLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      fetchNotifications();

      // Subscribe to real-time notifications
      const notificationChannel = supabase
        .channel('industry-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);
            setUnreadCount((prev) => prev + 1);
            toast({
              title: newNotification.title,
              description: newNotification.message || undefined,
            });
          }
        )
        .subscribe();

      // Subscribe to real-time challenge submissions
      const submissionChannel = supabase
        .channel('challenge-submissions')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'challenge_submissions'
          },
          async (payload) => {
            const submission = payload.new as { challenge_id: string; researcher_id: string };
            
            // Check if this submission is for one of the industry user's challenges
            const { data: challenge } = await supabase
              .from('challenges')
              .select('title, industry_id')
              .eq('id', submission.challenge_id)
              .single();

            if (challenge && challenge.industry_id === user.id) {
              // Get researcher info
              const { data: researcher } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', submission.researcher_id)
                .single();

              const researcherName = researcher?.full_name || 'A researcher';
              
              toast({
                title: 'New Challenge Submission!',
                description: `${researcherName} submitted a proposal for "${challenge.title}"`,
              });

              // Create a notification in the database
              await supabase.from('notifications').insert({
                user_id: user.id,
                title: 'New Challenge Submission',
                message: `${researcherName} submitted a proposal for "${challenge.title}"`,
                type: 'info',
                link: '/industry/submissions'
              });

              // Refresh notifications
              fetchNotifications();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notificationChannel);
        supabase.removeChannel(submissionChannel);
      };
    }
  }, [user]);
  
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({ title: "Signed out successfully" });
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const companyName = user?.user_metadata?.company_name || "Company";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Fixed on desktop with independent scroll */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header - Fixed */}
        <div className="p-4 border-b border-border flex-shrink-0">
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
              <span className="block text-xs text-primary">Industry Portal</span>
            </div>
          </Link>
        </div>

        {/* Navigation - Scrollable independently */}
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

        {/* User Profile & Logout - Fixed at bottom */}
        <div className="p-3 border-t border-border flex-shrink-0 bg-card">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/30 transition-colors mb-2">
            <Avatar className="w-10 h-10 shadow-md">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-primary-foreground font-semibold">
                {companyName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">{companyName || userName}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                industry
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

      {/* Main Content - Offset for fixed sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">Industry Dashboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Connect with researchers</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-accent/50">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={markAllAsRead}>
                        Mark all read
                      </Button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-muted-foreground text-sm">No notifications yet</div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={cn(
                          "flex flex-col items-start gap-1 p-3 cursor-pointer",
                          !notification.is_read && "bg-primary/5"
                        )}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.link) navigate(notification.link);
                        }}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="font-medium text-sm flex-1">{notification.title}</span>
                          {!notification.is_read && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        {notification.message && (
                          <span className="text-xs text-muted-foreground line-clamp-2">{notification.message}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatLagos(notification.created_at)}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to="/industry/profile">
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
