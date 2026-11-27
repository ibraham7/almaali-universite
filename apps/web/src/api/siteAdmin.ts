import { apiClient } from './client';

export type SiteStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export const SITE_STATUS_LABEL: Record<SiteStatus, string> = { DRAFT: 'مسودة', PUBLISHED: 'منشور', ARCHIVED: 'مؤرشف' };
export type SiteItemKind = 'STAT' | 'VALUE' | 'GOAL' | 'MILESTONE' | 'ADMISSION_STEP' | 'FAQ';
export const SITE_KIND_LABEL: Record<SiteItemKind, string> = {
  STAT: 'أرقام الجامعة', VALUE: 'القيم', GOAL: 'الأهداف', MILESTONE: 'نشأة الجامعة وتطورها (مراحل)', ADMISSION_STEP: 'خطوات التقديم', FAQ: 'الأسئلة الشائعة',
};
// ما يعنيه «الحقل الإضافي» لكل نوع
export const SITE_KIND_EXTRA: Partial<Record<SiteItemKind, string>> = { STAT: 'القيمة (مثل 12)', MILESTONE: 'السنة' };

export interface SettingDef { key: string; group: 'home' | 'about' | 'admission' | 'contact'; label: string; max: number; multiline?: boolean; kind?: 'text' | 'url' | 'media' }
export interface SiteItemRow { id: string; kind: SiteItemKind; title: string; text: string; extra: string | null; sortOrder: number; status: SiteStatus }
export interface SiteNewsRow { id: string; type: 'NEWS' | 'ANNOUNCEMENT'; title: string; summary: string; body: string; coverMediaId: string | null; publishedAt: string | null; status: SiteStatus; createdAt: string }
export interface SiteTestimonialRow { id: string; text: string; name: string; role: string; sortOrder: number; status: SiteStatus }
export interface SiteMediaRow { id: string; fileName: string; mimeType: string; sizeBytes: number; altText: string | null; isArchived: boolean; createdAt: string }
export interface SiteMessageRow { id: string; name: string; contact: string; subject: string; message: string; status: 'NEW' | 'READ' | 'ARCHIVED'; createdAt: string; handledAt: string | null }
export interface ProfileFields { summary: string; mediaId: string | null; sortOrder: number; isVisible: boolean; saved: boolean }
export interface AcademicNode extends ProfileFields {
  id: string; nameAr: string; departments?: AcademicNode[]; programs?: AcademicNode[];
}

const get = async <T>(url: string, params?: object) => (await apiClient.get<T>(url, { params })).data;
const post = async <T>(url: string, body?: object) => (await apiClient.post<T>(url, body)).data;
const patch = async <T>(url: string, body: object) => (await apiClient.patch<T>(url, body)).data;
const put = async <T>(url: string, body: object) => (await apiClient.put<T>(url, body)).data;

export const getSiteSettings = () => get<{ defs: SettingDef[]; values: Record<string, string> }>('/site-admin/settings');
export const saveSiteSettings = (values: Record<string, string>) => put<{ updated: number }>('/site-admin/settings', { values });

export const getSiteItems = () => get<SiteItemRow[]>('/site-admin/items');
export const createSiteItem = (body: { kind: SiteItemKind; title: string; text?: string; extra?: string; sortOrder?: number }) => post<SiteItemRow>('/site-admin/items', body);
export const updateSiteItem = (id: string, body: { title?: string; text?: string; extra?: string; sortOrder?: number }) => patch<SiteItemRow>(`/site-admin/items/${id}`, body);
export const setSiteItemStatus = (id: string, status: SiteStatus) => post<SiteItemRow>(`/site-admin/items/${id}/status`, { status });

export const getSiteNewsAdmin = () => get<SiteNewsRow[]>('/site-admin/news');
export const createSiteNews = (body: { type: string; title: string; summary?: string; body?: string; coverMediaId?: string | null }) => post<SiteNewsRow>('/site-admin/news', body);
export const updateSiteNews = (id: string, body: { type?: string; title?: string; summary?: string; body?: string; coverMediaId?: string | null }) => patch<SiteNewsRow>(`/site-admin/news/${id}`, body);
export const setSiteNewsStatus = (id: string, status: SiteStatus) => post<SiteNewsRow>(`/site-admin/news/${id}/status`, { status });

export const getSiteTestimonials = () => get<SiteTestimonialRow[]>('/site-admin/testimonials');
export const createSiteTestimonial = (body: { text: string; name: string; role?: string; sortOrder?: number }) => post<SiteTestimonialRow>('/site-admin/testimonials', body);
export const updateSiteTestimonial = (id: string, body: { text?: string; name?: string; role?: string; sortOrder?: number }) => patch<SiteTestimonialRow>(`/site-admin/testimonials/${id}`, body);
export const setSiteTestimonialStatus = (id: string, status: SiteStatus) => post<SiteTestimonialRow>(`/site-admin/testimonials/${id}/status`, { status });

export const getSiteAcademic = () => get<AcademicNode[]>('/site-admin/academic');
export const saveSiteProfile = (kind: 'COLLEGE' | 'DEPARTMENT' | 'PROGRAM', refId: string, body: { summary?: string; mediaId?: string | null; sortOrder?: number; isVisible?: boolean }) => put(`/site-admin/academic/${kind}/${refId}`, body);

export const getSiteMedia = (archived = false) => get<SiteMediaRow[]>('/site-admin/media', archived ? { archived: 1 } : undefined);
export async function uploadSiteMedia(file: File, altText: string) {
  const form = new FormData();
  form.append('file', file);
  if (altText.trim()) form.append('altText', altText.trim());
  return (await apiClient.post<SiteMediaRow>('/site-admin/media', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
}
export const updateSiteMedia = (id: string, altText: string) => patch(`/site-admin/media/${id}`, { altText });
export const archiveSiteMedia = (id: string) => post(`/site-admin/media/${id}/archive`);
export const restoreSiteMedia = (id: string) => post(`/site-admin/media/${id}/restore`);

export const getSiteMessages = () => get<SiteMessageRow[]>('/site-admin/messages');
export const setSiteMessageStatus = (id: string, status: 'NEW' | 'READ' | 'ARCHIVED') => post(`/site-admin/messages/${id}/status`, { status });
