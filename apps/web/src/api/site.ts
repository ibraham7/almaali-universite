import { useEffect, useState } from 'react';
import { apiClient } from './client';

// المحتوى العام للموقع التعريفي (كله من لوحة الموقع). ما لا بيانات له لا يُرجَع، فتختفي أقسامه من الصفحات.
export interface SiteItem { title: string; text: string; extra: string | null }
export interface OrgNode { name: string; role: string; children: OrgNode[] }
export interface SiteNewsCard { id: string; type: 'NEWS' | 'ANNOUNCEMENT'; category?: string; title: string; summary: string; coverMediaId: string | null; publishedAt: string | null }
export type EntryKind = 'EVENT' | 'RESEARCH' | 'GRADUATE_STORY' | 'GRADUATE_NEWS' | 'CAMPUS';
export interface SiteEntryCard { id: string; kind: EntryKind; category: string; title: string; summary: string; location: string; startsAt: string | null; endsAt: string | null; coverMediaId: string | null; publishedAt: string | null; imageCount: number; videoCount: number }
export interface SiteEntryFull { id: string; kind: EntryKind; category: string; title: string; summary: string; location: string; startsAt: string | null; endsAt: string | null; coverMediaId: string | null; publishedAt: string | null; body: string; galleryIds: string[]; videos: string[] }
export interface SiteCollege {
  id: string; nameAr: string; summary: string; details: string; mediaId: string | null;
  departments: Array<{ nameAr: string; summary: string; programs: Array<{ nameAr: string; summary: string }> }>;
}
export interface SiteContent {
  settings: Record<string, string>;
  stats: SiteItem[]; values: SiteItem[]; goals: SiteItem[]; milestones: SiteItem[]; admissionSteps: SiteItem[]; faq: SiteItem[];
  colleges: SiteCollege[];
  testimonials: Array<{ text: string; name: string; role: string }>;
  latestNews: SiteNewsCard[];
  latestAnnouncements: SiteNewsCard[];
  newsCategories: string[];
  entryCounts: Partial<Record<EntryKind, number>>;
  upcomingEvents: SiteEntryCard[];
  orgTree: OrgNode[];
  quickLinks: SiteItem[];
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const siteMediaUrl = (id?: string | null) => (id ? `${API_URL}/site/media/${id}` : undefined);

let cache: Promise<SiteContent> | null = null;
// نحمّل المحتوى مرة واحدة لكل زيارة (الهيدر والصفحة يشتركان به). عند الفشل نسمح بإعادة المحاولة.
export function loadSiteContent() {
  cache ??= apiClient.get<SiteContent>('/site/content').then((response) => response.data).catch((error) => { cache = null; throw error; });
  return cache;
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadSiteContent().then((data) => { if (active) setContent(data); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  return { content, failed, loading: !content && !failed };
}

export async function getSiteNews(page: number, type?: 'NEWS' | 'ANNOUNCEMENT', q?: string, category?: string) {
  const { data } = await apiClient.get<{ total: number; page: number; pageSize: number; items: SiteNewsCard[] }>('/site/news', { params: { page, type, q: q?.trim() || undefined, category: category || undefined } });
  return data;
}

export async function getSiteNewsItem(id: string) {
  const { data } = await apiClient.get<SiteNewsCard & { body: string }>(`/site/news/${id}`);
  return data;
}

export async function sendSiteMessage(input: { name: string; contact: string; subject?: string; message: string; website?: string }) {
  const { data } = await apiClient.post<{ ok: boolean }>('/site/contact', input);
  return data;
}

export async function getSiteEntries(kind: EntryKind, page: number, opts: { when?: 'upcoming' | 'past'; category?: string; q?: string } = {}) {
  const { data } = await apiClient.get<{ total: number; page: number; pageSize: number; items: SiteEntryCard[]; categories: string[] }>(`/site/entries/${kind}`, { params: { page, when: opts.when, category: opts.category || undefined, q: opts.q?.trim() || undefined } });
  return data;
}

export async function getSiteEntry(id: string) {
  const { data } = await apiClient.get<SiteEntryFull>(`/site/entry/${id}`);
  return data;
}

export async function sendGraduateUpdate(input: { name: string; contact: string; graduationYear?: string; program?: string; workplace?: string; message?: string; website?: string }) {
  const { data } = await apiClient.post<{ ok: boolean }>('/site/graduates/update', input);
  return data;
}
