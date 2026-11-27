import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getSiteMedia, type SiteMediaRow } from '../../api/siteAdmin';

export function errorText(error: unknown, fallback = 'تعذر تنفيذ العملية.') {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('، ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export function useMediaList() {
  const [media, setMedia] = useState<SiteMediaRow[]>([]);
  const reload = useCallback(() => getSiteMedia().then(setMedia).catch(() => undefined), []);
  useEffect(() => { void reload(); }, [reload]);
  return { media, images: media.filter((item) => item.mimeType.startsWith('image/')), reload };
}

