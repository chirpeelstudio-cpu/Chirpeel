import { LayoutDashboard, Users, FileText, Wallet, Settings, UserCog, KanbanSquare, Truck, Briefcase, LogOut, Loader2, Sparkles, Megaphone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/placeholder.svg";
import type { Permissions } from "@/hooks/useCurrentUserPermissions";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";

export type AdminView = "overview" | "pipeline" | "leads" | "quotation" | "messages" | "finance" | "branding" | "settings" | "team" | "vendors" | "projects" | "marketing";

interface AdminSidebarProps {
  activeView: AdminView;
  onChange: (view: AdminView) => void;
  userEmail?: string;
  permissions: Permissions;
}

const ALL_ITEMS: { id: AdminView; title: string; icon: typeof LayoutDashboard; perm: keyof Permissions }[] = [
  { id: "overview",  title: "Overview",  icon: LayoutDashboard, perm: "overview" },
  { id: "pipeline",  title: "Pipeline",  icon: KanbanSquare,    perm: "pipeline" },
  { id: "leads",     title: "Leads",     icon: Users,           perm: "leads" },
  { id: "quotation", title: "Quotation", icon: FileText,        perm: "quotation" },
  { id: "projects",  title: "Projects",  icon: Briefcase,       perm: "projects" },
  { id: "vendors",   title: "Vendors",   icon: Truck,           perm: "vendors" },
  { id: "finance",   title: "Finance",   icon: Wallet,          perm: "finance" },
  { id: "marketing", title: "Marketing", icon: Megaphone,       perm: "marketing" },
  { id: "team",      title: "Team",      icon: UserCog,         perm: "team" },
  { id: "settings",  title: "Settings",  icon: Settings,        perm: "settings" },
];

export function AdminSidebar({ activeView, onChange, userEmail, permissions }: AdminSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const items = ALL_ITEMS.filter(i => permissions[i.perm]);
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = profile.fullName || "Profile";
  const displayEmail = profile.email || userEmail || "admin@studio.local";
  const initials = (profile.fullName || profile.email || userEmail || "A")
    .split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLoggingOut(false);
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      return;
    }
    try { localStorage.removeItem("post_login_redirect"); } catch { /* ignore */ }
    toast({ title: "Signed out" });
    navigate("/login?redirect=/", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border">
        <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
          <img src={logo} alt="Studio" className="h-8 w-8 object-contain shrink-0" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-foreground">{"" }</span>
              <span className="text-[10px] text-muted-foreground">CRM Dashboard</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      onClick={() => onChange(item.id)}
                      className={isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}
                      data-tour-id={item.id}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Take the tour"
                  onClick={() => {
                    // Close the mobile sidebar Sheet first so the tour isn't covered by its overlay.
                    try { setOpenMobile(false); } catch { /* ignore */ }
                    window.dispatchEvent(new CustomEvent("crm:start-tour"));
                  }}
                  className="hover:bg-muted/50 text-muted-foreground"
                  data-tour-id="take-tour"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Take the tour</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
          {profileLoading ? (
            <div className="flex items-center gap-2 flex-1 min-w-0 p-1 -m-1">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              {!collapsed && (
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              )}
            </div>
          ) : (
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 flex-1 min-w-0 rounded-md hover:bg-muted/50 p-1 -m-1 text-left"
            aria-label="Open profile"
          >
            <Avatar className="h-8 w-8 shrink-0">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col leading-tight overflow-hidden">
                <span className="text-xs font-medium text-foreground truncate">{displayName}</span>
                <span className="text-[10px] text-muted-foreground truncate">{displayEmail}</span>
              </div>
            )}
          </button>
          )}
          {!collapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label={loggingOut ? "Signing out" : "Log out"}
              aria-busy={loggingOut}
              title={loggingOut ? "Signing out…" : "Log out"}
              className="shrink-0 h-8 w-8"
            >
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center pb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label={loggingOut ? "Signing out" : "Log out"}
              aria-busy={loggingOut}
              title={loggingOut ? "Signing out…" : "Log out"}
              className="h-8 w-8"
            >
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
