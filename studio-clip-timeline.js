/* Non-destructive clip edits. Source times are seconds; original media never changes. */
(function (G) {
'use strict';
const MIN = 0.05;
const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function validDuration(duration) {
  const d = Number(duration);
  if (!Number.isFinite(d) || d < MIN) throw new Error('Wait for the video duration to load.');
  return d;
}
function selection(start, end, duration) {
  const d = validDuration(duration), a = clamp(finite(start, 0), 0, d - MIN);
  const b = clamp(finite(end, d), a + MIN, d);
  return { start: a, end: b };
}
function normalizeSegments(clip, duration) {
  const d = validDuration(duration), input = Array.isArray(clip?.segments) ? clip.segments : [{ start: finite(clip?.in, 0), end: finite(clip?.out, 0) > 0 ? +clip.out : d }];
  const rows = input.map(s => ({start: clamp(finite(s?.start ?? s?.[0], 0), 0, d), end: clamp(finite(s?.end ?? s?.[1], d), 0, d)}))
    .filter(s => s.end - s.start >= MIN - 1e-8).sort((a,b) => a.start - b.start);
  const result = [];
  for (const s of rows) {
    const last = result[result.length - 1];
    if (last && s.start <= last.end + 1e-8) last.end = Math.max(last.end, s.end);
    else result.push({...s});
  }
  return result;
}
function requireRemaining(rows) {
  if (!rows.length) throw new Error('Keep at least 0.05 seconds of the clip.');
  return rows;
}
function keep(clip, duration, start, end) {
  const range = selection(start, end, duration);
  return requireRemaining(normalizeSegments(clip, duration).map(s => ({start: Math.max(s.start,range.start), end: Math.min(s.end,range.end)})).filter(s => s.end-s.start >= MIN-1e-8));
}
function remove(clip, duration, start, end) {
  const range = selection(start, end, duration), result=[];
  for (const s of normalizeSegments(clip,duration)) {
    if (range.end <= s.start || range.start >= s.end) result.push({...s});
    else {
      if (range.start-s.start >= MIN-1e-8) result.push({start:s.start,end:Math.min(s.end,range.start)});
      if (s.end-range.end >= MIN-1e-8) result.push({start:Math.max(s.start,range.end),end:s.end});
    }
  }
  return requireRemaining(result);
}
const totalDuration = rows => rows.reduce((total,s) => total + Math.max(0,s.end-s.start),0);
function locate(rows, elapsed, {reverse=false, loop=true}={}) {
  const total=totalDuration(rows);
  if (!rows.length || total < MIN) return {time:0,index:-1,local:0,remaining:0,total:0,ended:true};
  const e=Math.max(0,finite(elapsed,0)), ended=!loop && e>=total;
  let left=loop ? e%total : Math.min(e,Math.max(0,total-1e-8));
  const order=reverse ? rows.map((_,i)=>i).reverse() : rows.map((_,i)=>i);
  for (const index of order) {
    const row=rows[index], length=row.end-row.start;
    if (left < length || index===order[order.length-1]) return {time:reverse?row.end-left:row.start+left,index,local:left,remaining:Math.max(0,length-left),total,ended};
    left-=length;
  }
}
const api={MIN,selection,normalizeSegments,keep,remove,totalDuration,locate};
if (typeof module!=='undefined' && module.exports) module.exports=api;
G.StudioClipTimeline=api;
})(typeof window!=='undefined'?window:globalThis);
