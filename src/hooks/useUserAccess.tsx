import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "@/convex/_generated/api";

/**
 * Custom hook to determine if the current user has Pro access.
 * It fetches the user's data from Convex using their Clerk ID.
 */
export function useUserAccess() {
  const { user } = useUser(); // Get logged-in user from Clerk

  // Fetch user data from Convex if user is logged in
  const userData = useQuery(api.users.getUser, user ? { userId: user.id } : "skip");

  return {
    isLoading: !user || userData === undefined,
    isPro: userData?.isPro || false,
  };
}
