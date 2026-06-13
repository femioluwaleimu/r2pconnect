import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Filter, Info, UserPlus, Shield, UserCheck, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatLagos } from "@/lib/dateUtils";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["app_role"];

interface UserData {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]));
      
      const combinedUsers: UserData[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        role: rolesMap.get(p.user_id) || 'researcher',
        created_at: p.created_at,
      }));

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const userStats = [
    { label: "Total Users", value: users.length.toString(), icon: Users },
    { label: "Researchers", value: users.filter(u => u.role === 'researcher').length.toString(), icon: UserCheck },
    { label: "Institutions", value: users.filter(u => u.role === 'institution').length.toString(), icon: Shield },
    { label: "Reviewers", value: users.filter(u => u.role === 'reviewer').length.toString(), icon: UserPlus },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: "bg-red-600 text-white",
      researcher: "bg-blue-600 text-white",
      institution: "bg-purple-600 text-white",
      industry: "bg-amber-600 text-white",
      investor: "bg-teal-600 text-white",
      reviewer: "bg-emerald-600 text-white",
      supervisor: "bg-indigo-600 text-white",
      ipn: "bg-orange-600 text-white",
      job_applicant: "bg-gray-600 text-white",
    };
    return colors[role] || "bg-secondary";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage all platform users</p>
          </div>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {userStats.map((stat) => (
            <Card key={stat.label} className="shadow-card rounded-2xl border-border/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-md">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search users by name or email..." 
              className="rounded-xl pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-40 rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="researcher">Researcher</SelectItem>
              <SelectItem value="reviewer">Reviewer</SelectItem>
              <SelectItem value="institution">Institution</SelectItem>
              <SelectItem value="industry">Industry</SelectItem>
              <SelectItem value="investor">Investor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info Card */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Info className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">User Management</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View and edit user profiles</li>
                  <li>• Manage user roles and permissions</li>
                  <li>• Suspend or deactivate accounts</li>
                  <li>• Reset passwords and verify emails</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-card rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Users Found</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  {searchQuery || filterRole !== "all" 
                    ? "No users match your search criteria." 
                    : "Users will appear here once they register on the platform."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold shadow-md">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatLagos(user.created_at)}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-xl"
                        onClick={() => navigate(`/admin/users/${user.user_id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
