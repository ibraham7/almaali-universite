import { Box, MenuItem, TextField } from '@mui/material';
import type { SiteMediaRow } from '../../api/siteAdmin';
import { siteMediaUrl } from '../../api/site';

// اختيار صورة من مكتبة الوسائط (الصور غير المؤرشفة فقط).
export function ImagePicker({ label, value, onChange, images, helperText }: { label: string; value: string | null; onChange: (id: string | null) => void; images: SiteMediaRow[]; helperText?: string }) {
  return (
    <Box>
      <TextField select fullWidth size="small" label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value || null)} helperText={helperText ?? 'ارفع الصور من تبويب «الوسائط» أولاً.'}>
        <MenuItem value="">بدون صورة</MenuItem>
        {images.map((item) => <MenuItem key={item.id} value={item.id}>{item.altText ? `${item.altText} — ` : ''}{item.fileName}</MenuItem>)}
      </TextField>
      {value && <Box component="img" src={siteMediaUrl(value)} alt="" sx={{ mt: 1, maxHeight: 90, maxWidth: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />}
    </Box>
  );
}
