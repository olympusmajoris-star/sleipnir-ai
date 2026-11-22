/* =====================================================================
   GJALLARHORN — Heimdall scene. Screen module for studio-kit-1119.
   Port of the AsgardHeimdall custom widget (FlutterFlow export 2026-11-19):
   the drifting space panels bent around his outline (outline lens mesh),
   northern-lights curtains, bent stars, halo seam, planet with
   atmosphere / continents / cloud bands / city lights, the void figure,
   the gold horn, mist, pull-down-to-close. Same images from asgard_ui.
   ===================================================================== */
(() => {
'use strict';
const K = window.StudioKit;
const { TAU, clamp, rgba, scaleOf } = K;
let P = {};
const UI = 'https://afnihsdxtisneuyehatw.supabase.co/storage/v1/object/public/asgard_ui/';
const loadImg = src => { const i = new Image(); i.crossOrigin = 'anonymous'; i.src = src; return i; };
const VOID = loadImg(UI + 'heimdall_void_v1.png'), HORN = loadImg(UI + 'heimdall_horn_v2.png');
const PANELS = [0, 1, 2, 3, 4, 5, 6, 7].map(i => loadImg(UI + 'heimdall/space2_0' + (i + 1) + '.jpg'));
const COLS = [[40, 38, 38], [52, 52, 54], [39, 32, 34], [56, 48, 56], [46, 44, 53], [58, 47, 47], [56, 47, 45], [21, 18, 20]];
const TOP = 31, BOTTOM = 1419, HORN_R = [440, 31, 1009, 475];
const NRM = '387,234,5,-100,381,241,-80,-60,376,249,-86,-51,372,257,-90,-44,368,265,-94,-34,365,274,-96,-29,364,283,-98,-18,362,292,-100,-7,362,301,-99,-12,361,310,-100,4,362,319,-100,9,363,328,-98,20,366,337,-97,26,368,346,-96,30,371,354,-92,40,375,362,-91,41,379,370,-97,23,375,377,-69,-73,368,384,-20,-98,361,380,64,-77,355,373,79,-62,350,366,85,-53,345,358,88,-47,341,350,90,-43,338,342,94,-35,335,334,96,-27,333,325,97,-23,331,316,100,-10,330,307,99,-12,330,298,100,2,331,289,100,9,332,280,100,8,334,271,96,29,337,263,92,-39,332,265,-71,-71,327,273,-85,-52,323,281,-91,-42,320,289,-94,-33,317,297,-97,-24,315,306,-98,-18,314,315,-100,-9,313,324,-100,-5,313,333,-100,0,314,342,-99,13,315,351,-99,16,317,360,-96,27,319,369,-96,28,322,377,-93,38,326,385,-90,44,330,393,-87,50,335,401,-81,59,341,408,-71,70,348,414,-56,83,356,419,-74,67,359,427,-95,31,362,435,-91,41,364,443,-100,-7,362,452,-95,-31,359,460,-92,-39,358,467,-69,73,366,470,-98,22,361,478,-65,-76,352,480,-4,-100,343,481,-15,-99,334,483,-28,-96,326,486,-46,-89,318,491,-58,-82,311,497,-70,-72,304,504,-79,-61,299,511,-82,-57,294,519,-88,-48,291,527,-92,-38,288,535,-97,-23,286,544,-99,-15,285,553,-100,-4,285,562,-99,12,288,571,-80,60,291,578,-97,-23,287,586,-93,-38,284,594,-94,-34,281,602,-95,-31,279,611,-96,-28,276,619,-96,-29,273,627,-94,-35,271,636,-96,-30,268,644,-96,-27,266,653,-97,-26,263,661,-95,-31,260,670,-94,-34,257,678,-95,-32,254,686,-90,-44,250,694,-90,-44,246,702,-88,-47,241,710,-87,-50,236,717,-77,-63,231,724,-81,-58,225,731,-71,-70,218,738,-73,-69,212,745,-73,-68,205,752,-68,-73,198,758,-72,-69,192,765,-72,-69,185,772,-77,-64,179,779,-77,-63,174,786,-77,-64,168,793,-77,-64,162,800,-76,-65,156,807,-72,-69,149,814,-70,-71,142,820,-57,-82,135,825,-58,-81,128,830,-52,-85,120,834,-53,-84,113,839,-56,-83,105,844,-52,-86,97,849,-61,-79,90,854,-56,-83,83,859,-60,-80,76,865,-63,-77,69,870,-63,-77,62,876,-65,-76,55,883,-71,-71,48,890,-76,-65,43,897,-77,-64,37,904,-79,-62,32,911,-82,-58,27,918,-86,-51,23,926,-89,-45,19,934,-91,-40,16,942,-95,-31,13,951,-98,-18,12,960,-95,30,18,960,53,85,25,955,53,85,33,951,14,99,41,953,-36,93,50,954,16,99,59,952,14,99,67,955,-97,24,63,963,-93,-37,64,971,-87,49,69,978,-63,77,76,983,-85,53,75,990,-86,-52,70,997,-80,-60,65,1004,-82,-57,60,1011,-82,-57,55,1019,-87,-49,51,1027,-90,-44,47,1035,-94,-34,45,1044,-99,-16,46,1052,-98,21,46,1061,-99,14,49,1070,-61,79,56,1069,-46,89,57,1077,-100,-1,58,1086,-96,29,61,1094,-85,53,67,1101,-72,70,74,1107,-47,88,80,1105,85,52,84,1097,88,47,89,1090,50,87,97,1090,-8,100,106,1088,36,93,114,1085,57,82,120,1078,82,57,125,1071,77,63,132,1067,4,100,141,1069,-36,93,149,1073,-66,75,154,1080,-89,46,154,1088,-95,-31,151,1096,-92,-38,148,1104,-93,-38,145,1112,-93,-36,142,1120,-99,-16,144,1128,-87,49,147,1137,-87,49,151,1145,-96,27,155,1153,-86,51,160,1160,-70,71,167,1163,51,86,172,1155,83,56,177,1148,38,92,182,1151,-98,18,180,1160,-98,-18,177,1169,-98,-20,178,1178,-84,54,185,1183,-49,87,190,1188,-95,30,192,1197,-96,29,196,1204,-55,84,202,1208,-93,37,203,1217,-93,36,208,1224,-70,72,215,1230,-70,71,221,1237,-77,64,227,1244,-17,99,230,1237,100,8,230,1228,100,9,231,1219,100,4,232,1210,99,11,233,1201,99,17,235,1192,98,22,237,1183,99,15,238,1174,97,23,240,1165,98,21,242,1156,98,22,245,1148,96,27,247,1139,97,25,250,1131,95,31,252,1122,95,30,255,1114,95,32,258,1106,95,33,261,1098,94,34,264,1089,95,32,267,1081,94,35,270,1072,94,33,273,1064,93,37,276,1056,94,34,279,1048,94,33,282,1040,93,37,285,1032,93,37,288,1024,93,36,291,1016,94,34,294,1008,95,32,297,1000,93,37,300,992,94,35,303,984,95,32,306,976,94,33,309,968,95,33,312,959,94,35,315,951,95,32,318,942,96,28,320,933,95,31,323,925,95,32,327,917,19,98,334,922,-45,90,342,925,-81,59,345,932,-61,79,353,934,-68,74,352,941,-95,-31,349,949,-96,-29,347,958,-95,-31,344,966,-97,-24,342,975,-95,-31,339,983,-96,-27,337,992,-95,32,344,994,-8,100,351,998,-95,32,350,1007,-100,-10,349,1016,-99,-16,347,1025,-92,-40,343,1033,-75,-67,335,1035,-34,-94,329,1042,-92,-39,327,1051,-97,-22,324,1059,-81,-58,317,1064,-43,-90,310,1069,-76,-65,304,1076,-76,-65,299,1083,-78,-63,293,1090,-84,-54,291,1098,-98,21,294,1106,-100,-8,289,1114,-88,-47,286,1122,-93,-37,283,1130,-97,-25,281,1139,-99,-17,280,1148,-100,-3,280,1157,-100,-5,279,1166,-100,-5,279,1175,-100,1,280,1184,-100,-1,279,1193,-100,-9,278,1202,-100,-3,277,1211,-100,-10,276,1220,-99,-16,275,1229,-99,-11,274,1238,-99,-14,272,1247,-99,-15,271,1256,-99,-16,269,1265,-99,-17,267,1274,-81,-59,260,1280,-87,-50,260,1289,-100,3,257,1297,-84,-54,252,1304,-84,-54,249,1312,-95,33,256,1318,-87,50,255,1325,-93,-38,252,1333,-96,-28,252,1342,-95,30,254,1350,-100,-8,251,1359,-94,-34,248,1367,-93,-38,245,1375,-92,-39,242,1383,-94,-33,240,1392,-98,-18,238,1401,-100,-9,238,1410,-87,48,246,1414,-27,96,255,1415,-17,99,264,1418,-17,99,273,1418,-4,100,282,1418,1,100,291,1418,-6,100,299,1419,10,100,308,1417,14,99,317,1416,14,99,326,1414,51,86,328,1407,99,-14,325,1399,97,-24,325,1390,99,-14,322,1382,85,-52,318,1374,96,-28,316,1365,98,-22,315,1356,98,21,318,1348,96,29,319,1339,98,-20,317,1331,92,39,324,1326,80,60,324,1317,99,-14,323,1308,97,-23,323,1300,93,36,326,1292,100,-4,323,1284,100,-10,325,1275,96,27,327,1266,96,27,330,1258,95,33,333,1250,94,34,336,1241,93,37,339,1233,94,34,342,1225,92,40,345,1217,93,38,349,1209,87,49,354,1201,86,51,359,1193,87,50,364,1185,85,53,368,1177,87,49,373,1169,61,79,381,1166,69,72,384,1158,98,21,386,1149,98,22,387,1140,97,24,390,1132,95,31,392,1123,100,-2,393,1115,86,51,399,1108,79,62,404,1100,96,29,405,1091,97,26,408,1083,95,32,411,1075,99,12,414,1067,74,67,420,1060,78,63,426,1053,83,56,430,1045,82,57,437,1038,78,63,442,1031,83,55,447,1023,85,53,451,1015,88,47,456,1008,37,93,465,1010,-56,83,471,1016,-32,95,480,1015,19,98,489,1015,-33,94,497,1018,-2,100,506,1015,65,76,513,1010,31,95,521,1007,28,96,529,1006,-42,91,534,1014,-94,35,537,1023,-92,39,540,1031,-92,40,544,1039,-93,36,546,1048,-100,5,547,1057,-100,-3,542,1064,-84,-55,542,1073,-99,17,542,1082,-100,-7,545,1091,-99,15,543,1100,-91,-41,537,1107,-89,-46,535,1116,-100,-9,534,1125,-99,-16,532,1134,-99,-15,531,1143,-98,-19,530,1152,-89,45,538,1157,-56,83,542,1164,-99,12,544,1173,-96,27,546,1182,-92,39,550,1190,-90,44,554,1198,-89,46,559,1206,-86,50,563,1214,-94,33,566,1223,-95,30,568,1232,-97,24,570,1241,-97,24,572,1250,-98,19,574,1259,-97,24,576,1268,-98,20,578,1277,-100,-1,575,1284,-98,-22,577,1293,-99,14,576,1301,-96,-28,573,1309,-100,6,579,1315,-64,76,584,1323,-99,10,581,1331,-93,-36,578,1340,-95,-31,576,1349,-97,-24,574,1358,-100,-8,574,1367,-98,-18,571,1375,-97,-24,570,1384,-97,24,576,1389,-31,95,585,1391,-19,98,594,1393,-3,100,603,1392,-11,99,612,1393,0,100,621,1393,22,97,628,1388,37,93,637,1389,-20,98,646,1391,-39,92,654,1395,-29,96,663,1396,-11,99,672,1398,-12,99,681,1398,-5,100,690,1398,-4,100,699,1398,5,100,708,1398,3,100,717,1398,11,99,726,1396,17,99,735,1394,32,95,741,1389,97,23,738,1380,85,-52,735,1372,90,-44,729,1365,56,-83,721,1362,27,-96,712,1360,30,-95,704,1357,41,-91,696,1352,54,-84,688,1349,42,-91,681,1343,70,-72,674,1337,64,-77,667,1331,62,-79,661,1325,86,-51,656,1318,64,-77,649,1312,88,-47,650,1305,91,41,650,1297,91,-42,646,1289,84,-55,641,1282,100,-4,643,1273,92,-38,636,1266,93,-37,635,1257,99,-13,635,1248,99,-11,634,1239,100,-5,633,1230,100,-4,633,1221,100,0,633,1212,100,0,633,1203,100,0,633,1194,100,0,633,1185,100,0,633,1176,100,-7,632,1167,100,0,635,1158,85,53,637,1149,99,-12,635,1140,98,-20,633,1131,99,-11,632,1122,96,-29,631,1114,93,38,635,1106,97,26,637,1097,97,25,640,1088,98,22,641,1079,99,12,642,1070,100,0,641,1061,99,-11,640,1052,99,-15,639,1043,99,-14,638,1034,95,-30,632,1030,-11,-99,625,1029,84,-55,623,1020,97,-24,622,1011,99,11,624,1002,99,13,625,993,99,13,625,984,99,13,627,975,98,19,629,966,99,12,632,959,43,90,639,962,-54,84,647,966,42,91,647,958,99,-13,645,949,98,-22,643,940,96,-28,640,931,97,-24,638,922,96,-27,636,913,97,-23,633,904,96,-29,631,895,96,-28,628,887,94,-34,625,879,97,-24,623,870,95,-31,620,862,95,-30,619,854,90,44,624,847,100,-7,621,839,94,-35,617,831,92,-39,614,823,92,-40,610,815,90,-43,607,807,91,-41,603,799,91,-42,599,791,91,-42,595,783,90,-45,591,775,90,-44,588,767,95,-30,585,759,92,-38,582,751,97,-25,584,744,97,24,581,735,93,-37,578,727,97,-23,576,718,98,-21,575,709,99,-16,572,701,50,-87,565,698,89,-45,564,689,100,-10,562,680,98,-22,560,671,98,-18,560,662,99,15,562,653,98,19,563,644,99,14,564,635,100,-6,563,626,99,-15,561,617,98,-22,559,608,99,-15,561,600,46,89,570,599,0,100,579,601,27,96,587,597,11,99,596,596,21,98,604,593,30,95,613,590,41,91,621,586,60,80,628,580,44,90,637,577,25,97,646,575,31,95,654,572,31,95,662,569,34,94,670,566,42,91,678,563,38,92,685,558,80,60,687,549,100,2,687,540,99,11,688,531,99,10,692,524,82,57,693,516,99,-13,691,507,98,-18,689,498,96,-27,686,489,96,-27,684,480,97,-24,682,471,96,-27,679,463,97,-24,677,454,100,-8,678,445,100,-7,676,436,98,-18,673,427,78,-62,670,420,100,-10,669,411,99,-12,667,402,96,-30,664,394,95,-32,661,386,89,-46,656,378,71,-70,649,376,-83,-55,651,384,-70,-71,644,382,55,-84,637,375,65,-76,631,375,-29,-96,624,374,-27,-96,622,381,-98,18,625,390,-94,35,628,398,-92,-40,622,397,72,-70,618,389,49,-87,613,391,-96,-28,614,400,-98,19,616,409,-96,29,619,417,-92,39,624,425,-74,67,631,431,-79,61,632,438,-100,3,634,447,-99,16,637,456,-95,30,637,465,-100,-4,636,474,-99,-11,634,483,-98,-20,632,492,-93,-37,629,500,-97,-24,630,509,-97,23,628,517,-55,-84,620,519,-27,-96,611,518,25,-97,602,517,14,-99,593,517,-15,-99,584,518,-21,-98,576,521,-40,-92,568,525,-23,-97,559,522,76,-65,554,518,20,-98,545,517,24,-97,538,512,97,-26,540,503,97,24,544,495,86,51,546,486,98,19,549,478,100,5,545,470,98,-18,548,461,97,24,549,452,100,-5,548,443,98,-22,545,435,93,-36,542,427,99,-12,543,418,94,-33,536,417,-9,-100,528,416,-18,-98,521,415,-4,-100,515,421,-58,-82,508,420,2,-100,502,426,-96,-28,501,435,-100,-10,499,443,-95,-30,500,451,-85,53,507,458,-86,51,506,464,-82,-57,502,472,-94,-34,499,480,-88,-48,493,487,-75,-66,487,494,-73,-68,480,498,5,-100,471,496,48,-88,466,489,89,-46,461,481,70,-72,453,476,70,-71,450,468,94,34,458,464,29,96,466,461,56,83,469,453,96,-29,464,446,96,-28,461,437,96,-29,462,429,100,-9,463,422,96,28,460,415,72,-69,453,409,80,-60,451,401,91,-41,448,394,100,-4,446,386,86,-51,441,379,83,-55,436,372,74,-67,429,366,50,-86,421,363,24,-97,413,359,69,-72,407,352,79,-61,402,345,81,-58,397,337,86,-50,393,329,90,-44,389,321,92,-39,386,313,94,-33,383,304,98,-21,382,295,98,-18,380,286,100,-9,380,277,100,0,380,268,100,2,382,259,97,24,383,250,97,25,386,242,96,26,389,234,64,-77'.split(',').map(Number);

/* ---------- Dart math.Random (same stars / city lights as the app) ---------- */
class DartRandom {
  constructor(seed) { const M = (1n << 64n) - 1n, s64 = v => BigInt.asIntN(64, v); let s = BigInt(seed); s = s64((~s) + (s << 21n)); s = s64(s ^ (s >> 24n)); s = s64((s + (s << 3n)) + (s << 8n)); s = s64(s ^ (s >> 14n)); s = s64((s + (s << 2n)) + (s << 4n)); s = s64(s ^ (s >> 28n)); s = s64(s + (s << 31n)); if (s === 0n) s = 0x5a17n; const u = s & M; this.lo = u & 0xFFFFFFFFn; this.hi = (u >> 32n) & 0xFFFFFFFFn; for (let i = 0; i < 4; i++) this.next(); }
  next() { const st = 0xFFFFDA61n * this.lo + this.hi; this.lo = st & 0xFFFFFFFFn; this.hi = (st >> 32n) & 0xFFFFFFFFn; }
  nextInt(max) { if ((max & -max) === max) { this.next(); return Number(this.lo & BigInt(max - 1)); } let r, res; do { this.next(); r = Number(this.lo); res = r % max; } while (r - res + max > 4294967296); return res; }
  nextDouble() { return (this.nextInt(1 << 26) * 134217728 + this.nextInt(1 << 27)) / 9007199254740992; }
}
const SKY = (() => { const r = new DartRandom(23), out = []; for (let i = 0; i < 260; i++) out.push([r.nextDouble(), r.nextDouble(), .5 + r.nextDouble() * 1.3, r.nextDouble()]); return out; })();
const LIGHTS = (() => { const r = new DartRandom(7), out = []; for (let c = 0; c < 16; c++) { const cu = r.nextDouble(), cv = .08 + r.nextDouble() * .86, cnt = 7 + r.nextInt(14); for (let i = 0; i < cnt; i++) { const du = (r.nextDouble() - .5) * .05, dv = (r.nextDouble() - .5) * .09; out.push([(cu + du) % 1, clamp(cv + dv, .02, 1), .6 + r.nextDouble() * .9, r.nextDouble(), c]); } } return out; })();

/* ---------- state + figure placement ---------- */
const ST = { t: 0, born: 0, pull: 0, pulling: false, exiting: false, pullV: 0 };
let G = {};
function figure(W, H) {
  const k = Math.min((H * P['fig.height']) / (BOTTOM - TOP), (W - 10) / (HORN_R[2] - 12)), feetY = H * P['fig.feet'];
  const left = (W - (HORN_R[2] - 12) * k) / 2 - 12 * k + P['fig.x'], top = feetY - BOTTOM * k;
  return { k, left, top, horn: { x: left + HORN_R[0] * k, y: top + HORN_R[1] * k, w: (HORN_R[2] - HORN_R[0]) * k, h: (HORN_R[3] - HORN_R[1]) * k } };
}

/* ---------- the outline lens (_lens / _buildMesh) ---------- */
let L = null;
function buildLens(W, H, f) {
  const key = [W, H, f.k, f.left, f.top, P['lens.sigma'], P['lens.strength'], P['lens.limit']].join('|'); if (L && L.key === key) return L;
  const s = f.k, n = NRM.length / 4, lx = new Float64Array(n), ly = new Float64Array(n), lnx = new Float64Array(n), lny = new Float64Array(n);
  for (let i = 0; i < n; i++) { lx[i] = f.left + NRM[i * 4] * s; ly[i] = f.top + NRM[i * 4 + 1] * s; lnx[i] = NRM[i * 4 + 2] / 100; lny[i] = NRM[i * 4 + 3] / 100; }
  const sig = P['lens.sigma'] * s, lk = P['lens.strength'] * s / (Math.sqrt(TAU) * 48 / 9), lim = P['lens.strength'] * s * P['lens.limit'];
  const lens = (x, y) => { let dx = 0, dy = 0; const cut = sig * 3.2, cut2 = cut * cut, inv = 1 / (2 * sig * sig); for (let i = 0; i < n; i++) { const ex = x - lx[i]; if (ex > cut || ex < -cut) continue; const ey = y - ly[i]; if (ey > cut || ey < -cut) continue; const d2 = ex * ex + ey * ey; if (d2 > cut2) continue; const w = Math.exp(-d2 * inv); dx += w * lnx[i]; dy += w * lny[i]; } dx *= lk; dy *= lk; const m = Math.hypot(dx, dy); if (m > lim) { dx = dx / m * lim; dy = dy / m * lim; } return [dx, dy]; };
  // halo seam just outside the outline
  const halo = []; let ph = null, cur = null; for (let i = 0; i < n; i++) { const hx = lx[i] + lnx[i] * 3 * s, hy = ly[i] + lny[i] * 3 * s; if (!ph || (hx - ph[0]) ** 2 + (hy - ph[1]) ** 2 > (26 * s) ** 2) { cur = [[hx, hy]]; halo.push(cur); } else cur.push([hx, hy]); ph = [hx, hy]; }
  // mesh: fine near the figure, coarse elsewhere
  const pad = 3.4 * sig, fx0 = f.left + 12 * s - pad, fx1 = f.left + 741 * s + pad, fy0 = f.top + 234 * s - pad, fy1 = f.top + 1419 * s + pad;
  let fine = Math.max(3.5, sig / 2.8);
  const axis = (len, a0, a1) => { const out = []; let x = -12; const end = len + 12; while (x < end) { out.push(x); const inside = x >= a0 && x < a1; let nx = x + (inside ? fine : 30); if (!inside && x < a0 && nx > a0) nx = a0; if (inside && nx > a1) nx = a1; x = nx; } out.push(end); return out; };
  let xs = axis(W, fx0, fx1), ys = axis(H, fy0, fy1); while (xs.length * ys.length > 60000) { fine *= 1.4; xs = axis(W, fx0, fx1); ys = axis(H, fy0, fy1); }
  const nx = xs.length, ny = ys.length, pos = new Float32Array(nx * ny * 2), tex = new Float32Array(nx * ny * 2); let q = 0;
  for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) { const x = xs[c], y = ys[r], d = lens(x, y); pos[q] = x; pos[q + 1] = y; tex[q] = x - d[0]; tex[q + 1] = y - d[1]; q += 2; }
  const idx = new Uint16Array((nx - 1) * (ny - 1) * 6); let k = 0;
  for (let r = 0; r < ny - 1; r++) for (let c = 0; c < nx - 1; c++) { const a0 = r * nx + c, a1 = a0 + 1, b0 = a0 + nx, b1 = b0 + 1; idx[k++] = a0; idx[k++] = a1; idx[k++] = b0; idx[k++] = a1; idx[k++] = b1; idx[k++] = b0; }
  L = { key, lens, lim, halo, pos, tex, idx, dirty: true }; return L;
}

/* ---------- WebGL: warped space panels + aurora curtains ---------- */
function glSetup(vs, fs) {
  const c = document.createElement('canvas'), gl = c.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true }); if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); gl.useProgram(p); return { c, gl, p };
}
let SP = null, AU = null, glBad = false;
function initGL() {
  try {
    SP = glSetup('attribute vec2 pos;attribute vec2 tex;uniform vec2 res;varying vec2 vt;void main(){vt=tex;gl_Position=vec4(pos.x/res.x*2.-1.,1.-pos.y/res.y*2.,0.,1.);}',
      'precision highp float;varying vec2 vt;uniform sampler2D img;uniform float base,pw,hh,boost,alpha;uniform vec3 offs;void main(){vec2 uv=vec2((vt.x-base)/(pw+1.2),vt.y/hh);if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)discard;vec3 c=texture2D(img,uv).rgb*boost+offs;gl_FragColor=vec4(c,1.)*alpha;}');
    AU = glSetup('attribute vec2 pos;attribute vec4 col;uniform vec2 res;varying vec4 vc;void main(){vc=col;gl_Position=vec4(pos.x/res.x*2.-1.,1.-pos.y/res.y*2.,0.,1.);}',
      'precision mediump float;varying vec4 vc;void main(){gl_FragColor=vec4(vc.rgb*vc.a,vc.a);}');
    if (!SP || !AU) glBad = true;
    else {
      const g = SP.gl; SP.bp = g.createBuffer(); SP.bt = g.createBuffer(); SP.bi = g.createBuffer(); SP.tex = PANELS.map(() => g.createTexture()); SP.up = PANELS.map(() => false);
      const a = AU.gl; AU.bp = a.createBuffer(); AU.bc = a.createBuffer(); AU.bi = a.createBuffer();
    }
  } catch (e) { console.warn(e); glBad = true; }
}
function renderSpace(W, H, k, lens, o, alpha) {
  if (glBad) return null; if (!SP) initGL(); if (glBad) return null;
  const g = SP.gl, CW = Math.round(W * k), CH = Math.round(H * k); if (SP.c.width !== CW || SP.c.height !== CH) { SP.c.width = CW; SP.c.height = CH; }
  g.viewport(0, 0, CW, CH); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT); g.useProgram(SP.p); g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
  if (lens.dirty || SP.lensKey !== lens.key) { g.bindBuffer(g.ARRAY_BUFFER, SP.bp); g.bufferData(g.ARRAY_BUFFER, lens.pos, g.STATIC_DRAW); g.bindBuffer(g.ARRAY_BUFFER, SP.bt); g.bufferData(g.ARRAY_BUFFER, lens.tex, g.STATIC_DRAW); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, SP.bi); g.bufferData(g.ELEMENT_ARRAY_BUFFER, lens.idx, g.STATIC_DRAW); SP.lensKey = lens.key; lens.dirty = false; }
  const ap = g.getAttribLocation(SP.p, 'pos'), at = g.getAttribLocation(SP.p, 'tex');
  g.bindBuffer(g.ARRAY_BUFFER, SP.bp); g.enableVertexAttribArray(ap); g.vertexAttribPointer(ap, 2, g.FLOAT, false, 0, 0);
  g.bindBuffer(g.ARRAY_BUFFER, SP.bt); g.enableVertexAttribArray(at); g.vertexAttribPointer(at, 2, g.FLOAT, false, 0, 0); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, SP.bi);
  const U = n => g.getUniformLocation(SP.p, n); g.uniform2f(U('res'), W, H); g.uniform1f(U('hh'), H); g.uniform1f(U('boost'), P['space.boost']); g.uniform3f(U('offs'), 3 / 255, 3 / 255, 4 / 255); g.uniform1f(U('alpha'), alpha);
  const sc = H / 1536, pw = 1024 * sc, loop = pw * 8; g.uniform1f(U('pw'), pw);
  for (let i = 0; i < 8; i++) {
    const im = PANELS[i]; if (!im.complete || !im.naturalWidth) continue;
    if (!SP.up[i]) { g.bindTexture(g.TEXTURE_2D, SP.tex[i]); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE); g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, im); SP.up[i] = true; }
    g.bindTexture(g.TEXTURE_2D, SP.tex[i]);
    const x0 = (((i * pw - o) % loop) + loop) % loop;
    for (const base of [x0, x0 - loop]) { if (base > W + 80 || base + pw < -80) continue; g.uniform1f(U('base'), base); g.drawElements(g.TRIANGLES, lens.idx.length, g.UNSIGNED_SHORT, 0); }
  }
  return SP.c;
}
const AUR_SPEC = () => [0, 1, 2].map(i => [P['au.base' + i], P['au.amp' + i], P['au.tall' + i], P['au.speed' + i], [0, 2.1, 4][i], P['au.alpha' + i], i]);
const AUR_COLS = () => [0, 1, 2].map(i => [P['au.c' + i + 'a'], P['au.c' + i + 'b'], P['au.c' + i + 'c']].map(K.rgb));
const aurEase = x => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
let AU_IDX = null;
function auroraMeshes(W, H, t, alpha, warp) {
  const n = Math.round(P['au.rays']), rows = 5, fr = [0, .22, .5, .76, 1], fa = [.95, .62, .34, .12, 0];
  if (!AU_IDX || AU_IDX.n !== n) { const idx = new Uint16Array(n * (rows - 1) * 6); let q = 0; for (let i = 0; i < n; i++) for (let r = 0; r < rows - 1; r++) { const a = i * rows + r, b = (i + 1) * rows + r, c = a + 1, d = b + 1; idx[q++] = a; idx[q++] = b; idx[q++] = c; idx[q++] = b; idx[q++] = d; idx[q++] = c; } AU_IDX = { n, idx }; }
  const out = [], specs = AUR_SPEC(), colsAll = AUR_COLS();
  for (const sp of specs) {
    const [base, amp, tall, spd, ph, al0] = sp, al = al0 * alpha, cols = colsAll[sp[6]]; if (al <= 0) continue;
    const pos = new Float32Array((n + 1) * rows * 2), col = new Float32Array((n + 1) * rows * 4), edge = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, f1 = u * 4.1 + t * .09 * spd + ph, f2 = u * 9.3 - t * .17 * spd + ph * 1.7, fold = Math.sin(f1) + .45 * Math.sin(f2), slope = Math.cos(f1) * 4.1 + .45 * Math.cos(f2) * 9.3;
      const ed = clamp(Math.abs(slope) / 6.5, 0, 1), wave = .5 + .5 * Math.sin(u * 19 - t * 1.7 * spd + ph), wave2 = .5 + .5 * Math.sin(u * 31 + t * 2.3 * spd + i * .7);
      const surge = Math.pow(.5 + .5 * Math.sin(t * .21 * spd + ph * 2 + u * 2.5), 3), flick = .8 + .2 * Math.sin(t * 5.1 + i * 2.399 + ph), env = aurEase(u / .16) * aurEase((1 - u) / .16);
      const b = clamp((.28 + .5 * wave + .22 * wave2) * (.55 + .45 * ed) * (.7 + .6 * surge) * flick * env, 0, 1.25);
      const hgt = H * tall * (.45 + .55 * wave) * (.8 + .5 * ed) * (1 + .45 * surge), sway = Math.sin(u * 3 + t * .06 * spd + ph) * W * .05;
      const bx = W * (-.08 + 1.16 * u) + sway, by = H * base + fold * H * amp, lean = Math.sin(u * 2.4 + t * .11 + ph) * .22 + (u - .5) * .15;
      for (let r = 0; r < rows; r++) {
        let p = [bx + lean * hgt * fr[r], by - hgt * fr[r]]; if (warp) p = warp(p);
        const o = (i * rows + r) * 2; pos[o] = p[0]; pos[o + 1] = p[1];
        const cc = r <= 1 ? cols[0] : (r === 2 ? cols[1] : cols[2]), c2 = r === 1 ? cols[1] : (r === 3 ? cols[1] : cc), mr = (r === 1 || r === 3) ? .5 : 0, oc = (i * rows + r) * 4;
        col[oc] = Math.round(cc[0] + (c2[0] - cc[0]) * mr) / 255; col[oc + 1] = Math.round(cc[1] + (c2[1] - cc[1]) * mr) / 255; col[oc + 2] = Math.round(cc[2] + (c2[2] - cc[2]) * mr) / 255; col[oc + 3] = clamp(al * b * fa[r], 0, 1);
        if (r === 0) edge.push(p);
      }
    }
    out.push({ pos, col, edge, al });
  }
  return out;
}
function renderAurora(W, H, k, meshes) {
  if (glBad) return null; if (!AU) initGL(); if (glBad) return null;
  const g = AU.gl, CW = Math.round(W * k), CH = Math.round(H * k); if (AU.c.width !== CW || AU.c.height !== CH) { AU.c.width = CW; AU.c.height = CH; }
  g.viewport(0, 0, CW, CH); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT); g.useProgram(AU.p); g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE);
  g.uniform2f(g.getUniformLocation(AU.p, 'res'), W, H); const ap = g.getAttribLocation(AU.p, 'pos'), ac = g.getAttribLocation(AU.p, 'col');
  g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, AU.bi); g.bufferData(g.ELEMENT_ARRAY_BUFFER, AU_IDX.idx, g.DYNAMIC_DRAW);
  for (const m of meshes) { g.bindBuffer(g.ARRAY_BUFFER, AU.bp); g.bufferData(g.ARRAY_BUFFER, m.pos, g.DYNAMIC_DRAW); g.enableVertexAttribArray(ap); g.vertexAttribPointer(ap, 2, g.FLOAT, false, 0, 0); g.bindBuffer(g.ARRAY_BUFFER, AU.bc); g.bufferData(g.ARRAY_BUFFER, m.col, g.DYNAMIC_DRAW); g.enableVertexAttribArray(ac); g.vertexAttribPointer(ac, 4, g.FLOAT, false, 0, 0); g.drawElements(g.TRIANGLES, AU_IDX.idx.length, g.UNSIGNED_SHORT, 0); }
  return AU.c;
}
const glowTmp = document.createElement('canvas');

