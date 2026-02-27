
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Network,
  Table,
  Settings,
  Database
} from "lucide-react";
import { Logo } from './Logo';

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Flows",
    href: "/flows",
    icon: Network,
  },
  {
    title: "Tables",
    href: "/tables",
    icon: Database,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const Sidebar = () => {
  const { pathname } = useLocation();

  return (
    <div className="border-r w-64 h-screen flex flex-col bg-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Logo className="h-8 w-8 mr-2" />
          FlowForge
        </h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
            U
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">User Name</div>
            <div className="text-xs text-muted-foreground">user@example.com</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
