#!/usr/bin/env node
/**
 * check-compatibility.js — slide-editor 适配性自检 (static linter)
 *
 * 输入任意 html-ppt，静态分析（不渲染）哪些元素 editor 选不中、哪些拖动会跳位，
 * 量化"适配度"。规则与 docs/EDITOR_CONTRACT.md 及 src/core/LayoutEngine.ts /
 * DragManager.ts 一一对应。
 *
 * 用法:
 *   node scripts/check-compatibility.js <presentation.html> [--json]
 *
 * 依赖: jsdom (已在 devDependencies)。
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JSDOM } from 'jsdom';

// ---- 与 LayoutEngine 对齐的常量 ----
const SEMANTIC_TEXT = ['H1','H2','H3','H4','H5','H6','P','SPAN','STRONG','EM','B','I','MARK','SMALL','A','LABEL','LI','DT','DD'];
const KNOWN_EDITABLE_CLASSES = ['card','btn','button','btn-primary','btn-secondary','logo','corner-logo','brand-logo','stat-number','stat-label','stat-value','response-card','modal','popup','floating-button','action-button','fab','editable'];
const ANIM_WRAPPER = ['reveal','reveal-left','reveal-right','reveal-up','reveal-down','reveal-scale','reveal-fade','reveal-slide'];
const SKIP_TAGS = ['SCRIPT','STYLE','LINK','META','NOSCRIPT','BR','HR','TEMPLATE'];

function hasClass(el, list){ return list.some(c => el.classList.contains(c)); }
function directText(el){
  for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true;
  return false;
}
function visibleText(el){ return !!(el.textContent && el.textContent.trim()); }

// 静态近似 LayoutEngine.shouldBeEditable
function wouldBeEditable(el){
  const tag = el.tagName;
  if (tag === 'IMG') return true;
  if (['H1','H2','H3','H4','H5','H6','P'].includes(tag)) return visibleText(el);
  if (el.hasAttribute('onclick') || el.hasAttribute('data-interactive') || el.hasAttribute('data-editable') ||
      el.hasAttribute('data-editor-container') || el.hasAttribute('contenteditable') ||
      el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return true;
  if (hasClass(el, KNOWN_EDITABLE_CLASSES)) return visibleText(el) || hasClass(el, ['logo','corner-logo','brand-logo']);
  if (['SPAN','STRONG','EM','B','I','MARK','SMALL','LABEL'].includes(tag)) return visibleText(el);
  if (tag === 'A') return visibleText(el) || !!el.querySelector('img');
  if (['LI','DT','DD'].includes(tag)) return visibleText(el);
  if (['BUTTON'].includes(tag)) return true;
  // v0.3.5 leaf div/section with only direct text
  if (el.childElementCount === 0 && directText(el)) return true;
  return false;
}

function inlineStyle(el){ return (el.getAttribute('style') || '').toLowerCase(); }

// 拖动跳位风险（DragManager 现已"提升为 absolute"，残余风险主要是：父级强约束 + 缺定位基准）
function dragRisks(el){
  const risks = [];
  const s = inlineStyle(el);
  const parent = el.parentElement;
  const ps = parent ? inlineStyle(parent) : '';
  // 父级 flex/grid：提升 absolute 后兄弟会重排（编辑期可接受，但仍提示）
  if (/display\s*:\s*(flex|grid)/.test(ps)) risks.push('父级为 flex/grid，拖动该子项会让同排元素重新排布');
  // transform 平移定位（v0.3.5 已在拖动时清除，残余风险：与 CSS 动画 transform 冲突时初始测量可能偏）
  if (/transform\s*:\s*[^;]*(translate|matrix)/.test(s)) risks.push('inline transform 平移，建议改用 left/top 定位');
  // right/bottom 定位
  if (/(^|;)\s*(right|bottom)\s*:/.test(s)) risks.push('使用 right/bottom 定位，建议统一 left/top');
  return risks;
}

function analyze(htmlPath){
  const abs = resolve(htmlPath);
  const html = readFileSync(abs, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const report = { file: abs, slides: [], fatal: [], summary: {} };

  // 扫 <style> 块，判断 .slide 是否在 CSS 里设了定位上下文（避免 inline-only 误报）
  let slideRuleHasPosition = false;
  doc.querySelectorAll('style').forEach(st => {
    const css = (st.textContent || '').replace(/\s+/g, ' ');
    const m = css.match(/\.slide\s*(,[^{]*)?\{([^}]*)\}/i);
    if (m && /position\s*:\s*(relative|absolute|fixed)/i.test(m[2])) slideRuleHasPosition = true;
  });

  const slides = doc.querySelectorAll('.slide');
  if (slides.length === 0){
    report.fatal.push("未找到 class='slide' 的幻灯片 — editor 无法识别任何页面（契约 §1）。");
    return report;
  }

  let totalEditable = 0, totalUnreachable = 0, totalDragRisk = 0;

  slides.forEach((slide, idx) => {
    const sStyle = inlineStyle(slide);
    // 只能看 inline；外部 CSS 看不到，给出提示而非断言
    const slideHasRelative = /position\s*:\s*(relative|absolute|fixed)/.test(sStyle) || slideRuleHasPosition;
    const s = { index: idx, editable: 0, unreachableText: [], dragRisks: [], notes: [] };
    if (!slideHasRelative) s.notes.push('.slide 未设置 position:relative（inline 与 <style> 均未见）— 拖动坐标基准不稳，契约 §1');

    const walk = (el) => {
      if (SKIP_TAGS.includes(el.tagName)) return;
      const editable = wouldBeEditable(el);
      if (editable){
        s.editable++;
        const risks = dragRisks(el);
        if (risks.length) s.dragRisks.push({ el: describe(el), risks });
      }
      // 选不中的文字：本身不可编辑、但有"直接文字"且含子元素（文字夹在容器里）
      if (!editable && el.childElementCount > 0 && directText(el)){
        s.unreachableText.push(describe(el));
      }
      // 裸 div/section 含文字但既非语义又无标记、且仅靠后代文字（整块）— 子元素会被逐个判定，这里只提示纯展示容器
      for (const c of el.children) walk(c);
    };
    for (const c of slide.children) walk(c);

    totalEditable += s.editable;
    totalUnreachable += s.unreachableText.length;
    totalDragRisk += s.dragRisks.length;
    report.slides.push(s);
  });

  const denom = totalEditable + totalUnreachable;
  report.summary = {
    slides: slides.length,
    editableElements: totalEditable,
    unreachableTextNodes: totalUnreachable,
    elementsWithDragRisk: totalDragRisk,
    adaptationScore: denom === 0 ? 1 : +(totalEditable / denom).toFixed(3),
  };
  return report;
}

function describe(el){
  const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '';
  const txt = (el.textContent || '').trim().slice(0, 24);
  return `<${el.tagName.toLowerCase()}${cls}> "${txt}${txt.length >= 24 ? '…' : ''}"`;
}

function printReport(r){
  if (r.fatal.length){
    console.log('\n❌ 致命问题:');
    r.fatal.forEach(f => console.log('   - ' + f));
    return;
  }
  const sum = r.summary;
  console.log(`\n📄 ${r.file}`);
  console.log(`   幻灯片: ${sum.slides}  可编辑元素: ${sum.editableElements}  选不中的文字: ${sum.unreachableTextNodes}  拖动风险: ${sum.elementsWithDragRisk}`);
  console.log(`   适配度: ${(sum.adaptationScore * 100).toFixed(1)}%  ${scoreBadge(sum.adaptationScore)}`);

  r.slides.forEach(s => {
    const issues = s.unreachableText.length + s.dragRisks.length + s.notes.length;
    if (issues === 0) return;
    console.log(`\n  ── Slide ${s.index + 1} ──  (可编辑 ${s.editable})`);
    s.notes.forEach(n => console.log(`     · 提示: ${n}`));
    if (s.unreachableText.length){
      console.log(`     ⚠ 选不中的文字 (文字夹在容器里，建议改语义标签或加 data-editable):`);
      s.unreachableText.slice(0, 12).forEach(t => console.log(`         ${t}`));
      if (s.unreachableText.length > 12) console.log(`         …还有 ${s.unreachableText.length - 12} 个`);
    }
    if (s.dragRisks.length){
      console.log(`     ⚠ 拖动可能跳位/重排:`);
      s.dragRisks.slice(0, 12).forEach(d => console.log(`         ${d.el}  →  ${d.risks.join('; ')}`));
      if (s.dragRisks.length > 12) console.log(`         …还有 ${s.dragRisks.length - 12} 个`);
    }
  });
  console.log('');
}

function scoreBadge(x){ return x >= 0.95 ? '✅ 极佳' : x >= 0.8 ? '🟢 良好' : x >= 0.6 ? '🟡 一般，建议优化' : '🔴 较差，需整改'; }

// ---- main ----
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')){
  console.log('用法: node scripts/check-compatibility.js <presentation.html> [--json]');
  process.exit(0);
}
const wantJson = args.includes('--json');
const file = args.find(a => !a.startsWith('--'));
try {
  const r = analyze(file);
  if (wantJson) console.log(JSON.stringify(r, null, 2));
  else printReport(r);
  process.exit(r.fatal.length ? 2 : 0);
} catch (e){
  console.error('错误:', e.message);
  process.exit(1);
}
