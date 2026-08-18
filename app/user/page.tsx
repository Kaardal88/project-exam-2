import { UserProfileView } from "@/components/userProfile/UserProfileView";

/**
 * The signed-in user's own profile. No identifier in the URL on purpose --
 * this is the standard "me" address, resolved from the token rather than
 * from the path, so it stays valid if the user changes their handle.
 */
export default function OwnProfilePage() {
  return <UserProfileView />;
}
