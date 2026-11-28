/* =====================================================================
   RAVEN UNREAD PEOPLE — studio layer on the Raven dial (studio 1121,
   not in the AsgardRaven Dart yet).
   People with unread messages stand above the dial as whole-body 3D
   figures (their real HoloWorker models), still, each with a small comic
   speech bubble. Swipe left / right for the next batch. Tap a person to
   open their conversation; back (or swipe down) there returns here.
   Spots = where people stand (drag on the phone). Unread list = who,
   in order; each batch fills the spots. Every number is a control.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit, sc = K && K.screens && K.screens.dial;
if (!sc) return;
const { TAU, clamp, smooth, rgba } = K;
const G0 = 'Unread people';

/* ---------- people with real figures ---------- */
let PEOPLE = [
  { id: 'freya', name: 'Freya', is360: true, spin: true },
  { id: 'loki', name: 'Loki' },
  { id: 'sif', name: 'Sif' },
  { id: 'tyr', name: 'Tyr', spin: true },
  { id: 'baldr', name: 'Baldr', spin: true },
  { id: 'hel', name: 'Hel' },
];
let BY_ID = Object.fromEntries(PEOPLE.map(p => [p.id, p]));
const MAX = 6, LIST = 12;
// SPOTS: x (of width), feet y (of height), height px, bubble side, bubble x / y offset
const SPOTS = [
  [.12, .272, 168, 'right', 8, -12],
  [.88, .272, 164, 'left', -8, -12],
  [.27, .236, 112, 'right', -12, 47],
  [.73, .236, 114, 'left', 0, 106],
  [.30, .20, 95, 'above', 0, 0],
  [.70, .20, 95, 'above', 0, 0],
];
// UNREAD LIST: who, newest message, unread count
const UNREAD = [
  ['freya', 'That looks amazing', 1], ['hel', "I'll be there at six", 1], ['tyr', 'Training at dawn', 3],
  ['loki', 'See you tonight?', 1], ['sif', 'Hair appointment moved', 2], ['baldr', "Call me when you're free", 1], ['freya', 'Did you see the game?', 2],
  ['hel', 'Running late', 1], ['tyr', 'Gym at 6?', 1], ['loki', 'Guess who I ran into', 4], ['sif', 'Dinner Friday?', 1],
];

/* ---------- figure art (front frames from each person's 3D model) ---------- */
const ART = {};
function scan(im, n, f) {
  const fw = Math.floor(im.naturalWidth / n), fh = im.naturalHeight, c = document.createElement('canvas'); c.width = fw; c.height = fh;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, f * fw, 0, fw, fh, 0, 0, fw, fh);
  const d = x.getImageData(0, 0, fw, fh).data; let t = fh, b = 0, l = fw, r = 0;
  for (let y = 0; y < fh; y++) for (let xx = 0; xx < fw; xx++) if (d[(y * fw + xx) * 4 + 3] > 40) { if (y < t) t = y; if (y > b) b = y; if (xx < l) l = xx; if (xx > r) r = xx; }
  return b > t ? { fw, fh, t, b: b + 1, l, r: r + 1 } : { fw, fh, t: 0, b: fh, l: 0, r: fw };
}
function art(id) {
  const who = BY_ID[id], src = who && who.src, key = id + '|' + (src ? src.profile : '');
  if (ART[key]) return ART[key];
  const a = ART[key] = { prof: new Image(), spin: null, box: null, n: src ? src.n : 25, sn: src ? src.sn : 48 };
  a.prof.crossOrigin = 'anonymous';
  a.prof.onload = () => { a.box = scan(a.prof, a.n, Math.floor(a.n / 2)); buildTray(); };
  a.prof.src = src ? src.profile : 'asgard/figs/' + id + '_profile.webp?v=1121u';
  const spinSrc = src ? src.spin : (who && who.spin ? 'asgard/figs/' + id + '_spin.webp?v=1121u' : null);
  if (spinSrc) { a.spin = new Image(); a.spin.crossOrigin = 'anonymous'; a.spin.src = spinSrc; }
  return a;
}
// the studio's People list (add / remove test people without Claude) replaces the built-in list once it loads
function syncPeople() {
  const list = K.people ? K.people.list() : []; if (!list.length) return;
  PEOPLE = list.map(q => ({ id: q.key, name: q.name, is360: q.is360, spin: !!q.spin, src: { profile: q.profile, spin: q.spin, n: q.profileFrames, sn: q.spinFrames } }));
  BY_ID = Object.fromEntries(PEOPLE.map(q => [q.id, q])); PEOPLE.forEach(q => art(q.id)); if (typeof buildTray === 'function') buildTray();
}
if (K.people) K.people.on(syncPeople);
PEOPLE.forEach(p => art(p.id));
const ready = im => im && im.complete && im.naturalWidth > 0;

/* ---------- state (studio only, not saved) ---------- */
let T0 = performance.now();
const READ = new Set();                                   // list entries opened (read) this session
const SW = { page: 0, from: -1, dir: 1, t: -1e9, dx: 0 };
const CAR = { pos: 0, vel: 0, drag: false, last: 0 };       // carousel scroll (px for row, people for ring)

