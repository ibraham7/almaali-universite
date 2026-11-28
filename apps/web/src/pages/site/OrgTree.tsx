import type { OrgNode } from '../../api/site';

// الشجرة بـCSS ثابت (لا قيم من المستخدم داخل الأنماط). النصوص تُعرض كنص عادي عبر React فلا حقن.
const CSS = `
.otree-wrap{overflow-x:auto;padding:10px 0 20px}
.otree{min-width:max-content;margin:auto;display:flex;justify-content:center}
.otree ul{display:flex;justify-content:center;padding-top:26px;position:relative;margin:0;padding-inline:0}
.otree>ul{padding-top:0}
.otree li{list-style:none;text-align:center;position:relative;padding:26px 8px 0}
.otree>ul>li{padding-top:0}
.otree li::before,.otree li::after{content:"";position:absolute;top:0;right:50%;border-top:2px solid #e0b878;width:50%;height:26px}
.otree li::after{right:auto;left:50%;border-left:2px solid #e0b878}
.otree>ul>li::before,.otree>ul>li::after{display:none}
.otree li:only-child::before,.otree li:only-child::after{display:none}
.otree li:only-child{padding-top:26px}
.otree li:first-child::before,.otree li:last-child::after{border:0}
.otree li:last-child::before{border-right:2px solid #e0b878;border-radius:0 10px 0 0}
.otree li:first-child::after{border-radius:10px 0 0 0}
.otree ul ul::before{content:"";position:absolute;top:0;left:50%;border-left:2px solid #e0b878;height:26px}
.onode{display:inline-block;min-width:150px;max-width:190px;padding:10px 14px;border-radius:14px;background:#fff;border:2px solid #f0d6a2;box-shadow:0 6px 18px rgba(18,72,154,.1);transition:transform .3s,border-color .3s,box-shadow .3s;font-size:.92rem;line-height:1.5}
.onode b{display:block;color:#12489a}
.onode small{color:#5a6b7d;display:block;font-size:.78rem}
.onode:hover{transform:translateY(-4px) scale(1.04);border-color:#d39a3d;box-shadow:0 14px 28px rgba(18,72,154,.18)}
.onode:hover b{color:#a8702a}
.onode.l0{background:linear-gradient(135deg,#2f74e0 0%,#1a55af 45%,#0d3767 100%);border-color:#d39a3d;padding:14px 26px}
.onode.l0 b{color:#f8d99a}.onode.l0 small{color:#fff}
.onode.l1{background:#fbefd6;border-color:#d39a3d}
@media(min-width:721px){
.otree ul ul ul{display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:26px}
.otree ul ul ul>li{padding:0}
.otree ul ul ul>li::before,.otree ul ul ul>li::after{display:none}
.otree ul ul ul>li+li::before{display:block!important;content:"";position:absolute;top:-12px!important;left:50%!important;right:auto!important;width:0!important;height:12px!important;border:0!important;border-left:2px solid #e0b878!important;border-radius:0!important}
}
@media(max-width:720px){
.otree{min-width:0;display:block}
.otree ul{display:block;padding:0 22px 0 0;margin:0}
.otree li{text-align:start;padding:12px 18px 0 0;border-right:2px solid #e0b878}
.otree>ul>li{border:0;padding:0}
.otree li::before,.otree li::after,.otree ul ul::before{display:none!important}
.otree li:only-child{padding-top:12px}
.otree li>.onode{position:relative}
.otree li>.onode::before{content:"";position:absolute;right:-20px;top:50%;width:18px;border-top:2px solid #e0b878}
.otree>ul>li>.onode::before{display:none}
.onode{display:block;max-width:none}
}
@media (prefers-reduced-motion: reduce){.onode{transition:none}}
`;

function Node({ node, depth }: { node: OrgNode; depth: number }) {
  return (
    <li>
      <div className={`onode l${Math.min(depth, 2)}`}><b>{node.name}</b>{node.role && <small>{node.role}</small>}</div>
      {node.children.length > 0 && <ul>{node.children.map((child, index) => <Node key={`${child.name}-${index}`} node={child} depth={depth + 1} />)}</ul>}
    </li>
  );
}

export default function OrgTree({ roots }: { roots: OrgNode[] }) {
  return (
    <div className="otree-wrap" dir="rtl">
      <style>{CSS}</style>
      <div className="otree"><ul>{roots.map((root, index) => <Node key={`${root.name}-${index}`} node={root} depth={0} />)}</ul></div>
    </div>
  );
}
