import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePrefetch";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  prefetch?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, prefetch = true, ...props }, ref) => {
    const toPath = typeof to === "string" ? to : to.pathname || "";

    const handleMouseEnter = useCallback(() => {
      if (prefetch && toPath) {
        prefetchRoute(toPath);
      }
    }, [prefetch, toPath]);

    const handleFocus = useCallback(() => {
      if (prefetch && toPath) {
        prefetchRoute(toPath);
      }
    }, [prefetch, toPath]);

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
