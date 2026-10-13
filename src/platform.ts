import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { native } from './storage';

type Platform = 'windows' | 'macos' | 'other' | 'browser' | 'unknown';
let pending: Promise<Platform> | undefined;
export function useDesktopPlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>(native ? 'unknown' : 'browser');
  useEffect(() => {
    if (!native) return;
    let alive = true;
    pending ??= invoke<Platform>('desktop_platform').catch(() => 'other' as const);
    void pending.then((value) => {
      if (alive) setPlatform(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  return platform;
}
