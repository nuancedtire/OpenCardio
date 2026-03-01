import { Link, useLocation } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { Activity, Clock, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

export default function NavBar() {
  const location = useLocation();
  const { signOut } = useAuthActions();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: "/scan", label: "New Scan", icon: Activity },
    { to: "/history", label: "History", icon: Clock },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/scan" className="flex items-center gap-2 font-semibold text-white">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="2,12 5,12 6.5,7 8,17 10,10 11.5,14 13,6 15.5,18 17,12 22,12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>OpenCardio</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === to || location.pathname.startsWith(to + "/")
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={() => void signOut()}
            className="ml-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-slate-400 hover:text-white btn-touch"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-2 flex flex-col gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                location.pathname === to || location.pathname.startsWith(to + "/")
                  ? "bg-slate-700 text-white"
                  : "text-slate-400"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={() => void signOut()}
            className="text-left px-3 py-3 text-sm text-slate-400 rounded-lg"
          >
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
