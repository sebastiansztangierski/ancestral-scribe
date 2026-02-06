// Pre-set fantasy portrait library using Unsplash
export const MALE_PORTRAITS = [
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1480429370612-2c8f8bf8c776?w=200&h=200&fit=crop&crop=face",
];

export const FEMALE_PORTRAITS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face",
];

export const UNKNOWN_PORTRAIT = "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=200&h=200&fit=crop&blur=50";

export const HOUSE_CRESTS = [
  "🦁", "🐺", "🦅", "🐉", "🦌", "🐻", "🦈", "🐍", "🦂", "🦇"
];

export const getRandomPortrait = (gender, usedPortraits = []) => {
  const portraits = gender === 'male' ? MALE_PORTRAITS : FEMALE_PORTRAITS;
  const available = portraits.filter(p => !usedPortraits.includes(p));
  if (available.length === 0) {
    return portraits[Math.floor(Math.random() * portraits.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
};