import { redirect } from "next/navigation";

/**
 * The board used to live here, as a page of its own.
 *
 * It is a section of the band profile now -- see components/board/Board.tsx
 * for why. The route stays so that an address somebody already sent to the
 * rest of the band still lands on the board rather than on a 404.
 */
export default async function BandBoardRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  redirect(`/band/${slug}?tab=Board`);
}
