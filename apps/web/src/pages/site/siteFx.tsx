import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, GlobalStyles, IconButton, Stack, Typography } from '@mui/material';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import { T, calm, pageIn, ringPulse, wordIn } from './siteStyles';

// الحركات: CSS + JavaScript عادي بلا مكتبات. نحرّك transform وopacity فقط. المحتوى يبقى ظاهرًا لو تعطّل JavaScript
// (الإخفاء الأولي لا يعمل إلا بعد أن يضيف الكود الصنف site-fx). prefers-reduced-motion يُظهر كل شيء ويعطّل الحركات.
const reducedQuery = '(prefers-reduced-motion: reduce)';
const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia(reducedQuery).matches;

const fxCss = `
:where(html.site-fx) [data-rv] { opacity: 0; transform: translateY(28px); transition: opacity .7s ${T.ease}, transform .7s ${T.ease}; transition-delay: var(--d, 0ms); }
:where(html.site-fx) [data-rv="side"] { transform: translateX(34px); }
:where(html.site-fx) [data-rv="zoom"] { transform: scale(.88); }
:where(html.site-fx) [data-rv].in { opacity: 1; transform: none; }
:where(html.site-fx) [data-rv].in.done { transition: transform .25s ease-out, box-shadow .25s ease-out, opacity .2s; transition-delay: 0ms; }
:where(html.site-fx) [data-rv-line]::after { width: 0; transition: width .8s ${T.ease} .35s; }
:where(html.site-fx) [data-rv-line].in::after { width: 70px; }
[data-tilt], [data-tilt3d], [data-magnet] { will-change: transform; }
@media (prefers-reduced-motion: reduce) {
  :where(html.site-fx) [data-rv] { opacity: 1 !important; transform: none !important; transition: none !important; }
  :where(html.site-fx) [data-rv-line]::after { width: 70px !important; transition: none !important; }
}
`;

