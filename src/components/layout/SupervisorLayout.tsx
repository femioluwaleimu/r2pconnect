import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckCircle,
  Clock,
  LogOut,
  Menu,
  ChevronRight,
  Sparkles,
  User as UserIcon,
  UserPlus,
  Wallet,
  ArrowUpRight,
  Bot,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupervisorCredits } from "@/hooks/useSupervisorCredits";
import { formatLagos } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import AppLogo from "./AppLogo";
import SupportChatbot from "@/components/support/SupportChatbot";

interface SupervisorLayoutProps {
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

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/supervisor" },
  { icon: Users, label: "My Students", path: "/supervisor/students" },
  { icon: UserPlus, label: "Invite Students", path: "/supervisor/invite-students" },
  { icon: Clock, label: "Pending Reviews", path: "/supervisor/pending", showBadge: true },
  { icon: CheckCircle, label: "Approved", path: "/supervisor/approved" },
  { icon: FileText, label: "All Research", path: "/supervisor/research" },
  { icon: Bot, label: "Train AI Supervisor", path: "/supervisor/ai-training" },
  { icon: Wallet, label: "Revenue", path: "/supervisor/revenue" },
  { icon: ArrowUpRight, label: "Withdrawals", path: "/supervisor/withdrawals" },
  { icon: UserIcon, label: "My Profile", path: "/supervisor/profile" },
];

export default function SupervisorLayout({ children }: SupervisorLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { creditsRemaining, creditsLimit, studentCount, loading: creditsLoading } = useSupervisorCredits();

  useEffect(() => {
    let notificationsInterval: number | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;

      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchProfile(user.id);
      fetchPendingCount(user.id);
      fetchNotifications(user.id);
      notificationsInterval = window.setInterval(() => {
        fetchNotifications(user.id);
      }, 30000);

      // Subscribe to real-time updates for pending count
      channel = supabase
        .channel('supervisor-pending-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'research_papers',
            filter: `supervisor_id=eq.${user.id}`,
          },
          () => {
            fetchPendingCount(user.id);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (notificationsInterval) {
        window.clearInterval(notificationsInterval);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const fetchPendingCount = async (userId: string) => {
    const { count } = await supabase
      .from("research_papers")
      .select("id", { count: "exact", head: true })
      .eq("supervisor_id", userId)
      .eq("research_type", "student")
      .eq("supervisor_approval_status", "pending");
    
    setPendingCount(count || 0);
  };

  const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching supervisor notifications:", error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.filter((notification) => !notification.is_read).length || 0);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true } : notification
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate("/auth");
  };

  const HeaderActions = () => (
    <div className="flex items-center gap-1">
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
                  {!notification.is_read && <span className="w-2 h-2 bg-primary rounded-full" />}
                </div>
                {notification.message && (
                  <span className="text-xs text-muted-foreground line-clamp-2">{notification.message}</span>
                )}
                <span className="text-xs text-muted-foreground">{formatLagos(notification.created_at)}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
    </div>
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/supervisor" className="flex items-center gap-3">
          <AppLogo className="w-10 h-10 rounded-xl shadow-lg" />
          <div>
            <span className="font-bold text-lg text-foreground">Supervisor</span>
            <p className="text-xs text-muted-foreground">Research Portal</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.showBadge && pendingCount > 0;
          return (
            <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start gap-3 rounded-xl ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {showBadge && (
                  <Badge className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5">
                    {pendingCount}
                  </Badge>
                )}
                {isActive && !showBadge && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* AI Credits Card */}
      <div className="px-4 pb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">AI Credits</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    {creditsLoading ? "..." : creditsRemaining}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {creditsLimit}</span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <UserIcon className="w-3 h-3" />
                  <span>{studentCount} student{studentCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs">
                Your AI credits are based on your students' subscription plans. 
                Free plan students: 3 credits. Paid plan students: 2/3 of their credits.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              {profile?.full_name?.charAt(0) || "S"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate text-sm">{profile?.full_name || "Supervisor"}</p>
            <p className="text-xs text-muted-foreground">Supervisor</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col z-50">
        <Sidebar />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/supervisor" className="flex items-center gap-2">
            <AppLogo className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-foreground">Supervisor</span>
          </Link>

          <div className="flex items-center gap-1">
            <HeaderActions />
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <header className="hidden lg:flex sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border px-6 py-4 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Supervisor</h1>
            <p className="text-sm text-muted-foreground">Research Portal</p>
          </div>
          <HeaderActions />
        </header>
        <div className="container mx-auto px-4 py-6 max-w-7xl">{children}</div>
      </main>
      {user && <SupportChatbot userRole="supervisor" />}
    </div>
  );
}
