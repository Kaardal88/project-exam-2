import { ProfileSection } from "@/components/bandProfile/ProfileSection";

type Band = {
  bio?: string | null;
  band_name: string;
};

type BioProps = {
  band: Band | null;
};

export function Bio({ band }: BioProps) {
  return (
    <ProfileSection title="Bio">
      <p className="text-sm text-neutral-300">{band?.bio || "No bio yet."}</p>
    </ProfileSection>
  );
}