// يربط الظهور عند التمرير (مع تتابع)، وميلان البطاقات والهيرو، والأزرار المغناطيسية، وتوهّج الهيرو. يعمل لعناصر تُرسم لاحقًا أيضًا.
export function SiteFx() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('site-fx');
    const reduced = prefersReduced();
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const timers = new Set<number>();

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        el.classList.add('in');
        // بعد انتهاء الظهور نزيل التأخير كي لا يبطّئ التفاعل مع المؤشر
        const delay = Number.parseInt(el.style.getPropertyValue('--d')) || 0;
        const timer = window.setTimeout(() => { el.classList.add('done'); timers.delete(timer); }, 900 + delay);
        timers.add(timer);
      }
    }, { threshold: 0.08 });

    const scan = (node: ParentNode) => {
      node.querySelectorAll('[data-rv], [data-rv-line]').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const html = el as HTMLElement;
        const siblings = el.parentElement ? Array.from(el.parentElement.children).filter((child) => child.hasAttribute('data-rv')) : [];
        html.style.setProperty('--d', `${(Math.max(siblings.indexOf(el), 0) % 4) * 70}ms`);
        if (reduced) { html.classList.add('in', 'done'); return; }
        io.observe(html);
      });
    };
    scan(document);
    const mutations = new MutationObserver((records) => {
      for (const record of records) record.addedNodes.forEach((added) => { if (added instanceof HTMLElement) { if (added.matches('[data-rv], [data-rv-line]')) scan(added.parentElement ?? document); scan(added); } });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    // التفاعل مع المؤشر: شاشات الماوس فقط وبلا تقليل حركة
    let tiltEl: HTMLElement | null = null;
    let magnetEl: HTMLElement | null = null;
    const reset = (el: HTMLElement | null) => { if (el) el.style.transform = ''; };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const target = event.target as Element | null;
      const hero = target?.closest<HTMLElement>('[data-hero]');
      if (hero) {
        const box = hero.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        hero.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        hero.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        hero.style.setProperty('--px', `${((x - 0.5) * -8).toFixed(2)}%`);
        hero.style.setProperty('--py', `${((y - 0.5) * -8).toFixed(2)}%`);
      }
      const card3d = target?.closest<HTMLElement>('[data-tilt3d]');
      const card = target?.closest<HTMLElement>('[data-tilt]');
      const magnet = target?.closest<HTMLElement>('[data-magnet]');
      const active = card3d ?? card;
      if (tiltEl && tiltEl !== active) { reset(tiltEl); tiltEl = null; }
      if (magnetEl && magnetEl !== magnet) { reset(magnetEl); magnetEl = null; }
      if (active) {
        const box = active.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        active.style.transform = card3d
          ? `perspective(900px) rotateY(${(x * 28).toFixed(1)}deg) rotateX(${(y * -24).toFixed(1)}deg)`
          : `perspective(900px) rotateY(${(x * 16).toFixed(1)}deg) rotateX(${(y * -16).toFixed(1)}deg) translateY(-6px)`;
        tiltEl = active;
      }
      if (magnet) {
        const box = magnet.getBoundingClientRect();
        const x = event.clientX - (box.left + box.width / 2);
        const y = event.clientY - (box.top + box.height / 2);
        magnet.style.transform = `translate(${(x * 0.15).toFixed(1)}px, ${(y * 0.25).toFixed(1)}px)`;
        magnetEl = magnet;
      }
    };
    const onLeave = () => { reset(tiltEl); reset(magnetEl); tiltEl = null; magnetEl = null; };
    if (fine && !reduced) {
      document.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    return () => {
      root.classList.remove('site-fx');
      io.disconnect();
      mutations.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return <GlobalStyles styles={fxCss} />;
}

// شريط تقدّم التمرير الذهبي (يبدأ من اليمين) + زر ↑ (يظهر بعد 600px بانزلاق وتكبير)
export function SiteChrome() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      setShowTop(window.scrollY > 600);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  return (
    <>
      <Box aria-hidden sx={{ position: 'fixed', top: 0, insetInline: 0, height: 4, zIndex: 40, pointerEvents: 'none' }}>
        <Box sx={{ height: '100%', background: T.goldGrad, transformOrigin: 'right center', transform: `scaleX(${progress})`, willChange: 'transform' }} />
      </Box>
      <IconButton
        aria-label="إلى أعلى الصفحة" tabIndex={showTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' })}
        sx={{ position: 'fixed', bottom: 20, insetInlineStart: 20, zIndex: 30, background: T.navyGrad, color: T.goldText, border: `2px solid ${T.gold}`, opacity: showTop ? 1 : 0, transform: showTop ? 'none' : 'translateY(24px) scale(.6)', pointerEvents: showTop ? 'auto' : 'none', transition: `opacity .3s, transform .35s ${T.ease}`, '&:hover': { background: T.gold, color: T.ink }, ...calm }}
      >
        <ArrowUpwardRoundedIcon />
      </IconButton>
    </>
  );
}

// انتقال بين الصفحات: المحتوى الجديد يظهر بتلاشٍ وصعود 12px، وتصعد الصفحة للأعلى.
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useLayoutEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return <Box key={pathname} sx={{ animation: `${pageIn} .5s ${T.ease} both`, ...calm }}>{children}</Box>;
}

const ARABIC = /[٠-٩]/g;
const latin = (value: string) => value.replace(ARABIC, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

// رقم يعدّ من الصفر لقيمته عند الظهور (1.6 ثانية، easeOutCubic) مع الحفاظ على الفاصلة والبادئة واللاحقة. القيمة النهائية تُكتب بدقة.
export function CountUp({ value }: { value: string }) {
  const match = /^(\D*?)(\d[\d,]*)(.*)$/.exec(latin(value.trim()));
  const target = match ? Number(match[2].replace(/,/g, '')) : NaN;
  const withComma = match ? match[2].includes(',') : false;
  const [shown, setShown] = useState<number>(() => (prefersReduced() || Number.isNaN(target) ? target : 0));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || Number.isNaN(target) || prefersReduced()) return;
    let timer = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      timer = window.setInterval(() => {
        const t = Math.min(1, (performance.now() - start) / 1600);
        setShown(t >= 1 ? target : Math.round(target * (1 - (1 - t) ** 3)));
        if (t >= 1) window.clearInterval(timer);
      }, 30);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); window.clearInterval(timer); };
  }, [target]);

  if (!match || Number.isNaN(target)) return <>{value}</>;
  const number = shown;
  return <span ref={ref} aria-label={value}>{match[1]}{withComma ? number.toLocaleString('en-US') : String(number)}{match[3]}</span>;
}

