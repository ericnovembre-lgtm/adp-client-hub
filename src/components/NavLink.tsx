import { Link, useLocation } from "wouter";
import { forwardRef, AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  className?: string;
  activeClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, to, ...props }, ref) => {
    const [location] = useLocation();
    const isActive = location === to || (to !== "/" && location.startsWith(to));

    return (
      <Link
        ref={ref}
        to={to}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };
