export const SOCIAL_PROVIDERS = ["google", "apple"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export function isSocialProvider(value: string): value is SocialProvider {
  return (SOCIAL_PROVIDERS as readonly string[]).includes(value);
}