// نص مختصر يتوسع بحركة max-height مع تلاشٍ متدرج عند القص. الزر لا يظهر إن كان النص قصيرًا.
export function Expandable({ children, lines = 5 }: { children: ReactNode; lines?: number }) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<number | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const inner = useRef<HTMLDivElement>(null);
  const collapsed = `${lines * 2}em`;

  const measure = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    setFull(el.scrollHeight);
    setOverflowing(el.scrollHeight > lines * 2 * parseFloat(getComputedStyle(el).fontSize) + 8);
  }, [lines]);
  useLayoutEffect(() => { measure(); }, [measure, children]);
  useEffect(() => { window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }, [measure]);

  return (
    <Box>
      <Box
        ref={inner} id="expandable-text"
        sx={{ position: 'relative', overflow: 'hidden', lineHeight: 2, maxHeight: !overflowing || open ? (full ? `${full}px` : 'none') : collapsed, transition: `max-height .6s ${T.ease}`, ...calm, ...(overflowing && !open ? { '&::after': { content: '""', position: 'absolute', insetInline: 0, bottom: 0, height: '3em', background: 'linear-gradient(to bottom, rgba(255,255,255,0), #fff)', pointerEvents: 'none' } } : {}) }}
      >{children}</Box>
      {overflowing && <Button aria-expanded={open} aria-controls="expandable-text" onClick={() => setOpen(!open)} sx={{ mt: 1, px: 0, fontWeight: 700, color: T.goldDark }}>{open ? 'عرض أقل ↑' : 'قراءة المزيد ↓'}</Button>}
    </Box>
  );
}

interface Testimonial { text: string; name: string; role: string }

