import { Box, Typography } from '@mui/material';

// Plain bars and columns (no chart library): every bar also shows its number, so nothing depends on color or hover.
export function BarList({ rows, color = 'primary.main', onSelect }: {
  rows: { key: string; label: string; value: number }[]; color?: string; onSelect?: (key: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {rows.map((r) => (
        <Box component="li" key={r.key}>
          <Box
            component={onSelect ? 'button' : 'div'} type={onSelect ? 'button' : undefined} onClick={onSelect ? () => onSelect(r.key) : undefined}
            aria-label={`${r.label}: ${r.value}`}
            sx={{ all: 'unset', display: 'grid', gridTemplateColumns: { xs: '110px 1fr 40px', sm: '170px 1fr 48px' }, gap: 1, alignItems: 'center', width: '100%', cursor: onSelect ? 'pointer' : 'default', borderRadius: 1, '&:hover': onSelect ? { bgcolor: 'action.hover' } : undefined, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}
          >
            <Typography variant="body2" noWrap title={r.label}>{r.label}</Typography>
            <Box sx={{ height: 14, bgcolor: 'action.hover', borderRadius: 0.5, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${(r.value / max) * 100}%`, bgcolor: color, minWidth: r.value > 0 ? 3 : 0 }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'end' }}>{r.value}</Typography>
          </Box>
        </Box>
      ))}
      {rows.length === 0 && <Typography variant="body2" color="text.secondary">لا توجد بيانات في هذه الفترة.</Typography>}
    </Box>
  );
}

export function ColumnSeries({ points, label }: { points: { date: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  const width = Math.max(320, points.length * 28);
  const height = 140;
  const slot = width / Math.max(points.length, 1);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box component="svg" viewBox={`0 0 ${width} ${height + 34}`} role="img" aria-label={label} sx={{ width, maxWidth: 'none', height: height + 34, display: 'block' }}>
        <line x1="0" y1={height} x2={width} y2={height} stroke="currentColor" strokeOpacity="0.3" />
        {points.map((p, i) => {
          const h = (p.count / max) * (height - 18);
          const x = i * slot + slot * 0.18;
          return (
            <g key={p.date}>
              <rect x={x} y={height - h} width={slot * 0.64} height={h} rx="2" fill="currentColor" fillOpacity="0.75"><title>{`${p.date}: ${p.count}`}</title></rect>
              <text x={x + slot * 0.32} y={height - h - 4} textAnchor="middle" fontSize="11" fill="currentColor">{p.count}</text>
              <text x={x + slot * 0.32} y={height + 14} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.7">{p.date.slice(points.length > 31 || p.date.length === 7 ? 0 : 5)}</text>
            </g>
          );
        })}
      </Box>
    </Box>
  );
}
