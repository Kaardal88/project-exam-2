/** Shapes the studio reads back from the stems API. */

export type Uploader = {
  id: string;
  username: string;
  image_url: string | null;
} | null;

export type Stem = {
  id: string;
  song_id: string;
  name: string;
  kind: string;
  color: string | null;
  sort_order: number;
};

export type Take = {
  id: string;
  stem_id: string;
  label: string;
  note: string | null;
  format: string;
  duration_seconds: number | null;
  created_at: string | null;
  uploader?: Uploader;
};

/** One slot as it stands in a version: the lane, its audio, and a signed URL. */
export type VersionStem = {
  stem: Stem;
  take: Take;
  url: string;
};

export type Version = {
  id: string;
  version_number: number;
  label: string;
  note: string | null;
  locked_at: string | null;
  created_at: string | null;
  is_current: boolean;
  stem_count?: number;
  creator?: Uploader;
  locker?: Uploader;
};

export type VersionDetail = Version & { stems: VersionStem[] };
