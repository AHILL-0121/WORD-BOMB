"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GameRoom } from "@/components/GameRoom";
import { isValidRoomCode } from "@/lib/syllables";
import { getAvatar } from "@/lib/avatars";
import { loadProfile, type Profile } from "@/lib/profile";

function RoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = (params.roomId as string)?.toUpperCase() ?? "";

  // PartyKit creates a room for any id it is given, so without this check a
  // mistyped code silently dropped the player into a brand new empty room
  // rather than telling them the code was wrong.
  if (!isValidRoomCode(roomId)) notFound();

  // Name and token come from the URL, or from this device's saved profile. A
  // bare invite link with neither goes to the home screen with the code filled
  // in, rather than joining as "Anonymous".
  const [profile, setProfile] = useState<Profile | null>(null);
  const urlName = searchParams.get("name");
  useEffect(() => {
    if (urlName) {
      setProfile({ name: urlName, avatar: getAvatar(searchParams.get("avatar") ?? undefined).id });
      return;
    }
    const saved = loadProfile();
    if (saved?.name) setProfile(saved);
    else router.replace(`/?join=${roomId}`);
  }, [urlName, searchParams, roomId, router]);

  if (!profile) return <main className="center-page" aria-busy="true" />;

  return (
    <GameRoom
      roomId={roomId}
      playerName={profile.name}
      avatar={profile.avatar}
      solo={searchParams.get("solo") === "1"}
    />
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<main className="center-page" aria-busy="true" />}>
      <RoomContent />
    </Suspense>
  );
}