// سلايدر بؤري للشهادات: الفعّالة بالمنتصف وعلى جانبيها شهادتان مصغّرتان باهتتان (3D). النص يظهر كلمة كلمة، وتبديل تلقائي كل 6 ثوانٍ
// بشريط تقدّم يتوقف عند المرور أو اللمس، وأسهم ونقاط وتمرير بالإصبع وأسهم الكيبورد. على الجوال شريحة واحدة.
export function TestimonialSlider({ items }: { items: Testimonial[] }) {
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const reduced = prefersReduced();
  const go = useCallback((next: number) => setIndex(((next % n) + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused || reduced) return;
    const timer = window.setTimeout(() => go(index + 1), 6000);
    return () => window.clearTimeout(timer);
  }, [index, paused, n, reduced, go]);

  if (n === 0) return null;
  const slideSx = (offset: number) => {
    const side = offset === 1 ? -1 : offset === n - 1 ? 1 : 0; // التالية على اليسار والسابقة على اليمين (RTL)
    if (offset === 0) return { opacity: 1, transform: 'translateX(0) scale(1) rotateY(0)', filter: 'none', zIndex: 2, pointerEvents: 'auto' as const };
    if (n > 1 && side !== 0) return { opacity: { xs: 0, md: 0.38 }, transform: `translateX(${side * 58}%) scale(.82) rotateY(${side * -12}deg)`, filter: 'blur(1.5px)', zIndex: 1, cursor: 'pointer', pointerEvents: 'auto' as const };
    return { opacity: 0, transform: 'scale(.7)', filter: 'none', zIndex: 0, pointerEvents: 'none' as const };
  };

  return (
    <Box
      role="region" aria-roledescription="carousel" aria-label="شهادات" tabIndex={0}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={(event) => { setPaused(true); touchX.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        const start = touchX.current; touchX.current = null; setPaused(false);
        if (start === null) return;
        const dx = event.changedTouches[0].clientX - start;
        if (dx < -50) go(index + 1); else if (dx > 50) go(index - 1);
      }}
      onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); go(index + 1); } if (event.key === 'ArrowRight') { event.preventDefault(); go(index - 1); } }}
      sx={{ outline: 'none', '&:focus-visible': { outline: `2px solid ${T.gold2}`, outlineOffset: 8, borderRadius: '24px' } }}
    >
      <Box sx={{ position: 'relative', height: { xs: 330, sm: 290 }, perspective: '1000px' }}>
        {items.map((item, i) => {
          const offset = (i - index + n) % n;
          const active = offset === 0;
          return (
            <Box
              key={`${item.name}-${i}`} aria-hidden={!active} onClick={() => { if (!active) go(i); }}
              sx={{ position: 'absolute', top: 0, insetInline: 0, mx: 'auto', width: { xs: '100%', md: 'min(560px, 70%)' }, p: { xs: 3, md: 3.5 }, borderRadius: '24px', bgcolor: 'rgba(255,255,255,.13)', backdropFilter: 'blur(12px)', border: '1px solid rgba(246,213,148,.55)', transition: `transform .7s ${T.ease}, opacity .7s ${T.ease}, filter .7s`, ...slideSx(offset), ...calm }}
            >
              <FormatQuoteRoundedIcon sx={{ position: 'absolute', top: 6, insetInlineStart: 14, fontSize: 64, color: T.gold2, opacity: 0.4 }} />
              <Typography sx={{ fontSize: { xs: 17, md: 19 }, lineHeight: 1.9, mt: 2.5, mb: 2.5, minHeight: { sm: 110 } }}>
                {active && !reduced ? item.text.split(/\s+/).map((word, w) => <Box component="span" key={`${index}-${w}`} sx={{ display: 'inline-block', marginInlineEnd: '0.3em', animation: `${wordIn} .45s ${T.ease} both`, animationDelay: `${w * 45}ms` }}>{word}</Box>) : item.text}
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 800, background: T.goldGrad, color: T.ink, ...(active ? { animation: `${ringPulse} 2.4s infinite` } : {}), ...calm }}>{item.name.slice(0, 1)}</Box>
                <Box><Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>{item.role && <Typography sx={{ fontSize: 13.5, color: '#f2dfae' }}>{item.role}</Typography>}</Box>
              </Stack>
            </Box>
          );
        })}
      </Box>
      {n > 1 && (
        <>
          <Box aria-hidden sx={{ mx: 'auto', mt: 2.5, width: 'min(320px, 70%)', height: 3, borderRadius: 3, bgcolor: 'rgba(255,255,255,.18)', overflow: 'hidden' }}>
            <Box key={index} sx={{ height: '100%', background: T.goldGrad, transformOrigin: 'right center', transform: reduced ? 'scaleX(1)' : undefined, animation: reduced ? 'none' : 'sliderFill 6s linear forwards', animationPlayState: paused ? 'paused' : 'running', '@keyframes sliderFill': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } } }} />
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', alignItems: 'center', mt: 2 }}>
            <Button aria-label="الشهادة السابقة" onClick={() => go(index - 1)} sx={{ color: '#fff', border: '1px solid rgba(246,213,148,.6)', minWidth: 44, borderRadius: '50%', height: 44 }}>→</Button>
            <Stack direction="row" spacing={0.75} role="tablist" aria-label="اختيار شهادة" sx={{ alignItems: 'center' }}>
              {items.map((item, i) => (
                <Box component="button" type="button" key={`dot-${item.name}-${i}`} role="tab" aria-selected={i === index} aria-label={`الشهادة ${i + 1}`} onClick={() => go(i)} sx={{ all: 'unset', cursor: 'pointer', height: 10, width: i === index ? 30 : 10, borderRadius: 10, bgcolor: i === index ? T.gold2 : 'rgba(255,255,255,.4)', transition: `width .35s ${T.ease}, background-color .3s`, '&:focus-visible': { outline: `2px solid ${T.gold2}`, outlineOffset: 3 }, ...calm }} />
              ))}
            </Stack>
            <Button aria-label="الشهادة التالية" onClick={() => go(index + 1)} sx={{ color: '#fff', border: '1px solid rgba(246,213,148,.6)', minWidth: 44, borderRadius: '50%', height: 44 }}>←</Button>
          </Stack>
        </>
      )}
    </Box>
  );
}
