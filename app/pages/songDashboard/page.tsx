"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Suspense } from "react";

type Song = {
  id: string;
  title: string;
  status: string;
  project: {
    id: string;
    title: string;
    band_id: string;
  };
};

function SongDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bandId = searchParams.get("bandId");
  const songId = searchParams.get("songId");

  const [song, setSong] = useState<Song | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/pages/auth/login");
      return;
    }

    if (!songId) return;

    async function loadSong() {
      const response = await fetch(`/api/songs/${songId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSong(await response.json());
      }
    }

    void loadSong();
  }, [router, songId]);

  const backHref = song
    ? `/pages/projectDetails/${song.project.id}`
    : bandId
      ? `/pages/bandProfile?id=${bandId}`
      : "/pages/userProfile";
  return (
    <>
      <section className="mx-auto  my-auto px-4 sm:px-6 w-full max-w-2xl md:max-w-4xl lg:max-w-5xl overflow-hidden border border-neutral-700 from-neutral-950 to-neutral-900 bg-linear-to-t shadow-2xl p-24 ">
        <div className="flex w-max justify-center mx-auto mt-2 mb-24 bg-[#f3e7b6] text-neutral-950 px-8 sm:px-10 py-3 font-black shadow-[0_8px_25px_rgba(0,0,0,0.45)] -rotate-3 [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]">
          <Link href="/">
            <span className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight hover:opacity-90 transition font-[family-name:var(--font-marker)]">
              Vardo
            </span>
          </Link>
        </div>
        <h1 className="text-center  md:text-4xl font-bold tracking-tight text-yellow-100  px-4 py-2 rounded-full">
          {song ? song.title : "What's to come?"}
        </h1>

        {song && (
          <p className="mt-2 text-center text-xs md:text-sm uppercase tracking-wide text-neutral-400">
            {song.status === "finished" ? "Finished" : "Work in progress"}
          </p>
        )}
        <div className="mb-2 mt-12 flex flex-wrap w-full items-center justify-center gap-3">
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Song Dashboard
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Upload track
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Create tasks
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Comment
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Files
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Notes
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Collaborators
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Song info
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Lyrics
          </h3>
          <h3 className="text-center text-xs md:text-base lg:text-lg font-bold tracking-tight text-yellow-100 border border-yellow-100 px-4 py-2 rounded-md">
            Version control
          </h3>
        </div>
        <div className="mb-2 mt-12 flex flex-wrap px-6 items-center justify-center gap-3">
          <p className="text-center text-sm md:text-base lg:text-lg ">
            The song dashboard is where you can upload your song, create tasks,
            comment on the song, pause the song and place a comment and more.
          </p>
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            href={backHref}
            className="mt-12
      inline-flex items-center gap-2
      rounded-full
      border border-yellow-100
      px-6 py-3
      text-sm md:text-base lg:text-lg
      font-bold tracking-tight
      text-black!
      bg-yellow-50

      transition
      hover:border-yellow-200
      hover:bg-yellow-200
      hover:!text-black
      hover:cursor-pointer
    "
          >
            ← Go back
          </Link>
        </div>
      </section>
    </>
  );
}

export default function SongDashboard() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SongDashboardPageContent />
    </Suspense>
  );
}
