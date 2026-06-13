import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { formatLagos } from "@/lib/dateUtils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Play,
  LayoutDashboard,
  FileText,
  Search,
  Lightbulb,
  Sparkles,
  Target,
  Users,
  Trophy,
  Video,
  Wallet,
  Star,
  Settings,
  LogOut,
  Bell,
  CreditCard,
  Zap,
  Menu,
  User as UserIcon,
  Check,
  Sun,
  Moon,
  Briefcase,
  Rss,
  Bot } from
"lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  link: string | null;
}

interface AICredits {
  credits_used: number;
  credits_limit: number;
  reset_month: string;
}

interface SidebarItem {
  icon: any;
  label: string;
  href: string;
  iconBg?: string;
}

const sidebarItems: SidebarItem[] = [
{ icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
{ icon: Rss, label: "Feed", href: "/dashboard/feed" },
{ icon: FileText, label: "My Research", href: "/dashboard/research" },
{ icon: Search, label: "Browse Research", href: "/dashboard/browse" },
{ icon: Lightbulb, label: "Topic Refiner", href: "/dashboard/topic-refiner" },
{ icon: Target, label: "Gap Detector", href: "/dashboard/gap-detector" },
{ icon: Sparkles, label: "AI Assistant", href: "/dashboard/ai-assistant", iconBg: "bg-pink-500" },
{ icon: Bot, label: "AI Supervisor", href: "/dashboard/ai-supervisor", iconBg: "bg-violet-500" },
{ icon: Users, label: "Collab Matcher", href: "/dashboard/collab" },
{ icon: Trophy, label: "Challenges", href: "/dashboard/challenges" },
{ icon: Briefcase, label: "Job Board", href: "/dashboard/job-board" },
{ icon: Video, label: "Documentaries", href: "/dashboard/documentaries" },
{ icon: Star, label: "Achievements", href: "/dashboard/achievements" },
{ icon: Wallet, label: "Wallet", href: "/dashboard/student-wallet" },
{ icon: CreditCard, label: "Subscriptions", href: "/dashboard/subscriptions" },
{ icon: Bell, label: "Supervisor Inbox", href: "/dashboard/supervisor-inbox" },
{ icon: UserIcon, label: "Profile", href: "/dashboard/profile" }];


interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiCredits, setAiCredits] = useState<AICredits>({ credits_used: 0, credits_limit: 3, reset_month: "" });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { platformLogo } = usePlatformSettings();

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const {
      data: { subscription }
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

  // Fetch user interests from their research papers
  const fetchUserInterests = useCallback(async () => {
    if (!user) return;

    try {
      const { data: papers } = await supabase.
      from("research_papers").
      select("keywords, research_field").
      eq("author_id", user.id);

      if (papers) {
        const interests: string[] = [];
        papers.forEach((paper) => {
          if (paper.keywords) interests.push(...paper.keywords);
          if (paper.research_field) interests.push(paper.research_field);
        });
        setUserInterests([...new Set(interests.map((i) => i.toLowerCase()))]);
      }
    } catch (error) {
      console.error("Error fetching user interests:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchAICredits();
      fetchUserInterests();
      // Fetch avatar
      supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
    }
  }, [user, fetchUserInterests]);

  // Real-time subscription for new published research
  useEffect(() => {
    if (!user || userInterests.length === 0) return;

    const channel = supabase.
    channel("research-notifications").
    on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "research_papers",
        filter: "status=eq.published"
      },
      async (payload) => {
        const newPaper = payload.new as any;

        // Skip if it's the user's own paper
        if (newPaper.author_id === user.id) return;

        // Check if paper matches user interests
        const paperKeywords = (newPaper.keywords || []).map((k: string) => k.toLowerCase());
        const paperField = (newPaper.research_field || "").toLowerCase();

        const hasMatch = userInterests.some(
          (interest) => paperKeywords.includes(interest) || paperField.includes(interest)
        );

        if (hasMatch) {
          // Create notification in database
          try {
            await supabase.from("notifications").insert({
              user_id: user.id,
              title: "New Research Matches Your Interests",
              message: `"${newPaper.title}" was just published and matches your research interests.`,
              type: "research_match",
              link: `/dashboard/browse?paper=${newPaper.id}`
            });

            // Show toast notification
            toast({
              title: "New Research Alert",
              description: `"${newPaper.title}" matches your interests!`
            });

            // Refresh notifications
            fetchNotifications();
          } catch (error) {
            console.error("Error creating notification:", error);
          }
        }
      }
    ).
    on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "research_papers",
        filter: "status=eq.published"
      },
      async (payload) => {
        const newPaper = payload.new as any;

        // Skip if it's the user's own paper
        if (newPaper.author_id === user.id) return;

        // Check if paper matches user interests
        const paperKeywords = (newPaper.keywords || []).map((k: string) => k.toLowerCase());
        const paperField = (newPaper.research_field || "").toLowerCase();

        const hasMatch = userInterests.some(
          (interest) => paperKeywords.includes(interest) || paperField.includes(interest)
        );

        if (hasMatch) {
          // Create notification in database
          try {
            await supabase.from("notifications").insert({
              user_id: user.id,
              title: "New Research Matches Your Interests",
              message: `"${newPaper.title}" was just published and matches your research interests.`,
              type: "research_match",
              link: `/dashboard/browse?paper=${newPaper.id}`
            });

            // Show toast notification
            toast({
              title: "New Research Alert",
              description: `"${newPaper.title}" matches your interests!`
            });

            // Refresh notifications
            fetchNotifications();
          } catch (error) {
            console.error("Error creating notification:", error);
          }
        }
      }
    ).
    on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "researcher_invites",
        filter: `researcher_id=eq.${user.id}`
      },
      async (payload) => {
        const invite = payload.new as any;

        // Create notification for new invite
        try {
          await supabase.from("notifications").insert({
            user_id: user.id,
            title: "New Collaboration Invite",
            message: `${invite.company_name} has invited you to collaborate on a research challenge.`,
            type: "invite",
            link: `/dashboard/challenges`
          });

          // Show toast notification
          toast({
            title: "New Collaboration Invite!",
            description: `${invite.company_name} wants to collaborate with you.`
          });

          // Refresh notifications
          fetchNotifications();
        } catch (error) {
          console.error("Error creating invite notification:", error);
        }
      }
    ).
    on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications((prev) => [newNotification, ...prev.slice(0, 9)]);
        setUnreadCount((prev) => prev + 1);
      }
    ).
    subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userInterests, toast]);

  const fetchAICredits = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data, error } = await supabase.
      from("ai_credits").
      select("credits_used, credits_limit, reset_month").
      eq("user_id", user?.id).
      maybeSingle();

      if (error) throw error;

      if (data) {
        // Check if we need to reset for new month
        if (data.reset_month !== currentMonth) {
          // Credits will be reset on next AI usage, but show fresh count
          setAiCredits({
            credits_used: 0,
            credits_limit: data.credits_limit || 3,
            reset_month: currentMonth
          });
        } else {
          setAiCredits({
            credits_used: data.credits_used || 0,
            credits_limit: data.credits_limit || 3,
            reset_month: data.reset_month || currentMonth
          });
        }
      }
    } catch (error) {
      console.error("Error fetching AI credits:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.
      from("notifications").
      select("*").
      order("created_at", { ascending: false }).
      limit(10);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);

      setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({ title: "Signed out successfully" });
  };

  const userRole = user?.user_metadata?.role || "researcher";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen &&
      <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      }

      {/* Sidebar - Fixed on desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>

        <div className="p-4 border-b border-border flex-shrink-0">
          <Link to="/" className="flex items-center gap-2">
            {platformLogo ?
            <img src={platformLogo} alt="Logo" className="w-10 h-10 rounded-2xl object-contain" /> :

            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg overflow-hidden">
                <img
                src="/placeholder.svg"
                alt="Logo"
                className="w-full h-full object-cover" />

              </div>
            }
            <div>
              <span className="font-bold text-lg text-foreground">R2P CONNECT</span>
              <span className="block text-xs text-primary">Research2Practice</span>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation - Independent scroll */}
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
                  isActive ?
                  "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md" :
                  "text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:translate-x-1"
                )}>

                {item.iconBg ?
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", item.iconBg)}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div> :

                <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
                }
                {item.label}
              </Link>);

          })}
        </nav>

        {/* Fixed Footer: User + Logout */}
        <div className="flex-shrink-0 border-t border-border bg-card">
          {/* User Profile & Logout */}
          <div className="p-3">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/30 transition-colors mb-2">
              <Avatar className="w-10 h-10 shadow-md">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{userName}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {userRole}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl font-semibold"
              onClick={handleSignOut}>

              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content - with left margin on desktop to account for fixed sidebar */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">R2P CONNECT</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Notifications Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-accent/50">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 &&
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="font-semibold">Notifications</span>
                    {unreadCount > 0 &&
                    <Button variant="ghost" size="sm" className="text-xs" onClick={markAllAsRead}>
                        Mark all read
                      </Button>
                    }
                  </div>
                  {notifications.length === 0 ?
                  <div className="px-3 py-6 text-center text-muted-foreground text-sm">No notifications yet</div> :

                  notifications.slice(0, 5).map((notification) =>
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 cursor-pointer",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.link) {
                        navigate(notification.link);
                      }
                    }}>

                        <div className="flex items-center gap-2 w-full">
                          <span className="font-medium text-sm flex-1">{notification.title}</span>
                          {!notification.is_read && <span className="w-2 h-2 bg-primary rounded-full" />}
                        </div>
                        {notification.message &&
                    <span className="text-xs text-muted-foreground line-clamp-2">{notification.message}</span>
                    }
                        <span className="text-xs text-muted-foreground">
                          {formatLagos(notification.created_at)}
                        </span>
                      </DropdownMenuItem>
                  )
                  }
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-xl hover:bg-accent/50">

                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-accent/50"
                onClick={() => navigate("/dashboard/profile")}>

                <Avatar className="w-7 h-7">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-semibold">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto mx-0 my-0">{children}</main>
      </div>
    </div>);

}