/* ---------- planet (_planet) ---------- */
function planet(ctx, W, H, hy, t, lr, lg, lb, fade, rim) {
  const rad = W * P['pl.radius'], cx = W / 2, cy = hy + rad, depthH = H - hy, k = scaleOf(ctx);
  ctx.save(); ctx.globalAlpha *= fade;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.clip();
  let g = ctx.createLinearGradient(0, hy - 8, 0, H); [[0, P['pl.g0']], [.13, P['pl.g1']], [.5, P['pl.g2']], [1, P['pl.g3']]].forEach(([s, c]) => g.addColorStop(s, c)); ctx.fillStyle = g; ctx.fillRect(0, hy - 8, W, H - hy + 8);
  const cc3 = [[26, 70, 66], [34, 52, 92], [78, 58, 44]];
  if (P['pl.continents']) for (let i = 0; i < 8; i++) { const r1 = ((i * 7919) % 97) / 97, r2 = ((i * 4049) % 89) / 89, dp = .1 + .8 * r2, span = W * 1.8, x = ((r1 * span) % span) - W * .4, y = hy + 10 + depthH * dp * .85, cw = W * (.35 + .5 * r1), ch = 14 + 34 * dp, c = cc3[i % 3]; ctx.save(); ctx.filter = `blur(${(14 * k).toFixed(1)}px)`; ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${P['pl.contAlpha']})`; ctx.beginPath(); ctx.ellipse(x, y, cw / 2, ch / 2, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(${Math.min(255, Math.round(lr * 3))},${Math.min(255, Math.round(lg * 3))},${Math.min(255, Math.round(lb * 3))},.7)`; ctx.fillRect(0, hy - 8, W, H - hy + 8); ctx.restore();
  if (P['pl.clouds']) for (let i = 0; i < 12; i++) { const r1 = ((i * 6143) % 101) / 101, r2 = ((i * 3571) % 83) / 83, dp = .06 + .9 * r2, span = W * 1.7, x = ((r1 * span) % span) - W * .35, y = hy + 4 + depthH * dp * .8, cw = W * (.25 + .45 * r1) * (.6 + dp), ch = 3 + 10 * dp; ctx.save(); ctx.filter = `blur(${(5 * k).toFixed(1)}px)`; ctx.fillStyle = `rgba(220,235,255,${(.05 + .09 * r1) * P['pl.cloudAlpha']})`; ctx.beginPath(); ctx.ellipse(x, y, cw / 2, ch / 2, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  if (P['pl.lights']) { const wrap = W * 1.9; for (const l of LIGHTS) { if (l[4] >= P['pl.cities']) continue; const v = l[1], x = ((l[0] * wrap) % wrap) - W * .45; if (x < -6 || x > W + 6) continue; const y = hy + 7 + Math.pow(v, 1.35) * (depthH - 10), a = clamp(.4 + .5 * Math.sin(t * (.7 + l[3]) + l[3] * 9), 0, 1), r = (.6 + 1.5 * v) * l[2] * P['pl.lightSize'], wc = [255, Math.round(200 + 36 * l[3]), Math.round(118 + 70 * l[3])]; ctx.fillStyle = `rgba(${wc},${a * .1})`; ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(${wc},${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } }
  g = ctx.createLinearGradient(0, hy - 8, 0, H); g.addColorStop(0, 'rgba(0,0,0,.4)'); g.addColorStop(.1, 'rgba(0,0,0,0)'); g.addColorStop(.62, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = g; ctx.fillRect(0, hy - 8, W, H - hy + 8);
  ctx.restore();
  ctx.save(); ctx.filter = `blur(${(1.6 * k).toFixed(1)}px)`; ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(rim, .9 * P['pl.limb']); ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2 - .5, -Math.PI / 2 + .5); ctx.stroke(); ctx.restore();
  ctx.lineWidth = 1; ctx.strokeStyle = `rgba(255,255,255,${.55 * P['pl.limb']})`; ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2 - .5, -Math.PI / 2 + .5); ctx.stroke();
  ctx.restore();
}

/* ---------- module ---------- */
const sc = K.screen({
  id: 'horn', title: 'Gjallarhorn (Heimdall)', docId: 'asgard_heimdall',
  crumb: 'Asgard › Gjallarhorn › Heimdall <small>· AsgardHeimdall Dart</small>',
  docMeta: { widget: 'AsgardHeimdall', part: 'Gjallarhorn scene', source: 'FlutterFlow export 2026-11-19' },
  startGroup: 'Northern lights', startSection: 'All',
  spec(def) {
    def('Heimdall', 'Figure', 'fig', 'fig.height', 'Figure height (share of screen)', 'num', .66, { min: .3, max: 1, step: .01 });
    def('Heimdall', 'Figure', 'fig', 'fig.feet', 'Feet at (share of screen)', 'num', .79, { min: .4, max: 1, step: .005 });
    def('Heimdall', 'Figure', 'fig', 'fig.x', 'Nudge sideways', 'num', 0, { min: -120, max: 120, step: 1, unit: 'px' });
    def('Heimdall', 'Figure', 'fig', 'fig.void', 'Show the void figure', 'bool', true);
    def('Heimdall', 'Figure', 'fig.horn', 'fig.horn', 'Show the gold horn', 'bool', true);
    def('Heimdall', 'Figure', 'fig', 'fig.shadow', 'Foot shadow', 'num', .75, { min: 0, max: 1, step: .01 });
    def('Heimdall', 'Bent light', 'lens', 'lens.sigma', 'Bend width', 'num', 48, { min: 8, max: 120, step: 1 });
    def('Heimdall', 'Bent light', 'lens', 'lens.strength', 'Bend strength', 'num', 74, { min: 0, max: 200, step: 1 });
    def('Heimdall', 'Bent light', 'lens', 'lens.limit', 'Max bend', 'num', 1.5, { min: .2, max: 4, step: .05 });
    def('Heimdall', 'Bent light', 'lens', 'halo.on', 'Bright seam on his outline', 'bool', true);
    def('Heimdall', 'Bent light', 'lens', 'halo.glow', 'Seam glow color', 'color', '#9CC8FF');
    def('Heimdall', 'Bent light', 'lens', 'halo.glowAlpha', 'Seam glow strength', 'num', .30, { min: 0, max: 1, step: .01 });
    def('Heimdall', 'Bent light', 'lens', 'halo.line', 'Seam line color', 'color', '#DCEBFF');
    def('Heimdall', 'Bent light', 'lens', 'halo.lineAlpha', 'Seam line strength', 'num', .40, { min: 0, max: 1, step: .01 });
    def('Heimdall', 'Entrance', 'all', 'in.space', 'Space fades in over', 'num', .7, { min: .05, max: 5, step: .05, unit: 's' });
    def('Heimdall', 'Entrance', 'all', 'in.figDelay', 'Figure starts after', 'num', .2, { min: 0, max: 5, step: .05, unit: 's' });
    def('Heimdall', 'Entrance', 'all', 'in.fig', 'Figure fades in over', 'num', .6, { min: .05, max: 5, step: .05, unit: 's' });
    def('Space', 'Drift', 'space', 'space.on', 'Space photos', 'bool', true);
    def('Space', 'Drift', 'space', 'space.speed', 'Drift speed', 'num', 14, { min: 0, max: 120, step: 1, unit: 'px/s' });
    def('Space', 'Drift', 'space', 'space.boost', 'Brightness', 'num', 1.08, { min: .3, max: 2, step: .01 });
    def('Space', 'Stars', 'space', 'star.on', 'Stars', 'bool', true);
    def('Space', 'Stars', 'space', 'star.count', 'How many', 'int', 260, { min: 0, max: 260, step: 5 });
    def('Space', 'Stars', 'space', 'star.stretch', 'Stretch at his outline', 'num', 7, { min: 0, max: 20, step: .5 });
    def('Space', 'Stars', 'space', 'star.color', 'Star color', 'color', '#E1ECFF');
    def('Space', 'Stars', 'space', 'star.drift', 'Star drift (× space)', 'num', .8, { min: 0, max: 3, step: .05 });
    def('Northern lights', 'All', 'aurora', 'au.on', 'Northern lights', 'bool', true);
    def('Northern lights', 'All', 'aurora', 'au.alpha', 'Overall strength', 'num', .55, { min: 0, max: 2, step: .01 });
    def('Northern lights', 'All', 'aurora', 'au.rays', 'Rays per curtain', 'int', 64, { min: 8, max: 160, step: 1 });
    def('Northern lights', 'All', 'aurora', 'au.glow', 'Soft glow under the rays', 'bool', true);
    def('Northern lights', 'All', 'aurora', 'au.edge', 'Bright lower edge', 'num', .18, { min: 0, max: 1, step: .01 });
    def('Northern lights', 'All', 'aurora', 'au.bend', 'Bent by his outline', 'bool', true);
    const AS = [[.37, .050, .30, 1.00, .62], [.47, .060, .25, .80, .48], [.29, .040, .21, 1.25, .36]];
    const AC = [['#6EFFAA', '#3CE8AC', '#AA70FF'], ['#54FFD6', '#3CCCE8', '#787CFF'], ['#96FF96', '#54E8C8', '#E870CE']];
    for (let i = 0; i < 3; i++) {
      const sec = 'Curtain ' + (i + 1), base = 'aurora';
      def('Northern lights', sec, base, 'au.base' + i, 'Height on screen', 'num', AS[i][0], { min: 0, max: 1, step: .005 });
      def('Northern lights', sec, base, 'au.amp' + i, 'Fold depth', 'num', AS[i][1], { min: 0, max: .3, step: .002 });
      def('Northern lights', sec, base, 'au.tall' + i, 'Ray length', 'num', AS[i][2], { min: 0, max: 1, step: .005 });
      def('Northern lights', sec, base, 'au.speed' + i, 'Dance speed', 'num', AS[i][3], { min: 0, max: 5, step: .05 });
      def('Northern lights', sec, base, 'au.alpha' + i, 'Strength', 'num', AS[i][4], { min: 0, max: 1.5, step: .01 });
      def('Northern lights', sec, base, 'au.c' + i + 'a', 'Bottom color', 'color', AC[i][0]);
      def('Northern lights', sec, base, 'au.c' + i + 'b', 'Middle color', 'color', AC[i][1]);
      def('Northern lights', sec, base, 'au.c' + i + 'c', 'Top color', 'color', AC[i][2]);
    }
    def('Planet', 'Ground', 'planet', 'pl.radius', 'Planet size (× screen width)', 'num', 2.4, { min: .6, max: 8, step: .05 });
    def('Planet', 'Ground', 'planet', 'pl.g0', 'Horizon color', 'color', '#30475E');
    def('Planet', 'Ground', 'planet', 'pl.g1', 'Upper ground', 'color', '#16273A');
    def('Planet', 'Ground', 'planet', 'pl.g2', 'Middle ground', 'color', '#0A1420');
    def('Planet', 'Ground', 'planet', 'pl.g3', 'Near ground', 'color', '#03060B');
    def('Planet', 'Ground', 'planet', 'pl.continents', 'Continents', 'bool', true);
    def('Planet', 'Ground', 'planet', 'pl.contAlpha', 'Continent strength', 'num', .34, { min: 0, max: 1, step: .01 });
    def('Planet', 'Ground', 'planet', 'pl.clouds', 'Cloud bands', 'bool', true);
    def('Planet', 'Ground', 'planet', 'pl.cloudAlpha', 'Cloud strength', 'num', 1, { min: 0, max: 4, step: .05 });
    def('Planet', 'City lights', 'planet', 'pl.lights', 'City lights', 'bool', true);
    def('Planet', 'City lights', 'planet', 'pl.cities', 'Cities', 'int', 16, { min: 0, max: 16, step: 1 });
    def('Planet', 'City lights', 'planet', 'pl.lightSize', 'Light size', 'num', 1, { min: .2, max: 4, step: .05 });
    def('Planet', 'Atmosphere', 'planet.rim', 'pl.limb', 'Bright limb line', 'num', 1, { min: 0, max: 2, step: .05 });
    def('Planet', 'Atmosphere', 'planet.rim', 'pl.glowWide', 'Wide glow', 'num', .2, { min: 0, max: 1, step: .01 });
    def('Planet', 'Atmosphere', 'planet.rim', 'pl.glowNear', 'Near glow', 'num', .42, { min: 0, max: 1, step: .01 });
    def('Planet', 'Atmosphere', 'planet.rim', 'pl.mist', 'Horizon mist', 'num', .16, { min: 0, max: 1, step: .01 });
    def('Planet', 'Atmosphere', 'planet.rim', 'pl.puff', 'Mist puff by his feet', 'num', .2, { min: 0, max: 1, step: .01 });
  },
  toolbar: [
    { label: 'Replay entrance', title: 'Fade the scene in again', onclick: () => { ST.born = ST.t; ST.pull = 0; ST.exiting = false; } },
    { label: 'Pull to close', title: 'Play the swipe-down close', onclick: () => { ST.exiting = true; ST.pullV = 900; } },
  ],
  onShow() { P = sc.P; ST.born = ST.t; ST.pull = 0; ST.exiting = false; },
  update(dt) {
    P = sc.P; ST.t += dt;
    if (ST.exiting) { ST.pullV += 9000 * dt; ST.pull += ST.pullV * dt; if (ST.pull > K.H + 60) { ST.exiting = false; ST.pull = 0; ST.born = ST.t; if (!K.go('sky')) K.status('Closed: in the app this goes back to Asgard.'); } }
    else if (!ST.pulling && ST.pull !== 0) { const k = 1 - Math.pow(.0004, dt); ST.pull += -ST.pull * k; if (Math.abs(ST.pull) < .3) ST.pull = 0; }
  },
  draw(ctx, now, studio) {
    P = sc.P; sc.ty = 0; const W = K.W, H = K.H, t = ST.t, f = figure(W, H), s = f.k, k = Math.min(2.5, scaleOf(ctx));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const lens = buildLens(W, H, f), age = t - ST.born, spaceA = clamp(age / P['in.space'], 0, 1), figA = clamp((age - P['in.figDelay']) / P['in.fig'], 0, 1), p = ST.pull, fade = clamp(1 - p / (H * .8), 0, 1);
    const sc0 = H / 1536, pw = 1024 * sc0, loop = pw * 8, o = ((t * P['space.speed']) % loop + loop) % loop;
    G = { f, lens };
    // drifting space bent around him (layer)
    ctx.save(); ctx.globalAlpha = spaceA * fade;
    if (P['space.on']) { const sp = renderSpace(W, H, k, lens, o, 1); if (sp) ctx.drawImage(sp, 0, 0, W, H); }
    if (P['au.on']) {
      const meshes = auroraMeshes(W, H, t, P['au.alpha'] * spaceA, P['au.bend'] ? (q => { const d = lens.lens(q[0], q[1]); return [q[0] + d[0], q[1] + d[1]]; }) : null);
      const ac = renderAurora(W, H, k, meshes);
      if (ac) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (P['au.glow']) { const kg = .5, TW = Math.ceil(W * kg), TH = Math.ceil(H * kg * 9 / 16); if (glowTmp.width !== TW || glowTmp.height !== TH) { glowTmp.width = TW; glowTmp.height = TH; } const gx = glowTmp.getContext('2d'); gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, TW, TH); gx.filter = `blur(${(9 * kg).toFixed(2)}px)`; gx.drawImage(ac, 0, 0, TW, TH); gx.filter = 'none'; ctx.drawImage(glowTmp, -60 * 0, 0, W, H); }
        ctx.drawImage(ac, 0, 0, W, H);
        ctx.filter = `blur(${(1.6 * scaleOf(ctx)).toFixed(2)}px)`; ctx.lineWidth = 2;
        for (const m of meshes) { ctx.strokeStyle = `rgba(190,255,224,${clamp(m.al * P['au.edge'], 0, 1)})`; ctx.beginPath(); m.edge.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); }
        ctx.restore();
      }
      G.aurora = meshes;
    }
    if (P['star.on']) {
      const wrapW = W + 120, n = Math.min(SKY.length, Math.round(P['star.count'])), sc = K.rgb(P['star.color']); ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) { const st = SKY[i], sx = (((st[0] * wrapW - o * P['star.drift']) % wrapW) + wrapW) % wrapW - 60, sy = st[1] * H * .95, d = lens.lens(sx, sy), m = Math.hypot(d[0], d[1]), kk = clamp(m / lens.lim, 0, 1), tw = .55 + .45 * Math.sin(t * (.8 + st[3]) + st[3] * 20), a = clamp(tw * (.5 + .5 * kk), 0, 1), len = st[2] * (1 + P['star.stretch'] * kk), tx = m > .01 ? -d[1] / m : 1, ty = m > .01 ? d[0] / m : 0, px = sx + d[0], py = sy + d[1];
        ctx.lineWidth = st[2] * (1.1 - .3 * kk); ctx.strokeStyle = `rgba(${sc[0]},${sc[1]},${sc[2]},${a})`; ctx.beginPath(); ctx.moveTo(px - tx * len, py - ty * len); ctx.lineTo(px + tx * len, py + ty * len); ctx.stroke(); }
    }
    if (P['halo.on']) { const path = () => { ctx.beginPath(); for (const seg of lens.halo) seg.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); }; ctx.save(); ctx.lineJoin = 'round'; ctx.filter = `blur(${(4 * scaleOf(ctx)).toFixed(1)}px)`; ctx.lineWidth = 6 * s + 2; ctx.strokeStyle = rgba(P['halo.glow'], P['halo.glowAlpha']); path(); ctx.stroke(); ctx.restore(); ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(P['halo.line'], P['halo.lineAlpha']); path(); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    // sky colour passing over the planet
    let ci = 0, frac = 0; for (let i = 0; i < 8; i++) { let x0 = (i * pw - o) % loop; if (x0 > W / 2) x0 -= loop; if (W / 2 >= x0 && W / 2 < x0 + pw) { ci = i; frac = (W / 2 - x0) / pw; break; } }
    const ca = COLS[ci], cb = COLS[(ci + 1) % 8], lr = ca[0] + (cb[0] - ca[0]) * frac, lg = ca[1] + (cb[1] - ca[1]) * frac, lb = ca[2] + (cb[2] - ca[2]) * frac;
    const rim = [Math.min(255, Math.round(92 + lr * 1.3)), Math.min(255, Math.round(170 + lg * .9)), 255];
    const hy = f.top + 1318 * s, rad = W * P['pl.radius'], pcx = W / 2, pcy = hy + rad, kk = scaleOf(ctx);
    ctx.save(); ctx.globalAlpha = spaceA * fade;
    ctx.save(); ctx.filter = `blur(${(24 * kk).toFixed(1)}px)`; ctx.lineWidth = 46; ctx.strokeStyle = rgba(rim, P['pl.glowWide']); ctx.beginPath(); ctx.arc(pcx, pcy, rad, -Math.PI / 2 - .45, -Math.PI / 2 + .45); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.filter = `blur(${(7 * kk).toFixed(1)}px)`; ctx.lineWidth = 12; ctx.strokeStyle = rgba(rim, P['pl.glowNear']); ctx.beginPath(); ctx.arc(pcx, pcy, rad, -Math.PI / 2 - .45, -Math.PI / 2 + .45); ctx.stroke(); ctx.restore();
    ctx.restore();
    planet(ctx, W, H, hy, t, lr, lg, lb, fade * spaceA, rim);
    G.planet = { hy };
    K.transitionBoundary?.(ctx);
    // the figure
    const fa = clamp(figA * fade, 0, 1);
    ctx.save(); ctx.translate(0, p); ctx.filter = `blur(${(7 * kk).toFixed(1)}px)`; ctx.fillStyle = `rgba(0,0,0,${P['fig.shadow'] * fa})`; ctx.beginPath(); ctx.ellipse(f.left + 283 * s, f.top + 1416 * s, 105 * s, (30 * s + 6) / 2, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (P['fig.void'] && VOID.complete && VOID.naturalWidth) {
      const seam = Math.round(f.left + 455 * s), arcY = x => pcy - Math.sqrt(Math.max(0, rad * rad - (x - pcx) ** 2));
      ctx.save(); ctx.beginPath(); ctx.moveTo(-2000, -2000); ctx.lineTo(W + 2000, -2000); ctx.lineTo(W + 2000, arcY(W + 40)); for (let i = 0; i <= 28; i++) { const x = (W + 40) - (W + 40 - seam) * i / 28; ctx.lineTo(x, arcY(x)); } ctx.lineTo(seam, H + 2000); ctx.lineTo(-2000, H + 2000); ctx.closePath(); ctx.clip();
      ctx.translate(0, p); ctx.globalAlpha = fa; ctx.drawImage(VOID, f.left, f.top, 1024 * s, 1536 * s); ctx.restore();
    }
    ctx.save(); ctx.translate(0, p);
    const mg = ctx.createLinearGradient(0, hy - 14, 0, hy + 22); mg.addColorStop(0, rgba(rim, 0)); mg.addColorStop(.5, rgba(rim, P['pl.mist'] * fa)); mg.addColorStop(1, rgba(rim, 0)); ctx.fillStyle = mg; ctx.fillRect(0, hy - 14, W, 36);
    const drift = Math.sin(t * .35) * 12 * s; ctx.save(); ctx.filter = `blur(${(9 * kk).toFixed(1)}px)`; ctx.fillStyle = `rgba(200,222,255,${P['pl.puff'] * fa})`; ctx.beginPath(); ctx.ellipse(f.left + 640 * s + drift, hy + 4, 150 * s, (38 * s + 8) / 2, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (P['fig.horn'] && HORN.complete && HORN.naturalWidth) { ctx.globalAlpha = fa; ctx.drawImage(HORN, f.horn.x, f.horn.y, f.horn.w, f.horn.h); }
    ctx.restore();
    G.figBox = { x: f.left + 12 * s, y: f.top + 234 * s + p, w: 729 * s, h: 1185 * s }; G.hornBox = { x: f.horn.x, y: f.horn.y + p, w: f.horn.w, h: f.horn.h };
    if (studio) K.hl(ctx, now);
  },
  highlight(ctx, base, sub, H1) {
    const W = K.W, H = K.H, box = (b, pad = 3, r = 6) => () => { ctx.beginPath(); ctx.roundRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, r); };
    if (base === 'fig' && G.figBox) H1(box(G.figBox, 4, 12));
    else if (base === 'fig.horn' && G.hornBox) H1(box(G.hornBox, 3, 10));
    else if (base === 'lens' && G.lens) H1(() => { ctx.beginPath(); for (const seg of G.lens.halo) seg.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); });
    else if (base === 'aurora' && G.aurora) G.aurora.forEach(m => H1(() => { ctx.beginPath(); m.edge.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); }));
    else if ((base === 'planet' || base === 'planet.rim') && G.planet) H1(() => { ctx.beginPath(); ctx.rect(4, G.planet.hy - 20, W - 8, H - G.planet.hy + 16); });
    else H1(() => { ctx.beginPath(); ctx.rect(4, 4, W - 8, H - 8); });
  },
  bounds(base) {
    const W = K.W, H = K.H, sq = (x, y, s) => ({ x: x - s / 2, y: y - s / 2, s });
    if (base === 'fig.horn' && G.hornBox) return sq(G.hornBox.x + G.hornBox.w / 2, G.hornBox.y + G.hornBox.h / 2, Math.max(G.hornBox.w, G.hornBox.h) * 1.4);
    if ((base === 'planet' || base === 'planet.rim') && G.planet) return sq(W / 2, G.planet.hy + 40, W);
    if (base === 'aurora') return sq(W / 2, H * .3, W);
    if (base === 'lens' && G.figBox) return sq(G.figBox.x + G.figBox.w * .4, G.figBox.y + G.figBox.h * .25, W * .7);
    return sq(W / 2, H / 2, W);
  },
  pick(p) {
    if (G.hornBox && p.x >= G.hornBox.x && p.x <= G.hornBox.x + G.hornBox.w && p.y >= G.hornBox.y && p.y <= G.hornBox.y + G.hornBox.h) return ['Heimdall', 'Figure'];
    if (G.planet && p.y > G.planet.hy) return ['Planet', 'Ground'];
    if (G.figBox && p.x >= G.figBox.x && p.x <= G.figBox.x + G.figBox.w && p.y >= G.figBox.y && p.y <= G.figBox.y + G.figBox.h) return ['Heimdall', 'Bent light'];
    if (p.y < K.H * .55) return ['Northern lights', 'All'];
    return ['Space', 'Drift'];
  },
  pointer: {
    down(p) { ST.drag = { y: p.y, y0: p.y, x0: p.x, t: performance.now(), v: 0 }; if (!ST.exiting) ST.pulling = true; },
    move(p) { const d = ST.drag; if (!d || ST.exiting) return; const now = performance.now(), dy = p.y - d.y; ST.pull = Math.max(0, ST.pull + dy); d.v = dy / Math.max(1, now - d.t) * 1000; d.y = p.y; d.t = now; },
    up(p) {
      const d = ST.drag; ST.drag = null; ST.pulling = false; if (!d || ST.exiting) return;
      if (Math.hypot(p.x - d.x0, p.y - d.y0) < 6) { const hb = G.hornBox; if (hb && p.x >= hb.x - 12 && p.x <= hb.x + hb.w + 12 && p.y >= hb.y - 12 && p.y <= hb.y + hb.h + 12) K.status('Horn: in the app this opens your alerts list (not built in the studio yet). Swipe down to go back to Asgard.'); return; }
      if (ST.pull > 90 || d.v > 700) { ST.exiting = true; ST.pullV = Math.max(d.v, 900); }
    },
    cancel() { ST.drag = null; ST.pulling = false; },
  },
});
sc.ST = ST; sc.G = () => G;
})();
