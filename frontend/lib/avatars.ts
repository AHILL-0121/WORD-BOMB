// Preset character avatars for players

export const AVATARS = [
  { id: 'robot', emoji: '🤖', name: 'Robot' },
  { id: 'alien', emoji: '👽', name: 'Alien' },
  { id: 'ninja', emoji: '🥷', name: 'Ninja' },
  { id: 'wizard', emoji: '🧙', name: 'Wizard' },
  { id: 'pirate', emoji: '🏴‍☠️', name: 'Pirate' },
  { id: 'astronaut', emoji: '👨‍🚀', name: 'Astronaut' },
  { id: 'detective', emoji: '🕵️', name: 'Detective' },
  { id: 'superhero', emoji: '🦸', name: 'Superhero' },
  { id: 'vampire', emoji: '🧛', name: 'Vampire' },
  { id: 'zombie', emoji: '🧟', name: 'Zombie' },
  { id: 'ghost', emoji: '👻', name: 'Ghost' },
  { id: 'dragon', emoji: '🐉', name: 'Dragon' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
  { id: 'lion', emoji: '🦁', name: 'Lion' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'fox', emoji: '🦊', name: 'Fox' },
] as const;

export type AvatarId = typeof AVATARS[number]['id'];

export function getAvatar(id: AvatarId) {
  return AVATARS.find(a => a.id === id) || AVATARS[0];
}

export function getRandomAvatar(): AvatarId {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
}
