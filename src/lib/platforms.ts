export interface PlatformInfo {
  name: string;
  icon: string; // SVG path or emoji-free identifier
  note?: string;
}

const PLATFORMS: Array<{ name: string; hosts: string[]; icon: string; note?: string }> = [
  { name: 'Facebook', hosts: ['facebook.com', 'www.facebook.com', 'fb.com', 'm.facebook.com'], icon: 'facebook' },
  { name: 'X', hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'], icon: 'x' },
  { name: 'Instagram', hosts: ['instagram.com', 'www.instagram.com'], icon: 'instagram' },
  { name: 'TikTok', hosts: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'], icon: 'tiktok' },
  { name: 'YouTube', hosts: ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'], icon: 'youtube' },
  { name: 'LinkedIn', hosts: ['linkedin.com', 'www.linkedin.com'], icon: 'linkedin' },
  { name: 'WhatsApp', hosts: ['wa.me', 'web.whatsapp.com'], icon: 'whatsapp', note: 'Opens the app on scan.' },
  { name: 'Telegram', hosts: ['t.me', 'telegram.me'], icon: 'telegram', note: 'Opens the app on scan.' },
  { name: 'GitHub', hosts: ['github.com', 'www.github.com'], icon: 'github' },
  { name: 'Claude', hosts: ['claude.ai', 'www.claude.ai'], icon: 'claude' },
  { name: 'Reddit', hosts: ['reddit.com', 'www.reddit.com', 'old.reddit.com'], icon: 'reddit' },
  { name: 'Spotify', hosts: ['spotify.com', 'open.spotify.com', 'www.spotify.com'], icon: 'spotify' },
  { name: 'Google Maps', hosts: ['maps.google.com', 'maps.app.goo.gl', 'goo.gl/maps'], icon: 'maps' },
];

export function classifyPlatform(url: string): PlatformInfo {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    for (const platform of PLATFORMS) {
      if (platform.hosts.includes(host)) {
        return { name: platform.name, icon: platform.icon, note: platform.note };
      }
    }
  } catch {
    // ignore
  }

  return { name: 'Generic', icon: 'link' };
}
