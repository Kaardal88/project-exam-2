"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Band = {
  id: string;
  band_name: string;
  bio?: string;
  image_url?: string | null;
};

export default function BandPublicDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [band, setBand] = useState<Band | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadBandDetails() {
      try {
        const response = await fetch(`/api/bands/public/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load band details");
        }

        setBand(data);
      } catch {
        setError("Could not load band details");
      } finally {
        setLoading(false);
      }
    }

    loadBandDetails();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!band) return <p>Band not found</p>;

  return (
    <main className="min-h-screen bg-neutral-950 text-yellow-100 p-8">
      <h1>{band.band_name}&apos;s Public Details</h1>
      <p>{band.bio || "No bio yet."}</p>
    </main>
  );
}
