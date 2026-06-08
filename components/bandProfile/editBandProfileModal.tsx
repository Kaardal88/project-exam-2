"use client";

type EditBandProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;

  bandName: string;
  setBandName: (value: string) => void;

  bio: string;
  setBio: (value: string) => void;

  imageUrl: string;
  setImageUrl: (value: string) => void;

  headerImageUrl: string;
  setHeaderImageUrl: (value: string) => void;
};

export function EditBandProfileModal({
  isOpen,
  onClose,
  onSave,
  bandName,
  setBandName,
  bio,
  setBio,
  imageUrl,
  setImageUrl,
  headerImageUrl,
  setHeaderImageUrl,
}: EditBandProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-neutral-700 bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-xl font-bold text-yellow-100">Edit profile</h2>

          <button
            onClick={onClose}
            className="text-neutral-400 transition hover:text-yellow-100"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSave} className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Band name
            </label>

            <input
              type="text"
              value={bandName}
              onChange={(e) => setBandName(e.target.value)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Bio
            </label>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Image URL
            </label>

            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Header image URL
            </label>

            <input
              type="text"
              value={headerImageUrl}
              onChange={(e) => setHeaderImageUrl(e.target.value)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="border border-yellow-200 bg-yellow-100 px-4 py-2 text-sm font-bold text-neutral-950 transition hover:bg-yellow-200"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
