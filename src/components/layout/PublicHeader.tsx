import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sun, Moon, LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PublicBrand from "./PublicBrand";
const navLinks = [
  {
    label: "About",
    href: "/about-us",
  },
  {
    label: "How It Works",
    href: "/how-it-works",
  },
  {
    label: "Research",
    href: "/research",
  },
  {
    label: "Documentaries",
    href: "/documentaries",
  },
  {
    label: "FAQ",
    href: "/faq",
  },
  {
    label: "Contact",
    href: "/contact",
  },
];
const roleDashboardMap: Record<string, string> = {
  admin: "/admin",
  institution: "/institution",
  industry: "/industry",
  investor: "/investor",
  reviewer: "/reviewer",
  supervisor: "/supervisor",
  ipn: "/ipn",
};

export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dashboardPath, setDashboardPath] = useState("/dashboard");
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).then(({ data }) => {
          const role = data?.[0]?.role;
          setDashboardPath(role && roleDashboardMap[role] ? roleDashboardMap[role] : "/dashboard");
        });
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).then(({ data }) => {
          const role = data?.[0]?.role;
          setDashboardPath(role && roleDashboardMap[role] ? roleDashboardMap[role] : "/dashboard");
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate("/");
  };
  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <PublicBrand />

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          {user ? (
            <>
              <Link to={dashboardPath}>
                <Button variant="ghost" className="font-medium gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Button variant="outline" className="rounded-xl font-medium gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" className="font-medium">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button className="rounded-xl font-medium">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] bg-card p-0">
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <PublicBrand compact onClick={() => setOpen(false)} />
              </div>

              {/* Mobile Nav Links */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="flex flex-col gap-1 px-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setOpen(false)}
                      className="px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors font-medium"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Auth Buttons */}
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
                    <span className="relative h-4 w-4">
                      <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </span>
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </Button>
                </div>
                {user ? (
                  <>
                    <Link to={dashboardPath} onClick={() => setOpen(false)} className="block">
                      <Button variant="outline" className="w-full gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setOpen(false)} className="block">
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth?mode=signup" onClick={() => setOpen(false)} className="block">
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
