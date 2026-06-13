import { Link, LinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { prefetchRoute } from "@/lib/routePrefetch";

interface PrefetchLinkProps extends LinkProps {
  prefetch?: boolean;
}

/**
 * A Link component that prefetches the target route on hover/focus
 * Use this for regular links that should trigger prefetching
 */
const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, prefetch = true, onMouseEnter, onFocus, ...props }, ref) => {
    const toPath = typeof to === "string" ? to : to.pathname || "";

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (prefetch && toPath) {
          prefetchRoute(toPath);
        }
        onMouseEnter?.(e);
      },
      [prefetch, toPath, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        if (prefetch && toPath) {
          prefetchRoute(toPath);
        }
        onFocus?.(e);
      },
      [prefetch, toPath, onFocus]
    );

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);

PrefetchLink.displayName = "PrefetchLink";

export { PrefetchLink };
