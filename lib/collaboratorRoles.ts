/**
 * What someone is doing on a project they are not a band member of.
 *
 * Shared client/server following the lib/bandRoles.ts pattern.
 *
 * These are **labels, not permissions.** A collaborator currently has the same
 * rights as a band member inside a project, deliberately: a session musician
 * who cannot upload their take is useless, and it is easier to narrow rights
 * once real guests have used it than to guess now. The role drives display and
 * grouping, so when a restriction is wanted -- a guest not replacing the main
 * audio file, say -- it hangs off this value in one place.
 *
 * Kept separate from lib/userTags.ts on purpose. A tag is self-declared global
 * identity ("I am a drummer"); this is the capacity someone serves in on one
 * specific project. The same person can be a session musician on one and a
 * manager on another, and editing your own profile must never change your role
 * on someone else's project. Tags are used only to pre-select a sensible
 * default in the invite UI.
 */
export const collaboratorRoles = [
  {
    value: "guest_musician",
    label: "Guest musician",
    icon: "🎸",
    description: "Playing or singing on this project.",
    /** user tags that make this the obvious default when inviting */
    suggestedForTags: ["drummer", "singer", "guitarist"],
  },
  {
    value: "producer",
    label: "Producer",
    icon: "🎛️",
    description: "Producing this project.",
    suggestedForTags: ["producer"],
  },
  {
    value: "engineer",
    label: "Engineer",
    icon: "🎚️",
    description: "Recording, mixing or mastering this project.",
    suggestedForTags: ["mixing-engineer", "mastering-engineer"],
  },
  {
    value: "manager",
    label: "Manager",
    icon: "📋",
    description: "Handling the business side of this project.",
    suggestedForTags: ["manager"],
  },
] as const;

export type CollaboratorRoleOption = (typeof collaboratorRoles)[number];

export type CollaboratorRole = CollaboratorRoleOption["value"];

export const collaboratorRoleValues = collaboratorRoles.map(
  (role) => role.value,
) as CollaboratorRole[];

export const DEFAULT_COLLABORATOR_ROLE: CollaboratorRole = "guest_musician";

export function isCollaboratorRole(value: unknown): value is CollaboratorRole {
  return (
    typeof value === "string" &&
    (collaboratorRoleValues as string[]).includes(value)
  );
}

export function collaboratorRoleLabel(value: string): string {
  return (
    collaboratorRoles.find((role) => role.value === value)?.label ?? value
  );
}

/**
 * A starting point for the invite form, based on what the person says they do.
 * Only a suggestion -- the inviter picks the final answer.
 */
export function suggestedRoleForTags(
  tags: string[] | null | undefined,
): CollaboratorRole {
  if (!tags?.length) return DEFAULT_COLLABORATOR_ROLE;

  const match = collaboratorRoles.find((role) =>
    role.suggestedForTags.some((tag) => tags.includes(tag)),
  );

  return match?.value ?? DEFAULT_COLLABORATOR_ROLE;
}
