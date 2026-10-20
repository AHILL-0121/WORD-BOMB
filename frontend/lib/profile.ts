// The player's chosen name and token, remembered on this device so invite
// links and return visits skip the setup step. Purely a convenience: every
// read tolerates blocked or empty storage.

import { AVATARS, isAvatarId, type AvatarId } from "@/lib/avatars";
import { MAX_NAME_LENGTH } from "@/lib/game-logic";

const KEY = "wordbomb_profile";

export interface Profile {
  name: string;
  avatar: AvatarId;
}

export function loadProfile(): Profile | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (!raw || typeof raw.name !== "string") return null;
    return {
      name: raw.name.slice(0, MAX_NAME_LENGTH),
      avatar: isAvatarId(raw.avatar) ? raw.avatar : AVATARS[0].id,
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Not remembered; nothing else depends on it.
  }
}

/** The URL that drops a player straight into a room. */
export function roomHref(code: string, profile: Profile, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ name: profile.name, avatar: profile.avatar, ...extra });
  return `/room/${code}?${params.toString()}`;
}