/* ---------- controls ---------- */
const ADD = [];
const def = (section, target, k, label, type, d, o = {}) => ADD.push(Object.assign({ group: G0, section, target, k, label, type, def: d }, o));
const NEW = 'Studio addition, not in the Dart yet.';
def('People', 'unread', 'un.on', 'Show unread people', 'bool', true, { info: 'People with unread messages stand above the dial with their message in a small comic bubble. ' + NEW });
def('People', 'unread', 'un.total', 'People with unread messages', 'int', 7, { min: 0, max: LIST, step: 1, info: 'How many are in the unread list (edit them under Unread 1-6 and Unread 7-12). Opening someone\'s messages takes them off the list.' });
def('People', 'unread', 'un.layout', 'How they are shown', 'select', 'batches', { opts: [['batches', 'Batches on spots (swipe for next batch)'], ['row', 'Carousel: one long row you slide'], ['ring', 'Carousel: 3D ring that turns']], info: 'Batches = each batch stands on your Spots. Carousels put every unread person in one strip you slide with your finger; the ring turns them in 3D using their real models.' });
def('Carousel', 'unread', 'un.c.y', 'Feet up / down', 'num', .27, { min: 0, max: 1, step: .001, unit: 'of height' });
def('Carousel', 'unread', 'un.c.h', 'Person height', 'num', 175, { min: 40, max: 600, step: 1, unit: 'px' });
def('Carousel', 'unread', 'un.c.gap', 'Space between people', 'num', 105, { min: 30, max: 400, step: 1, unit: 'px', info: 'Row carousel only.' });
def('Carousel', 'unread', 'un.c.focus', 'Middle person bigger by', 'num', 1.15, { min: 1, max: 2, step: .01, unit: '×' });
def('Carousel', 'unread', 'un.c.loop', 'Wrap around (no end)', 'bool', true, { info: 'Row carousel. The ring always wraps.' });
def('Carousel', 'unread', 'un.c.radius', 'Ring width', 'num', .38, { min: .1, max: .8, step: .005, unit: 'of width', info: 'Ring carousel only.' });
def('Carousel', 'unread', 'un.c.depth', 'Back of ring size', 'num', .55, { min: .2, max: 1, step: .01, unit: '×' });
def('Carousel', 'unread', 'un.c.lift', 'Back of ring lifts up', 'num', 34, { min: -200, max: 200, step: 1, unit: 'px' });
def('Carousel', 'unread', 'un.c.dim', 'Back of ring darker', 'num', .45, { min: 0, max: 1, step: .01 });
def('Carousel', 'unread', 'un.c.turn', 'People turn with the ring', 'bool', true, { info: 'Shows the side of their real 3D model as they go around.' });
def('Carousel', 'unread', 'un.c.fade', 'Fade at the screen edges', 'num', 36, { min: 0, max: 200, step: 1, unit: 'px', info: 'Row carousel. 0 = no fade.' });
def('Carousel', 'unread', 'un.c.inertia', 'Keeps sliding after you let go', 'bool', true);
def('Carousel', 'unread', 'un.c.friction', 'Slows down by', 'num', .93, { min: .5, max: .995, step: .001, info: 'Higher = slides longer.' });
def('Carousel', 'unread', 'un.c.snap', 'Stops with someone in the middle', 'bool', true);
def('Carousel', 'unread', 'un.c.auto', 'Drifts on its own', 'num', 0, { min: -200, max: 200, step: 1, unit: 'px/s', info: '0 = still until you swipe.' });
def('People', 'unread', 'un.count', 'People per batch', 'int', 4, { min: 1, max: MAX, step: 1, info: 'How many stand above the dial at once. Swipe left or right for the next batch. Each one stands on a Spot.' });
def('People', 'unread', 'un.same', 'Everyone the same height', 'bool', false, { info: 'On = every person uses the one height below instead of each Spot\'s own Height.' });
def('People', 'unread', 'un.sameH', 'Height for everyone', 'num', 150, { min: 30, max: 700, step: 1, unit: 'px' });
def('People', 'unread', 'un.sameFeet', 'Everyone\'s feet on one line', 'bool', false, { info: 'On = all feet line up at the height below, instead of each Spot\'s own Feet up / down.' });
def('People', 'unread', 'un.sameY', 'Feet line up / down', 'num', .27, { min: 0, max: 1, step: .001, unit: 'of height' });
def('People', 'unread', 'un.scaleAll', 'Size of everyone', 'num', 1.15, { min: .3, max: 3, step: .01, unit: '×' });
def('People', 'unread', 'un.lock', 'Lock positions', 'bool', false, { info: 'On = dragging on a person swipes batches instead of moving their spot.' });
def('People', 'unread', 'un.snap', 'Snap to grid', 'int', 0, { min: 0, max: 40, step: 1, unit: 'px', info: '0 = no snapping. Any other value snaps feet and bubbles to that grid while you drag.' });
def('People', 'unread', 'un.keepOn', 'Keep bubbles on screen', 'bool', true);
def('People', 'unread', 'un.tapStudio', 'Tap opens conversation in the studio', 'bool', false, { info: 'On the phone a tap on a person always opens their conversation, and back returns to the dial. In the studio this is off so clicks do not leave the page while you place people.' });
def('People', 'unread', 'un.replay', 'Replay arrival', 'action', null, { onclick: () => { T0 = performance.now(); SW.page = 0; SW.from = -1; } });
def('People', 'unread', 'un.unreadAll', 'Mark everyone unread again', 'action', null, { onclick: () => { READ.clear(); SW.page = 0; SW.from = -1; K.status('Everyone is unread again.'); } });
// swipe
def('Swipe batches', 'unread', 'un.sw.style', 'Next batch comes in by', 'select', 'slide', { opts: [['slide', 'Sliding across'], ['fade', 'Fading'], ['none', 'Switching instantly']] });
def('Swipe batches', 'unread', 'un.sw.ms', 'Swipe time', 'int', 380, { min: 60, max: 2000, step: 10, unit: 'ms' });
def('Swipe batches', 'unread', 'un.sw.min', 'Swipe distance needed', 'int', 50, { min: 10, max: 200, step: 1, unit: 'px' });
def('Swipe batches', 'unread', 'un.sw.follow', 'People follow your finger', 'bool', true);
def('Swipe batches', 'unread', 'un.sw.loop', 'Wrap around after the last batch', 'bool', false);
def('Swipe batches', 'unread', 'un.sw.next', 'Show next batch', 'action', null, { onclick: () => nextBatch() });
def('Swipe batches', 'unread', 'un.dots', 'Batch dots', 'bool', true, { info: 'Small dots showing which batch you are on. Only shows when there is more than one batch.' });
def('Swipe batches', 'unread', 'un.dotsY', 'Dots up / down', 'num', .03, { min: 0, max: 1, step: .001, unit: 'of height' });
def('Swipe batches', 'unread', 'un.dotsSize', 'Dot size', 'num', 6, { min: 2, max: 20, step: .5, unit: 'px' });
def('Swipe batches', 'unread', 'un.dotsGap', 'Space between dots', 'num', 8, { min: 2, max: 40, step: .5, unit: 'px' });
def('Swipe batches', 'unread', 'un.dotsColor', 'Dot color', 'color', '#FFFFFF');
def('Swipe batches', 'unread', 'un.dotsOff', 'Other dots brightness', 'num', .35, { min: 0, max: 1, step: .01 });
// unread list
for (let j = 0; j < LIST; j++) {
  const [who, msg, n] = UNREAD[j], S = j < 6 ? 'Unread 1-6' : 'Unread 7-12', p = 'un.p' + j + '.', N = '#' + (j + 1) + ' ';
  def(S, 'unread', p + 'who', N + 'who', 'select', who, { info: 'Their real 3D figure. Or drag a face from the tray onto someone standing above the dial. Add or remove people with the People button at the top.' });
  Object.defineProperty(ADD[ADD.length - 1], 'opts', { get: () => PEOPLE.map(q => [q.id, q.name + (q.is360 ? ' (360)' : '')]) });
  def(S, 'unread', p + 'msg', N + 'message', 'text', msg, { info: 'Their newest unread message. The bubble shows all of it.' });
  def(S, 'unread', p + 'count', N + 'unread count', 'int', n, { min: 0, max: 99, step: 1 });
  def(S, 'unread', p + 'spin', N + 'spin 360 (360 members only)', 'bool', false, { info: 'Only people who paid for 360 can spin. Everyone else ignores this.' });
  def(S, 'unread', p + 'spinSec', N + 'seconds per spin', 'num', 8, { min: 1, max: 60, step: .5, unit: 's' });
}
// spots
for (let i = 0; i < MAX; i++) {
  const [x, y, h, side, bx0, by0] = SPOTS[i], S = 'Spot ' + (i + 1), t = 'unread.p:' + i, p = 'un.p' + i + '.';
  def(S, t, p + 'show', 'Use this spot', 'bool', true, { info: 'Spots are where people stand. Each batch fills Spot 1, 2, 3 ... in order. Drag a person on the phone to move their spot.' });
  def(S, t, p + 'x', 'Left / right', 'num', x, { min: -.2, max: 1.2, step: .001, unit: 'of width', info: 'Or drag the person on the phone.' });
  def(S, t, p + 'y', 'Feet up / down', 'num', y, { min: 0, max: 1, step: .001, unit: 'of height' });
  def(S, t, p + 'h', 'Height', 'num', h, { min: 30, max: 700, step: 1, unit: 'px' });
  def(S, t, p + 'turn', 'Facing', 'num', 0, { min: -60, max: 60, step: 1, unit: '°', info: '0 = straight at you. Other values show the matching side of their real 3D model. They still stand still.' });
  def(S, t, p + 'flip', 'Mirror', 'bool', false);
  def(S, t, p + 'layer', 'In front / behind', 'int', i >= 2 ? -1 : 0, { min: -5, max: 5, step: 1, info: 'Higher = drawn in front of the others.' });
  def(S, t, p + 'bSide', 'Bubble side', 'select', side, { opts: [['auto', 'Auto'], ['right', 'Right of head'], ['left', 'Left of head'], ['above', 'Above head']] });
  def(S, t, p + 'bx', 'Bubble left / right', 'num', bx0, { min: -300, max: 300, step: 1, unit: 'px', info: 'Or drag the bubble on the phone.' });
  def(S, t, p + 'by', 'Bubble up / down', 'num', by0, { min: -400, max: 400, step: 1, unit: 'px' });
  def(S, t, p + 'bScale', 'Bubble size', 'num', 1, { min: .4, max: 2.5, step: .01, unit: '×' });
  def(S, t, p + 'ux', 'Number left / right', 'num', 0, { min: -200, max: 200, step: 1, unit: 'px', info: 'Or drag the number on the phone.' });
  def(S, t, p + 'uy', 'Number up / down', 'num', 0, { min: -300, max: 300, step: 1, unit: 'px' });
  def(S, t, p + 'nx', 'Name left / right', 'num', 0, { min: -200, max: 200, step: 1, unit: 'px', info: 'Or drag the name on the phone.' });
  def(S, t, p + 'ny', 'Name up / down', 'num', 0, { min: -300, max: 300, step: 1, unit: 'px' });
}
// figure look
def('Figure look', 'unread', 'un.bright', 'Brightness', 'num', 1, { min: .3, max: 2, step: .01, unit: '×' });
def('Figure look', 'unread', 'un.contrast', 'Contrast', 'num', 1, { min: .3, max: 2, step: .01, unit: '×' });
def('Figure look', 'unread', 'un.sat', 'Color strength', 'num', 1, { min: 0, max: 2, step: .01, unit: '×' });
def('Figure look', 'unread', 'un.opacity', 'Opacity', 'num', 1, { min: .1, max: 1, step: .01 });
def('Figure look', 'unread', 'un.flicker', 'Flicker', 'num', 0, { min: 0, max: 1, step: .01, info: '0 = solid, like a real person standing there.' });
def('Figure look', 'unread', 'un.edge', 'Edge light', 'num', 0, { min: 0, max: 1, step: .01, info: 'A thin light around the body. 0 = none.' });
def('Figure look', 'unread', 'un.edgeColor', 'Edge light color', 'color', '#5FD8FF');
def('Figure look', 'unread', 'un.edgeBlur', 'Edge light softness', 'num', 4, { min: 0, max: 20, step: .5, unit: 'px' });
def('Figure look', 'unread', 'un.shadow', 'Shadow under feet', 'bool', true);
def('Figure look', 'unread', 'un.shadowOp', 'Shadow darkness', 'num', .5, { min: 0, max: 1, step: .01 });
def('Figure look', 'unread', 'un.shadowW', 'Shadow width', 'num', .9, { min: .2, max: 2.5, step: .01, unit: 'of body' });
def('Figure look', 'unread', 'un.shadowH', 'Shadow depth', 'num', .06, { min: .01, max: .3, step: .005, unit: 'of height' });
// bubble shape (off by default: just the person and their unread number)
def('Bubble shape', 'unread.bubble', 'un.b.on', 'Show speech bubbles', 'bool', false, { info: 'Off = no bubbles, just the person with their unread number under them.' });
def('Bubble shape', 'unread.bubble', 'un.b.style', 'Bubble style', 'select', 'round', { opts: [['oval', 'Comic oval'], ['round', 'Rounded box'], ['cloud', 'Thought cloud'], ['box', 'Square box']] });
def('Bubble shape', 'unread.bubble', 'un.b.fill', 'Fill color', 'color', '#FFFFFF');
def('Bubble shape', 'unread.bubble', 'un.b.fillOp', 'Fill opacity', 'num', 1, { min: 0, max: 1, step: .01 });
def('Bubble shape', 'unread.bubble', 'un.b.line', 'Outline color', 'color', '#111111');
def('Bubble shape', 'unread.bubble', 'un.b.lineW', 'Outline width', 'num', 1.5, { min: 0, max: 8, step: .1, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.round', 'Corner roundness', 'num', 9, { min: 0, max: 60, step: 1, unit: 'px', info: 'Rounded box only.' });
def('Bubble shape', 'unread.bubble', 'un.b.padX', 'Inside space sides', 'num', 7, { min: 2, max: 50, step: 1, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.padY', 'Inside space top / bottom', 'num', 4, { min: 2, max: 50, step: 1, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.maxW', 'Widest line', 'num', 96, { min: 40, max: 360, step: 1, unit: 'px', info: 'Text wraps onto more lines past this width. The whole message always shows.' });
def('Bubble shape', 'unread.bubble', 'un.b.gap', 'Distance from head', 'num', 6, { min: -40, max: 120, step: 1, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.tilt', 'Tilt', 'num', 0, { min: -20, max: 20, step: .5, unit: '°' });
def('Bubble shape', 'unread.bubble', 'un.b.opacity', 'Bubble opacity', 'num', 1, { min: .1, max: 1, step: .01 });
def('Bubble shape', 'unread.bubble', 'un.b.shadow', 'Drop shadow', 'bool', true);
def('Bubble shape', 'unread.bubble', 'un.b.shadowColor', 'Shadow color', 'color', '#000000');
def('Bubble shape', 'unread.bubble', 'un.b.shadowOp', 'Shadow strength', 'num', .35, { min: 0, max: 1, step: .01 });
def('Bubble shape', 'unread.bubble', 'un.b.shadowBlur', 'Shadow softness', 'num', 6, { min: 0, max: 30, step: .5, unit: 'px' });
def('Bubble shape', 'unread.bubble', 'un.b.shadowY', 'Shadow drop', 'num', 2, { min: -20, max: 20, step: .5, unit: 'px' });
// tail
def('Bubble tail', 'unread.bubble', 'un.t.on', 'Tail', 'bool', true);
def('Bubble tail', 'unread.bubble', 'un.t.w', 'Tail width at bubble', 'num', 10, { min: 2, max: 60, step: 1, unit: 'px' });
def('Bubble tail', 'unread.bubble', 'un.t.len', 'Tail reach toward mouth', 'num', .8, { min: .1, max: 1, step: .01, info: '1 = the tip touches the person.' });
def('Bubble tail', 'unread.bubble', 'un.t.bend', 'Tail curve', 'num', .25, { min: -1, max: 1, step: .01 });
def('Bubble tail', 'unread.bubble', 'un.t.aimY', 'Tail aims at', 'num', .1, { min: 0, max: .5, step: .005, unit: 'down the body', info: 'Where on the body the tail points. About 0.1 = mouth.' });
// text
def('Bubble text', 'unread.bubble', 'un.f.font', 'Font', 'select', 'Comic Neue', { opts: [['Comic Neue', 'Comic Neue'], ['Bangers', 'Bangers (comic caps)'], ['Patrick Hand', 'Patrick Hand (handwritten)'], ['Roboto', 'Roboto (app font)']] });
def('Bubble text', 'unread.bubble', 'un.f.size', 'Text size', 'num', 11, { min: 7, max: 36, step: .5, unit: 'px' });
def('Bubble text', 'unread.bubble', 'un.f.weight', 'Weight', 'select', '700', { opts: [['400', 'Regular'], ['700', 'Bold']] });
def('Bubble text', 'unread.bubble', 'un.f.color', 'Text color', 'color', '#111111');
def('Bubble text', 'unread.bubble', 'un.f.lh', 'Line spacing', 'num', 1.15, { min: .8, max: 2, step: .01, unit: '×' });
def('Bubble text', 'unread.bubble', 'un.f.align', 'Alignment', 'select', 'center', { opts: [['center', 'Center'], ['left', 'Left']] });
def('Bubble text', 'unread.bubble', 'un.f.caps', 'ALL CAPS', 'bool', false);
def('Bubble text', 'unread.bubble', 'un.f.name', 'Name on top', 'bool', true);
def('Bubble text', 'unread.bubble', 'un.f.nameColor', 'Name color', 'color', '#0B6BCB');
def('Bubble text', 'unread.bubble', 'un.f.nameSize', 'Name size', 'num', 9, { min: 6, max: 30, step: .5, unit: 'px' });
// badge
def('Unread badge', 'unread.badge', 'un.u.on', 'Unread count badge', 'bool', true);
def('Unread badge', 'unread.badge', 'un.u.where', 'Sits', 'select', 'feet', { opts: [['feet', 'Under their feet'], ['head', 'Above their head'], ['bubble', 'On the bubble corner']] });
def('Unread badge', 'unread.badge', 'un.u.gap', 'Distance from feet / head', 'num', 12, { min: -60, max: 80, step: 1, unit: 'px' });
def('Unread badge', 'unread.badge', 'un.u.style', 'Look', 'select', 'pill', { opts: [['pill', 'Colored pill'], ['plain', 'Just the number']] });
def('Unread badge', 'unread.badge', 'un.u.label', 'Word after the number', 'text', '', { info: 'Leave empty for just the number, or type e.g. "new" to show "2 new".' });
def('Unread badge', 'unread.badge', 'un.u.color', 'Badge color', 'color', '#FF3B30');
def('Unread badge', 'unread.badge', 'un.u.text', 'Number color', 'color', '#FFFFFF');
def('Unread badge', 'unread.badge', 'un.u.size', 'Badge size', 'num', 18, { min: 8, max: 44, step: .5, unit: 'px' });
// name label (no bubble needed)
def('Name label', 'unread.name', 'un.n.on', 'Show their name', 'bool', false, { info: 'Their name on its own, no bubble. Drag it on the phone to move it.' });
def('Name label', 'unread.name', 'un.n.where', 'Sits', 'select', 'feet', { opts: [['feet', 'Under their feet'], ['head', 'Above their head']] });
def('Name label', 'unread.name', 'un.n.gap', 'Distance from feet / head', 'num', 32, { min: -80, max: 120, step: 1, unit: 'px', info: 'Under the feet this sits below the unread number by default.' });
def('Name label', 'unread.name', 'un.n.font', 'Font', 'select', 'Roboto', { opts: [['Roboto', 'Roboto (app font)'], ['Comic Neue', 'Comic Neue'], ['Bangers', 'Bangers (comic caps)'], ['Patrick Hand', 'Patrick Hand (handwritten)'], ['Cinzel', 'Cinzel (Norse / carved)']] });
def('Name label', 'unread.name', 'un.n.size', 'Size', 'num', 12, { min: 6, max: 40, step: .5, unit: 'px' });
def('Name label', 'unread.name', 'un.n.weight', 'Weight', 'select', '500', { opts: [['400', 'Regular'], ['500', 'Medium'], ['700', 'Bold']] });
def('Name label', 'unread.name', 'un.n.color', 'Color', 'color', '#FFFFFF');
def('Name label', 'unread.name', 'un.n.caps', 'ALL CAPS', 'bool', false);
def('Name label', 'unread.name', 'un.n.spacing', 'Letter spacing', 'num', 0, { min: -2, max: 10, step: .1, unit: 'px' });
def('Name label', 'unread.name', 'un.n.shadow', 'Shadow behind letters', 'num', .85, { min: 0, max: 1, step: .01 });
def('Name label', 'unread.name', 'un.n.bg', 'Background pill', 'bool', false);
def('Name label', 'unread.name', 'un.n.bgColor', 'Pill color', 'color', '#000000');
def('Name label', 'unread.name', 'un.n.bgOp', 'Pill opacity', 'num', .5, { min: 0, max: 1, step: .01 });
def('Name label', 'unread.name', 'un.n.first', 'First name only', 'bool', true);
// arrival
def('Arrival', 'unread', 'un.a.style', 'How people appear', 'select', 'rise', { opts: [['fade', 'Fade in'], ['rise', 'Rise in'], ['pop', 'Pop in'], ['beam', 'Build up from the feet'], ['none', 'Already there']] });
def('Arrival', 'unread', 'un.a.wait', 'Start after page opens', 'int', 2800, { min: 0, max: 8000, step: 10, unit: 'ms', info: 'Default waits for the dial to finish building.' });
def('Arrival', 'unread', 'un.a.dur', 'Appear time', 'int', 700, { min: 50, max: 4000, step: 10, unit: 'ms' });
def('Arrival', 'unread', 'un.a.gap', 'Delay between people', 'int', 220, { min: 0, max: 2000, step: 10, unit: 'ms' });
def('Arrival', 'unread', 'un.a.bubble', 'How bubbles appear', 'select', 'pop', { opts: [['pop', 'Pop'], ['fade', 'Fade'], ['type', 'Type out the words'], ['none', 'With the person']] });
def('Arrival', 'unread', 'un.a.bubbleDelay', 'Bubble delay after person', 'int', 150, { min: 0, max: 3000, step: 10, unit: 'ms' });
def('Arrival', 'unread', 'un.a.loop', 'Replay on a loop while editing', 'bool', false, { info: 'Studio only.' });

sc.SPEC.unshift(...ADD);
ADD.forEach(s => { sc.DEF[s.k] = s.def; sc.P[s.k] = s.def; });
sc.ui.group = G0; sc.ui.section = 'People';

/* ---------- fonts ---------- */
try { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Cinzel:wght@500;700&family=Comic+Neue:wght@400;700&family=Patrick+Hand&display=swap'; document.head.appendChild(l); } catch (e) {}

/* ---------- batches ---------- */
const P = () => sc.P;
const off = document.createElement('canvas'), ox = off.getContext('2d');
const L = { figs: [], bubs: [], badges: [], names: [] };
function unreadList() { const p = P(), n = clamp(Math.round(p['un.total']), 0, LIST), out = []; for (let j = 0; j < n; j++) if (!READ.has(j) && BY_ID[p['un.p' + j + '.who']]) out.push(j); return out; }
function spotsOn() { const p = P(), n = clamp(Math.round(p['un.count']), 1, MAX), out = []; for (let i = 0; i < n; i++) if (p['un.p' + i + '.show']) out.push(i); return out; }
function pageCount() { const sp = spotsOn().length; return sp ? Math.max(1, Math.ceil(unreadList().length / sp)) : 1; }
function batch(page) {
  const p = P(), list = unreadList(), sp = spotsOn(), start = page * sp.length;
  return sp.map((i, k) => { const j = list[start + k]; if (j === undefined) return null; const lq = 'un.p' + j + '.';
    return { i, j, q: 'un.p' + i + '.', lq, order: k, who: BY_ID[p[lq + 'who']], layer: p['un.p' + i + '.layer'] }; }).filter(s => s && s.who);
}
function turnPage(dir) {
  const n = pageCount(); let np = SW.page + dir;
  if (np < 0 || np >= n) { if (!P()['un.sw.loop'] || n < 2) return false; np = (np + n) % n; }
  SW.from = SW.page; SW.page = np; SW.dir = dir; SW.t = performance.now(); return true;
}
function nextBatch() { if (!turnPage(1) && pageCount() > 1) { SW.from = SW.page; SW.page = 0; SW.dir = -1; SW.t = performance.now(); } }

/* ---------- draw ---------- */
function figGeom(s) {
  const p = P(), a = art(s.who.id), box = a.box; if (!box) return null;
  const H = (s.ov ? s.ov.H : p['un.same'] ? p['un.sameH'] : p[s.q + 'h']) * p['un.scaleAll'], k = H / Math.max(1, box.b - box.t);
  const X = s.ov ? s.ov.X : p[s.q + 'x'] * K.W, Y = s.ov ? s.ov.Y : (p['un.sameFeet'] ? p['un.sameY'] : p[s.q + 'y']) * K.H, w = (box.r - box.l) * k;
  return { X, Y, H, k, w, top: Y - H, box, a };
}
function arrival(order, now, arrived) {
  const p = P(); if (arrived || p['un.a.style'] === 'none') return { u: 1, b: 1, chars: Infinity, bs: 1e9 };
  const el = now - T0 - p['un.a.wait'] - order * p['un.a.gap'];
  const u = clamp(el / Math.max(1, p['un.a.dur']), 0, 1);
  const bs = el - p['un.a.dur'] * .6 - p['un.a.bubbleDelay'];
  const b = p['un.a.bubble'] === 'none' ? u : clamp(bs / 280, 0, 1);
  return { u, b, chars: p['un.a.bubble'] === 'type' ? Math.max(0, Math.floor(bs / 32)) : Infinity, bs };
}
function frameOf(s, g, now) {
  const p = P(), a = g.a, spin = s.who.is360 && p[s.lq + 'spin'] && ready(a.spin);
  if (spin) { const pos = ((now / 1000) / Math.max(.5, p[s.lq + 'spinSec']) % 1) * a.sn, f0 = Math.floor(pos) % a.sn; return { im: a.spin, n: a.sn, f0, f1: (f0 + 1) % a.sn, mix: pos - Math.floor(pos) }; }
  const turn = s.ov && s.ov.turn != null ? s.ov.turn : p[s.q + 'turn'];
  const mid = (a.n - 1) / 2, pos = clamp(mid + clamp(turn, -60, 60) / 60 * mid, 0, a.n - 1), f0 = Math.floor(pos);
  return { im: a.prof, n: a.n, f0, f1: Math.min(f0 + 1, a.n - 1), mix: pos - f0 };
}
function drawFigure(ctx, s, g, now, ar) {
  const p = P(), fr = frameOf(s, g, now), fw = Math.floor(fr.im.naturalWidth / fr.n), fh = fr.im.naturalHeight, k = g.k;
  const dw = fw * k, dh = fh * k, cx = (g.box.l + g.box.r) / 2 * k, dx = g.X - cx, dy = g.Y - g.box.b * k;
  let alpha = p['un.opacity'] * (s.ov && s.ov.alpha != null ? s.ov.alpha : 1), yOff = 0, sc0 = 1, reveal = 1; const e = smooth(ar.u), st = p['un.a.style'];
  if (st === 'fade') alpha *= e; else if (st === 'rise') { alpha *= e; yOff = (1 - e) * 40; } else if (st === 'pop') { alpha *= e; sc0 = .6 + .4 * e; } else if (st === 'beam') { reveal = e; alpha *= Math.min(1, e * 4); }
  if (p['un.flicker'] > 0) { const ph = now / 1000 * TAU * 6 + s.i * 1.7; alpha *= 1 - p['un.flicker'] * .25 * (1 + Math.sin(ph) * Math.sin(ph * 2.3 + 1)) / 2; }
  if (alpha <= .001) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(g.X, g.Y + yOff); ctx.scale(sc0, sc0); if (p[s.q + 'flip']) ctx.scale(-1, 1); ctx.translate(-g.X, -g.Y);
  if (p['un.shadow']) { const rx = g.w * p['un.shadowW'] / 2, ry = Math.max(2, g.H * p['un.shadowH'] / 2), gr = ctx.createRadialGradient(g.X, g.Y, 0, g.X, g.Y, rx);
    gr.addColorStop(0, `rgba(0,0,0,${p['un.shadowOp']})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.translate(g.X, g.Y); ctx.scale(1, ry / rx); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore(); }
  const ry = g.Y - (g.Y - dy) * reveal;
  if (reveal < 1) { ctx.save(); ctx.beginPath(); ctx.rect(dx - 20, ry, dw + 40, g.Y - ry + 4); ctx.clip(); }
  const put = (f, a) => { if (a <= .002) return; ctx.globalAlpha *= a; ctx.drawImage(fr.im, f * fw, 0, fw, fh, dx, dy, dw, dh); ctx.globalAlpha /= a; };
  if (p['un.edge'] > 0) {
    const kk = K.scaleOf(ctx), cw = Math.max(2, Math.ceil(dw * kk)), ch = Math.max(2, Math.ceil(dh * kk));
    if (off.width < cw || off.height < ch) { off.width = Math.max(off.width, cw); off.height = Math.max(off.height, ch); }
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalCompositeOperation = 'source-over'; ox.clearRect(0, 0, off.width, off.height); ox.drawImage(fr.im, fr.f0 * fw, 0, fw, fh, 0, 0, cw, ch);
    ox.globalCompositeOperation = 'source-in'; ox.fillStyle = p['un.edgeColor']; ox.fillRect(0, 0, cw, ch); ox.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.globalAlpha *= p['un.edge']; ctx.filter = `blur(${(p['un.edgeBlur'] * kk).toFixed(2)}px)`; ctx.drawImage(off, 0, 0, cw, ch, dx, dy, dw, dh); ctx.restore();
  }
  ctx.filter = `brightness(${p['un.bright'] * (s.ov && s.ov.dim != null ? s.ov.dim : 1)}) contrast(${p['un.contrast']}) saturate(${p['un.sat']})`;
  put(fr.f0, 1); if (fr.f1 !== fr.f0) put(fr.f1, fr.mix);
  ctx.filter = 'none';
  if (reveal < 1) { ctx.restore(); ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 2); ctx.fillStyle = 'rgba(220,245,255,.9)'; ctx.fillRect(dx, ry - 1, dw, 2); }
  ctx.restore();
}
function wrapText(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines.length ? lines : [''];
}
function fontOf(size, weight, fam) { return `${weight} ${size}px "${fam}", ${fam === 'Roboto' ? 'Roboto, ' : ''}system-ui, sans-serif`; }
function bubbleLayout(ctx, s, g) {
  const p = P(), z = p[s.q + 'bScale'], fs = p['un.f.size'] * z, fam = p['un.f.font'], wt = p['un.f.weight'];
  let msg = p[s.lq + 'msg']; if (p['un.f.caps']) msg = String(msg).toUpperCase();
  ctx.save(); ctx.font = fontOf(fs, wt, fam); const lines = wrapText(ctx, msg, p['un.b.maxW'] * z); const tw = Math.max(...lines.map(l => ctx.measureText(l).width));
  let nw = 0, nh = 0; if (p['un.f.name']) { ctx.font = fontOf(p['un.f.nameSize'] * z, 700, fam); nw = ctx.measureText(s.who.name).width; nh = p['un.f.nameSize'] * z * 1.2; } ctx.restore();
  const lh = fs * p['un.f.lh'], cw = Math.max(tw, nw), ch = nh + lines.length * lh;
  let w = cw + p['un.b.padX'] * 2 * z, h = ch + p['un.b.padY'] * 2 * z; const style = p['un.b.style'];
  if (style === 'oval') { w *= 1.22; h *= 1.5; } else if (style === 'cloud') { w += 14 * z; h += 14 * z; }
  const headX = g.X, headY = g.top + g.H * .06, headR = Math.max(8, g.w * .22);
  let side = p[s.q + 'bSide']; if (side === 'auto') side = g.X < K.W / 2 ? 'right' : 'left';
  const gap = p['un.b.gap'] * z; let cx, cy;
  if (side === 'above') { cx = headX; cy = g.top - gap - h / 2 - 10 * z; }
  else { const dir = side === 'right' ? 1 : -1; cx = headX + dir * (headR + gap + w / 2); cy = headY - h * .35; }
  cx += p[s.q + 'bx']; cy += p[s.q + 'by'];
  if (p['un.keepOn']) { cx = clamp(cx, w / 2 + 4, K.W - w / 2 - 4); cy = clamp(cy, h / 2 + 4, K.H - h / 2 - 4); }
  const aim = { x: headX + (side === 'left' ? -1 : side === 'right' ? 1 : 0) * headR * .35, y: g.top + g.H * p['un.t.aimY'] };
  return { cx, cy, w, h, lines, lh, fs, nh, z, side, aim, style, fam, wt };
}
function bodyPath(ctx, b) {
  const p = P(), x = b.cx - b.w / 2, y = b.cy - b.h / 2;
  ctx.beginPath();
  if (b.style === 'oval') ctx.ellipse(b.cx, b.cy, b.w / 2, b.h / 2, 0, 0, TAU);
  else if (b.style === 'box') ctx.rect(x, y, b.w, b.h);
  else if (b.style === 'cloud') {
    const r = Math.max(5, 9 * b.z), ix = x + r * .6, iy = y + r * .6, iw = b.w - r * 1.2, ih = b.h - r * 1.2; ctx.rect(ix, iy, iw, ih);
    const per = 2 * (iw + ih), n = Math.max(8, Math.round(per / (r * 1.35)));
    for (let k = 0; k < n; k++) { let d = k / n * per, px, py; if (d < iw) { px = ix + d; py = iy; } else if ((d -= iw) < ih) { px = ix + iw; py = iy + d; } else if ((d -= ih) < iw) { px = ix + iw - d; py = iy + ih; } else { d -= iw; px = ix; py = iy + ih - d; }
      const rr = r * (.85 + .3 * Math.abs(Math.sin(k * 2.17))); ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, TAU); }
  } else ctx.roundRect(x, y, b.w, b.h, Math.min(p['un.b.round'] * b.z, b.h / 2, b.w / 2));
}
function tailPath(ctx, b) {
  const p = P(); ctx.beginPath(); if (!p['un.t.on']) return false;
  const dx = b.aim.x - b.cx, dy = b.aim.y - b.cy, L0 = Math.hypot(dx, dy) || 1, ux = dx / L0, uy = dy / L0;
  const edge = Math.min(Math.abs((b.w / 2) / (ux || 1e-6)), Math.abs((b.h / 2) / (uy || 1e-6))) * (b.style === 'oval' ? .82 : 1);
  const bx = b.cx + ux * edge * .7, by = b.cy + uy * edge * .7, reach = Math.max(0, L0 - edge) * p['un.t.len'];
  const tx = b.cx + ux * (edge + reach), ty = b.cy + uy * (edge + reach), tw = p['un.t.w'] * b.z / 2, nx = -uy, ny = ux, bend = p['un.t.bend'] * (reach + edge * .3) * .5;
  if (b.style === 'cloud') { for (const [f, rr] of [[.45, .32], [.8, .2]]) { const px = bx + (tx - bx) * f, py = by + (ty - by) * f, R = tw * rr * 2.2; ctx.moveTo(px + R, py); ctx.arc(px, py, R, 0, TAU); } }
  else { ctx.moveTo(bx + nx * tw, by + ny * tw); ctx.quadraticCurveTo((bx + tx) / 2 + nx * bend, (by + ty) / 2 + ny * bend, tx, ty); ctx.quadraticCurveTo((bx + tx) / 2 + nx * bend * .6, (by + ty) / 2 + ny * bend * .6, bx - nx * tw, by - ny * tw); ctx.closePath(); }
  return true;
}
function drawBubble(ctx, s, b, ar, count) {
  const p = P(), how = p['un.a.bubble']; if (how === 'type' ? ar.bs < 0 : ar.b <= 0) return;
  let sc0 = 1, alpha = p['un.b.opacity'];
  if (how === 'pop') { const t = ar.b; sc0 = t < 1 ? .3 + .7 * (1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)) : 1; alpha *= Math.min(1, t * 3); }
  else if (how === 'fade' || how === 'none') alpha *= ar.b;
  if (alpha <= .001) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(b.cx, b.cy); ctx.rotate(p['un.b.tilt'] * Math.PI / 180); ctx.scale(sc0, sc0); ctx.translate(-b.cx, -b.cy);
  const lw = p['un.b.lineW'], both = fn => { if (tailPath(ctx, b)) fn(); bodyPath(ctx, b); fn(); };
  if (p['un.b.shadow'] && p['un.b.shadowOp'] > 0) { ctx.save(); ctx.shadowColor = rgba(p['un.b.shadowColor'], p['un.b.shadowOp']); ctx.shadowBlur = p['un.b.shadowBlur'] * K.scaleOf(ctx); ctx.shadowOffsetY = p['un.b.shadowY'] * K.scaleOf(ctx); ctx.fillStyle = rgba(p['un.b.fill'], Math.max(.01, p['un.b.fillOp'])); both(() => ctx.fill()); ctx.restore(); }
  if (lw > 0) { ctx.lineJoin = 'round'; ctx.lineWidth = lw * 2; ctx.strokeStyle = p['un.b.line']; both(() => ctx.stroke()); }
  ctx.fillStyle = rgba(p['un.b.fill'], p['un.b.fillOp']); both(() => ctx.fill());
  ctx.textBaseline = 'middle'; ctx.font = fontOf(b.fs, b.wt, b.fam); const left = p['un.f.align'] === 'left', tx = left ? b.cx - Math.max(0, ...b.lines.map(l => ctx.measureText(l).width)) / 2 : b.cx;
  ctx.textAlign = left ? 'left' : 'center';
  let y = b.cy - (b.nh + b.lines.length * b.lh) / 2;
  if (b.nh) { ctx.font = fontOf(p['un.f.nameSize'] * b.z, 700, b.fam); ctx.fillStyle = p['un.f.nameColor']; ctx.fillText(s.who.name, tx, y + b.nh / 2); y += b.nh; }
  ctx.font = fontOf(b.fs, b.wt, b.fam); ctx.fillStyle = p['un.f.color']; let left2 = ar.chars;
  for (const l of b.lines) { const show = left2 >= l.length ? l : l.slice(0, Math.max(0, left2)); left2 -= l.length + 1; if (show) ctx.fillText(show, tx, y + b.lh / 2); y += b.lh; }
  ctx.restore();
  if (p['un.u.on'] && count > 0 && p['un.u.where'] === 'bubble') badge(ctx, b.cx + b.w / 2 * (b.style === 'oval' ? .72 : .96), b.cy - b.h / 2 * (b.style === 'oval' ? .72 : .96), count, alpha);
}
function badge(ctx, x, y, n, alpha) {
  const p = P(), r = p['un.u.size'] / 2, t = (n > 99 ? '99+' : String(n)) + (p['un.u.label'] ? ' ' + p['un.u.label'] : '');
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `700 ${(r * 1.15).toFixed(1)}px Roboto, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const hw = Math.max(r, ctx.measureText(t).width / 2 + r * .55);
  if (p['un.u.style'] === 'pill') { ctx.fillStyle = p['un.u.color']; ctx.beginPath(); ctx.roundRect(x - hw, y - r, hw * 2, r * 2, r); ctx.fill(); ctx.fillStyle = p['un.u.text']; }
  else { ctx.fillStyle = p['un.u.color']; ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 4 * K.scaleOf(ctx); }
  ctx.fillText(t, x, y + .5); ctx.restore();
  return { x: x - hw, y: y - r, w: hw * 2, h: r * 2 };
}
function nameLabel(ctx, s, g, alpha) {
  const p = P(); let t = s.who.name; if (p['un.n.first']) t = t.split(' ')[0]; if (p['un.n.caps']) t = t.toUpperCase();
  const fs = p['un.n.size'], x = g.X + p[s.q + 'nx'], y = (p['un.n.where'] === 'head' ? g.top - p['un.n.gap'] - fs / 2 : g.Y + p['un.n.gap'] + fs / 2) + p[s.q + 'ny'];
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${p['un.n.weight']} ${fs}px "${p['un.n.font']}", Roboto, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = p['un.n.spacing'] + 'px'; } catch (e) {}
  const w = ctx.measureText(t).width, padX = fs * .55, padY = fs * .3, box = { x: x - w / 2 - padX, y: y - fs / 2 - padY, w: w + padX * 2, h: fs + padY * 2 };
  if (p['un.n.bg']) { ctx.fillStyle = rgba(p['un.n.bgColor'], p['un.n.bgOp']); ctx.beginPath(); ctx.roundRect(box.x, box.y, box.w, box.h, box.h / 2); ctx.fill(); }
  if (p['un.n.shadow'] > 0) { ctx.shadowColor = `rgba(0,0,0,${p['un.n.shadow']})`; ctx.shadowBlur = 4 * K.scaleOf(ctx); }
  ctx.fillStyle = p['un.n.color']; ctx.fillText(t, x, y + .5); ctx.restore();
  return box;
}
function drawBatch(ctx, now, page, shiftX, alpha, record, arrived) {
  const p = P(), list = batch(page).map(s => ({ s, g: figGeom(s) })).filter(o => o.g);
  list.sort((a, b) => (a.s.layer - b.s.layer) || (a.g.Y - b.g.Y));
  ctx.save(); ctx.translate(shiftX, 0); ctx.globalAlpha *= alpha;
  for (const o of list) { o.ar = arrival(o.s.order, now, arrived); drawFigure(ctx, o.s, o.g, now, o.ar); if (record) L.figs.push({ i: o.s.i, j: o.s.j, x: o.g.X - o.g.w / 2 + shiftX, y: o.g.top, w: o.g.w, h: o.g.H }); }
  for (const o of list) {
    const cnt = p[o.s.lq + 'count'], where = p['un.u.where'];
    if (p['un.b.on']) { const b = bubbleLayout(ctx, o.s, o.g); drawBubble(ctx, o.s, b, o.ar, where === 'bubble' ? cnt : 0); if (record) L.bubs.push({ i: o.s.i, j: o.s.j, x: b.cx - b.w / 2 + shiftX, y: b.cy - b.h / 2, w: b.w, h: b.h }); }
    if (p['un.u.on'] && cnt > 0 && (where !== 'bubble' || !p['un.b.on'])) {
      const r = p['un.u.size'] / 2, y = (where === 'head' ? o.g.top - p['un.u.gap'] - r : o.g.Y + p['un.u.gap'] + r) + p[o.s.q + 'uy'];
      const bb = badge(ctx, o.g.X + p[o.s.q + 'ux'], y, cnt, smooth(o.ar.u)); if (record) L.badges.push({ i: o.s.i, j: o.s.j, x: bb.x + shiftX, y: bb.y, w: bb.w, h: bb.h });
    }
    if (p['un.n.on']) { const nb = nameLabel(ctx, o.s, o.g, smooth(o.ar.u)); if (nb && record) L.names.push({ i: o.s.i, j: o.s.j, x: nb.x + shiftX, y: nb.y, w: nb.w, h: nb.h }); }
  }
  ctx.restore();
}
function carousel(now) {
  const p = P(), list = unreadList(), n = list.length, ring = p['un.layout'] === 'ring', out = [];
  if (!n) return out;
  const dt = Math.min(.05, Math.max(0, (now - (CAR.last || now)) / 1000)); CAR.last = now;
  const unit = ring ? 1 : p['un.c.gap'];
  if (!CAR.drag) {
    if (p['un.c.auto']) CAR.pos += p['un.c.auto'] * dt / (ring ? p['un.c.gap'] : 1);
    else if (p['un.c.inertia'] && Math.abs(CAR.vel) > .01) { CAR.pos += CAR.vel * dt; CAR.vel *= Math.pow(p['un.c.friction'], dt * 60); }
    else CAR.vel = 0;
    if (p['un.c.snap'] && !p['un.c.auto'] && Math.abs(CAR.vel) < (ring ? .6 : 60)) { const tgt = Math.round(CAR.pos / unit) * unit; CAR.pos += (tgt - CAR.pos) * Math.min(1, dt * 10); CAR.vel *= .8; }
    if (!ring && !p['un.c.loop']) CAR.pos = clamp(CAR.pos, 0, (n - 1) * unit);
  }
  const pl = { i: 0, q: 'un.p0.' }, Y0 = p['un.c.y'] * K.H, H0 = p['un.c.h'];
  list.forEach((j, k) => {
    const lq = 'un.p' + j + '.', who = BY_ID[p[lq + 'who']]; if (!who) return;
    let X, Y = Y0, H = H0, turn = 0, dim = 1, alpha = 1, depth = 1;
    if (ring) {
      const ang = (k - CAR.pos) / n * TAU, c = Math.cos(ang), sn = Math.sin(ang), f = (c + 1) / 2;
      X = K.W / 2 + sn * p['un.c.radius'] * K.W; depth = c;
      H = H0 * (p['un.c.depth'] + (1 - p['un.c.depth']) * f) * (1 + (p['un.c.focus'] - 1) * Math.max(0, c) ** 6);
      Y = Y0 - (1 - f) * p['un.c.lift']; dim = 1 - p['un.c.dim'] * (1 - f); if (p['un.c.turn']) turn = clamp(sn * 60 * (c < 0 ? -1 : 1), -60, 60);
    } else {
      let off = k * unit - CAR.pos; if (p['un.c.loop'] && n > 1) { const span = n * unit; off = ((off % span) + span * 1.5) % span - span / 2; }
      X = K.W / 2 + off; H = H0 * (1 + (p['un.c.focus'] - 1) * Math.max(0, 1 - Math.abs(off) / unit));
      const fd = p['un.c.fade']; if (fd > 0) alpha = clamp(Math.min(X, K.W - X) / fd, 0, 1);
      depth = 1 - Math.abs(off) / (K.W);
    }
    out.push({ i: 0, j, q: pl.q, lq, order: k, who, layer: depth, ov: { X, Y, H, turn, dim, alpha } });
  });
  return out;
}
function drawCarousel(ctx, now) {
  const p = P(), list = carousel(now).map(s => ({ s, g: figGeom(s) })).filter(o => o.g && (o.s.ov.alpha > .01));
  list.sort((a, b) => a.s.layer - b.s.layer);
  for (const o of list) { o.ar = arrival(0, now, SW.from >= 0 || CAR.moved); drawFigure(ctx, o.s, o.g, now, o.ar); L.figs.push({ i: o.s.i, j: o.s.j, x: o.g.X - o.g.w / 2, y: o.g.top, w: o.g.w, h: o.g.H }); }
  for (const o of list) {
    const cnt = p[o.s.lq + 'count'], where = p['un.u.where'], a = smooth(o.ar.u) * o.s.ov.alpha;
    if (p['un.b.on']) { const b = bubbleLayout(ctx, o.s, o.g); drawBubble(ctx, o.s, b, o.ar, where === 'bubble' ? cnt : 0); }
    if (p['un.u.on'] && cnt > 0 && (where !== 'bubble' || !p['un.b.on'])) { const r = p['un.u.size'] / 2, y = (where === 'head' ? o.g.top - p['un.u.gap'] - r : o.g.Y + p['un.u.gap'] + r) + p[o.s.q + 'uy']; badge(ctx, o.g.X + p[o.s.q + 'ux'], y, cnt, a); }
    if (p['un.n.on']) nameLabel(ctx, o.s, o.g, a);
  }
}
function drawUnread(ctx, now) {
  const p = P(); L.figs = []; L.bubs = []; L.badges = []; L.names = [];
  if (!p['un.on']) return;
  if (p['un.layout'] !== 'batches') { drawCarousel(ctx, now); return; }
  const n = pageCount(); if (SW.page >= n) SW.page = n - 1; if (SW.page < 0) SW.page = 0;
  const editingArrival = !K.viewOnly && K.cur === sc && (sc.ui.node ? sc.ui.node.pairs.some(q => q[1] === 'Arrival') : sc.ui.section === 'Arrival');
  if (p['un.a.loop'] || editingArrival) { const total = p['un.a.wait'] + spotsOn().length * p['un.a.gap'] + p['un.a.dur'] + 2600; if (now - T0 > total) { T0 = now; SW.page = 0; SW.from = -1; } }
  const st = p['un.sw.style'], u = st === 'none' ? 1 : clamp((now - SW.t) / Math.max(1, p['un.sw.ms']), 0, 1), e = smooth(u);
  const swiped = SW.from >= 0;
  if (u < 1 && swiped && SW.from !== SW.page) {
    if (st === 'slide') { drawBatch(ctx, now, SW.from, -SW.dir * K.W * e, 1, false, true); drawBatch(ctx, now, SW.page, SW.dir * K.W * (1 - e), 1, true, true); }
    else { drawBatch(ctx, now, SW.from, 0, 1 - e, false, true); drawBatch(ctx, now, SW.page, 0, e, true, true); }
  } else drawBatch(ctx, now, SW.page, p['un.sw.follow'] ? SW.dx : 0, 1, true, swiped);
  if (p['un.dots'] && n > 1) {
    const r = p['un.dotsSize'] / 2, gap = p['un.dotsGap'], tw = n * r * 2 + (n - 1) * gap, y = p['un.dotsY'] * K.H; let x = K.W / 2 - tw / 2 + r;
    ctx.save(); for (let k = 0; k < n; k++) { ctx.globalAlpha = k === SW.page ? 1 : p['un.dotsOff']; ctx.fillStyle = p['un.dotsColor']; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); x += r * 2 + gap; } ctx.restore();
  }
}

/* ---------- hook into the dial screen ---------- */
const draw0 = sc.draw;
sc.draw = function (ctx, now, studio) {
  draw0.call(this, ctx, now, studio);
  try { drawUnread(ctx, now); } catch (e) { console.error(e); }
  if (studio && String(K.currentTarget ? K.currentTarget() : '').startsWith('unread')) K.hl(ctx, now);
};
const inside = (p, r, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
function hit(p) {
  if (!P()['un.on']) return null;
  for (const [arr, kind] of [[L.badges, 'badge'], [L.names, 'name'], [L.bubs, 'bubble']]) for (let k = arr.length - 1; k >= 0; k--) if (inside(p, arr[k], 3)) return { kind, i: arr[k].i, j: arr[k].j };
  for (let k = L.figs.length - 1; k >= 0; k--) { const f = L.figs[k]; if (inside(p, { x: f.x + f.w * .1, y: f.y, w: f.w * .8, h: f.h }, 2)) return { kind: 'fig', i: f.i, j: f.j }; }
  return null;
}
function band() { const p = P(); if (p['un.layout'] !== 'batches') return p['un.c.y'] * K.H + 40; let b = 0; for (const i of spotsOn()) b = Math.max(b, p['un.p' + i + '.y'] * K.H); return b + 18; }
const hl0 = sc.highlight;
sc.highlight = function (ctx, base, sub, H1, now) {
  if (!String(base).startsWith('unread')) return hl0.call(this, ctx, base, sub, H1, now);
  const box = r => () => { ctx.beginPath(); ctx.roundRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, 8); };
  if (base === 'unread.p') { [L.figs, L.bubs, L.badges, L.names].forEach(a => { const r = a.find(q => q.i === +sub); if (r) H1(box(r)); }); return; }
  if (base === 'unread.badge') { (L.badges.length ? L.badges : L.bubs).forEach(b => H1(box(b))); return; }
  if (base === 'unread.name') { L.names.forEach(b => H1(box(b))); return; }
  if (base === 'unread.bubble') { L.bubs.forEach(b => H1(box(b))); return; }
  L.figs.forEach(f => H1(box(f)));
};
const bounds0 = sc.bounds;
sc.bounds = function (base, sub) {
  if (!String(base).startsWith('unread')) return bounds0.call(this, base, sub);
  const rs = base === 'unread.p' ? [...L.figs, ...L.bubs, ...L.badges, ...L.names].filter(r => r.i === +sub) : base === 'unread' ? L.figs.concat(L.bubs, L.badges, L.names) : base === 'unread.badge' ? (L.badges.length ? L.badges.concat(L.figs) : L.bubs) : base === 'unread.name' ? L.names.concat(L.figs) : L.bubs;
  if (!rs.length) return bounds0.call(this, null, null);
  const x = Math.min(...rs.map(r => r.x)), y = Math.min(...rs.map(r => r.y)), x2 = Math.max(...rs.map(r => r.x + r.w)), y2 = Math.max(...rs.map(r => r.y + r.h)), s = Math.max(x2 - x, y2 - y) * 1.15 + 20;
  return { x: (x + x2) / 2 - s / 2, y: (y + y2) / 2 - s / 2, s };
};
const pick0 = sc.pick;
sc.pick = function (p) { const h = hit(p); if (h) return [G0, { bubble: 'Bubble shape', badge: 'Unread badge', name: 'Name label' }[h.kind] || 'Spot ' + (h.i + 1)]; return pick0.call(this, p); };

function openConversation(j) {
  const who = BY_ID[P()['un.p' + j + '.who']], conv = K.screens.conversation;
  if (!conv) { K.status('Tapped ' + (who ? who.name : '') + ': opens their conversation in the app.'); return; }
  READ.add(j); sc._backFromConv = true; conv.withName = who ? who.name : ''; conv.backTo = 'dial'; K.show('conversation');
}
let drag = null, swipe = null;
const snap = v => { const g = P()['un.snap']; return g > 0 ? Math.round(v / g) * g : v; };
const ptr0 = sc.pointer;
sc.pointer = {
  down(p, e) {
    const h = hit(p), P0 = P(), edit = !K.viewOnly && !P0['un.lock'];
    if (P0['un.on'] && P0['un.layout'] !== 'batches' && (h || p.y < band())) { swipe = { h, sx: p.x, sy: p.y, lx: p.x, lt: performance.now(), pos0: CAR.pos, moved: false, car: true }; CAR.drag = true; CAR.vel = 0; return; }
    if (h && edit) {
      const q = 'un.p' + h.i + '.';
      drag = { h, q, sx: p.x, sy: p.y, moved: false, x0: P0[q + 'x'], y0: P0[q + 'y'], bx0: P0[q + 'bx'], by0: P0[q + 'by'], ux0: P0[q + 'ux'], uy0: P0[q + 'uy'], nx0: P0[q + 'nx'], ny0: P0[q + 'ny'] };
      K.openSection(G0, h.kind === 'name' ? 'Name label' : h.kind === 'badge' ? 'Unread badge' : 'Spot ' + (h.i + 1)); return;
    }
    if (P0['un.on'] && (h || p.y < band())) { swipe = { h, sx: p.x, sy: p.y, moved: false }; SW.dx = 0; return; }
    return ptr0.down(p, e);
  },
  move(p, e) {
    if (drag) {
      const dx = p.x - drag.sx, dy = p.y - drag.sy; if (Math.hypot(dx, dy) > 4) drag.moved = true; if (!drag.moved) return;
      if (drag.h.kind === 'fig') { K.setVal(drag.q + 'x', +(snap(drag.x0 * K.W + dx) / K.W).toFixed(4)); K.setVal(drag.q + 'y', +(snap(drag.y0 * K.H + dy) / K.H).toFixed(4)); }
      else if (drag.h.kind === 'badge') { K.setVal(drag.q + 'ux', Math.round(snap(drag.ux0 + dx))); K.setVal(drag.q + 'uy', Math.round(snap(drag.uy0 + dy))); }
      else if (drag.h.kind === 'name') { K.setVal(drag.q + 'nx', Math.round(snap(drag.nx0 + dx))); K.setVal(drag.q + 'ny', Math.round(snap(drag.ny0 + dy))); }
      else { K.setVal(drag.q + 'bx', Math.round(snap(drag.bx0 + dx))); K.setVal(drag.q + 'by', Math.round(snap(drag.by0 + dy))); }
      return;
    }
    if (swipe && swipe.car) { const dx = p.x - swipe.sx, ring = P()['un.layout'] === 'ring', per = ring ? (P()['un.c.radius'] * K.W * 2 * Math.PI / Math.max(1, unreadList().length)) : 1;
      if (Math.abs(dx) > 6) { swipe.moved = true; CAR.moved = true; }
      const t = performance.now(), v = (p.x - swipe.lx) / Math.max(1, t - swipe.lt) * 1000; swipe.lx = p.x; swipe.lt = t; CAR.vel = -v / per; CAR.pos = swipe.pos0 - dx / per; return; }
    if (swipe) { const dx = p.x - swipe.sx, dy = p.y - swipe.sy; if (Math.hypot(dx, dy) > 6) swipe.moved = true; if (Math.abs(dx) > Math.abs(dy)) SW.dx = dx; return; }
    return ptr0.move(p, e);
  },
  up(p, e) {
    if (drag) { const d = drag; drag = null; if (d.moved) { if (K.commit) K.commit(); } else if (P()['un.tapStudio']) openConversation(d.h.j); return; }
    if (swipe && swipe.car) { const s = swipe; swipe = null; CAR.drag = false; if (!s.moved && s.h && (K.viewOnly || P()['un.tapStudio'])) openConversation(s.h.j); return; }
    if (swipe) {
      const s = swipe, dx = p.x - s.sx, dy = p.y - s.sy; swipe = null; SW.dx = 0;
      if (Math.abs(dx) >= P()['un.sw.min'] && Math.abs(dx) > Math.abs(dy)) { turnPage(dx < 0 ? 1 : -1); return; }
      if (!s.moved && s.h && (K.viewOnly || P()['un.tapStudio'])) openConversation(s.h.j);
      return;
    }
    return ptr0.up(p, e);
  },
  cancel(p, e) { if (drag || swipe) { drag = swipe = null; SW.dx = 0; CAR.drag = false; return; } if (ptr0.cancel) ptr0.cancel(p, e); },
};
sc.toolbar = (sc.toolbar || []).map(t => t.label === 'Replay' ? Object.assign({}, t, { onclick: () => { t.onclick(); T0 = performance.now(); SW.page = 0; SW.from = -1; } }) : t);
sc.toolbar.push({ label: 'Replay people', title: 'Play the unread people arriving again', onclick: () => { T0 = performance.now(); SW.page = 0; SW.from = -1; } });
sc.toolbar.push({ label: 'Next batch ›', title: 'Same as swiping left over the people', onclick: () => nextBatch() });
// things the Text & buttons layer can attach to / do on this page
sc.anchors = () => { const p = P(), out = [{ id: 'dial', label: 'The dial (middle)', x: K.W / 2, y: K.H * .62, fields: null }];
  for (let i = 0; i < MAX; i++) { const f = L.figs.find(r => r.i === i); const j = f ? f.j : null, who = j != null ? BY_ID[p['un.p' + j + '.who']] : null;
    out.push({ id: 'spot:' + i, label: 'Person on Spot ' + (i + 1), x: f ? f.x + f.w / 2 : null, y: f ? f.y + f.h : null, fields: who ? { name: who.name, count: p['un.p' + j + '.count'], msg: p['un.p' + j + '.msg'] } : null, open: j != null ? () => openConversation(j) : null }); }
  return out; };
sc.actions = () => [
  { id: 'nextBatch', label: 'Next batch of unread people', run: () => nextBatch() },
  { id: 'prevBatch', label: 'Previous batch of unread people', run: () => { turnPage(-1); } },
  { id: 'replayPeople', label: 'Replay the people arriving', run: () => { T0 = performance.now(); SW.page = 0; SW.from = -1; } },
  { id: 'sphere', label: 'Open the Rolodex sphere (everyone)', run: () => { if (K.screens.directory) K.show('directory'); } },
];
const show0 = sc.onShow, hide0 = sc.onHide;
sc.onShow = function () { if (show0) show0.call(this); if (!sc._backFromConv) { T0 = performance.now(); SW.page = 0; SW.from = -1; } else { SW.from = SW.page; SW.t = -1e9; } sc._backFromConv = false; buildTray(); tray(true); };
sc.onHide = function () { if (hide0) hide0.call(this); tray(false); };

/* ---------- tray: drag a face onto the phone ---------- */
let trayEl = null;
function tray(on) { if (!trayEl) buildTray(); if (trayEl) trayEl.style.display = on && !K.viewOnly ? '' : 'none'; }
function thumb(id) {
  const a = art(id), c = document.createElement('canvas'); c.width = 64; c.height = 112; c.draggable = true; c.title = 'Drag onto the phone';
  c.style.cssText = 'background:#0c1219;border:1px solid #233142;border-radius:8px;cursor:grab;width:48px;height:84px';
  if (a.box && ready(a.prof)) { const x = c.getContext('2d'), b = a.box, fw = Math.floor(a.prof.naturalWidth / a.n), k = Math.min(100 / (b.b - b.t), 58 / (b.r - b.l)); x.drawImage(a.prof, Math.floor(a.n / 2) * fw, 0, fw, a.prof.naturalHeight, 32 - (b.l + b.r) / 2 * k, 106 - b.b * k, fw * k, a.prof.naturalHeight * k); }
  c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', 'unread:' + id); e.dataTransfer.effectAllowed = 'copy'; });
  c.addEventListener('click', () => placePerson(id, null));
  return c;
}
function buildTray() {
  const host = document.getElementById('zoomBox'); if (!host) return;
  if (!trayEl) {
    trayEl = document.createElement('div'); trayEl.id = 'unTray';
    trayEl.style.cssText = 'background:#111821;border:1px solid #233142;border-radius:12px;padding:8px 10px;display:none';
    host.insertBefore(trayEl, host.firstChild);
    const stage = document.getElementById('stage');
    stage.addEventListener('dragover', e => { if (K.cur === sc) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
    stage.addEventListener('drop', e => { const d = e.dataTransfer.getData('text/plain') || ''; if (K.cur !== sc || !d.startsWith('unread:')) return; e.preventDefault(); const r = stage.getBoundingClientRect(); placePerson(d.slice(7), { x: (e.clientX - r.left) / r.width * K.W, y: (e.clientY - r.top) / r.height * K.H }); });
  }
  trayEl.innerHTML = '<div style="font-weight:500;margin-bottom:6px">Unread people · drag a face onto the phone</div><div style="color:#8ea3b8;font-size:12px;margin-bottom:6px">Drop on a person to swap them, or anywhere else to add them to the end of the unread list. Drag people and bubbles to place their spots. Swipe left / right over them for the next batch.</div>';
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  PEOPLE.forEach(q => { const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:#cfe'; w.append(thumb(q.id), Object.assign(document.createElement('span'), { textContent: q.name + (q.is360 ? ' · 360' : '') })); row.appendChild(w); });
  trayEl.appendChild(row);
  if (K.cur === sc) tray(true);
}
function placePerson(id, at) {
  const p = P(); if (!BY_ID[id]) return;
  const h = at ? hit(at) : null;
  if (h) { K.setVal('un.p' + h.j + '.who', id); K.openSection(G0, h.j < 6 ? 'Unread 1-6' : 'Unread 7-12'); if (K.commit) K.commit(); return; }
  const n = clamp(Math.round(p['un.total']), 0, LIST); if (n >= LIST) { K.status('The unread list is full (12). Drop the face on someone to swap them.'); return; }
  K.setVal('un.p' + n + '.who', id); K.setVal('un.total', n + 1); READ.delete(n);
  const sp = spotsOn().length || 1, idx = unreadList().indexOf(n); if (idx >= 0) { const pg = Math.floor(idx / sp); if (pg !== SW.page) { SW.from = SW.page; SW.dir = pg > SW.page ? 1 : -1; SW.page = pg; SW.t = performance.now(); } }
  K.openSection(G0, n < 6 ? 'Unread 1-6' : 'Unread 7-12'); if (K.commit) K.commit();
}
})();
