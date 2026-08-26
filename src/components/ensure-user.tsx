"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Clerk owns identity; Convex needs a `users` row to hang data off. This
 * mirrors one across on first authenticated render. It's idempotent, so
 * running on every mount is fine.
 */
export function EnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);

  useEffect(() => {
    if (isAuthenticated) void store();
  }, [isAuthenticated, store]);

  return null;
}
