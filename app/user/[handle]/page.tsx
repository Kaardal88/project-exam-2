"use client";

import { useParams } from "next/navigation";
import { UserProfileView } from "@/components/userProfile/UserProfileView";

/**
 * Someone else's profile, addressed by handle. The route also resolves a UUID,
 * so links made before handles existed keep working.
 */
export default function UserProfilePage() {
  const params = useParams<{ handle: string }>();

  return <UserProfileView profileIdentifier={params.handle} />;
}
