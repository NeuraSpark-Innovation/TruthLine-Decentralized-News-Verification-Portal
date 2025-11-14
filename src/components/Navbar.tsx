import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Navbar = () => {
  const { user, profile, signOut } = useAuth();

  const navLinks = user
    ? [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/report", label: "Report News" },
        { to: "/verify", label: "Verify" },
        { to: "/profile", label: "Profile" },
        ...(profile?.role === "moderator"
          ? [{ to: "/moderate", label: "Moderate" }]
          : []),
      ]
    : [
        { to: "/", label: "Home" },
        { to: "/auth/login", label: "Login" },
      ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Shield className="h-6 w-6 text-primary" />
          TruthLine
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Button onClick={signOut} variant="outline" size="sm">
              Logout
            </Button>
          )}
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col gap-4 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <Button onClick={signOut} variant="outline" className="mt-4">
                  Logout
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
