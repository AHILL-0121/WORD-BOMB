// Player tokens: a monogram on a coloured disc or square.
//
// These replaced the emoji avatars. A token is six inks times two shapes; the
// letter comes from the player's name, so it is never stored here.

const INKS = [
  { key: "ember", color: "#ff4d1c", name: "Ember" },
  { key: "amber", color: "#f5b700", name: "Amber" },
  { key: "paper", color: "#f3ead7", name: "Paper" },
  { key: "sage", color: "#8fb996", name: "Sage" },
  { key: "steel", color: "#7aa6c2", name: "Steel" },
  { key: "rose", color: "#e98a7a", name: "Rose" },
] as const;

const SHAPES = [
  { key: "disc", name: "disc" },
  { key: "square", name: "square" },
] as const;

type Ink = (typeof INKS)[number]["key"];
type Shape = (typeof SHAPES)[number]["key"];

export type AvatarId = `${Ink}-${Shape}`;
export type AvatarShape = Shape;

export interface Avatar {
  id: AvatarId;
  color: string;
  shape: AvatarShape;
  name: string;
}

export const AVATARS: readonly Avatar[] = SHAPES.flatMap((shape) =>
  INKS.map((ink) => ({
    id: `${ink.key}-${shape.key}` as AvatarId,
    color: ink.color,
    shape: shape.key,
    name: `${ink.name} ${shape.name}`,
  }))
);

const BY_ID = new Map<string, Avatar>(AVATARS.map((a) => [a.id, a]));

export function isAvatarId(id: unknown): id is AvatarId {
  return typeof id === "string" && BY_ID.has(id);
}

export function getAvatar(id: AvatarId | string | undefined): Avatar {
  return (id && BY_ID.get(id)) || AVATARS[0];
}

/**
 * Returns an avatar *id*, not the avatar object.
 *
 * Named for what it returns: the previous `getRandomAvatar()` also returned an
 * id, and the server called `getRandomAvatar().id` on it, which evaluated to
 * `undefined` and left every AI player without an avatar.
 */
export function getRandomAvatarId(): AvatarId {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}

/** The letter shown on a player's token. */
export function monogram(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toUpperCase() : "?";
}
