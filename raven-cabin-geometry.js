(function () {
  'use strict';
  // Coordinates belong to the complete cabin photograph. All views share it.
  window.RavenCabinGeometry = {
    width: 1926, height: 817,
    views: {
      chat: [0, 0, 1260, 817],
      video: [470, 45, 1000, 648.412698],
      sharing: [1270, 0, 656, 817]
    },
    camera: {cx:630, cy:300, f:1600, videoYaw:16, sharingYaw:58},
    // Editing views fit their physical subject, independently of the saved
    // phone zoom. The passenger view includes the glass and upper door.
    studioFrames: {
      cabin:[0,0,1260,817], dashboard:[40,350,1190,415],
      windshield:[430,105,810,355], video:[430,90,810,570],
      passenger:[1260,0,666,680]
    },
    glass: [25, 110, 1235, 290],
    glassPath: 'M 70 122 L 1212 122 Q 1242 122 1238 147 L 1115 365 Q 1104 385 1074 389 L 156 389 Q 138 387 126 360 L 42 151 Q 32 126 70 122 Z',
    windshield: [[70,122],[1212,122],[1238,147],[1115,365],[1074,389],[156,389],[126,360],[42,151]],
    // The other caller occupies the glass to the right of the folding
    // self-screen's left edge. The driver's half remains cabin scenery.
    videoGlass:[[569,122],[1212,122],[1238,147],[1115,365],[1074,389],[569,389]],
    videoEntryFrame:[569,0,691,765],
    videoCompactEntryFrame:[569,65,560,570],
    videoScreenFrame:[569,116,669,281],
    chatScreenFrame:[42,116,1196,281],
    frontControls:[500,475,585,150],
    chat: [135, 130, 975, 248],
    compose: [450, 410, 729, 42],
    instrument: [256, 469],
    motion: [625, 73],
    wheelPath: 'M 424 556 A 178 176 0 1 0 68 556 A 178 176 0 1 0 424 556 Z M 397 556 A 151 149 0 1 1 95 556 A 151 149 0 1 1 397 556 Z',
    rail: [[438,408],[1114,408],[1186,440],[1189,451],[440,449]],
    pads: {
      left: [[112,548],[182,545],[187,551],[187,580],[111,582],[104,577],[104,558]],
      right: [[320,546],[380,548],[390,555],[391,578],[384,583],[319,583]]
    },
    screens: {
      main: [[496,473],[758,473],[766,608],[743,646],[501,646]],
      passenger: [[798,474],[1065,474],[1070,572],[800,606]],
      tablet:[[514,666],[727,666],[731,737],[514,737]]
    },
    tablet:[514,666,216,72],tabletRect:[514,666,216,72],tabletBezel:[502,653,244,98],glovebox:[795,632,421,98],
    woodScreens:{main:[[491,480],[761,480],[765,599],[491,600]],passenger:[[800,480],[1065,480],[1076,585],[803,596]],tablet:[[514,666],[727,666],[731,737],[514,737]]},
    originalSlots:{radio:[142,553],language:[351,553],image:[570,535],mic:[700,535],call:[875,515],video:[1000,515]},
    tabletSlots:{image:[552,702],mic:[622,702],call:[692,702],video:[1000,515],radio:[570,535],language:[700,535]},
    tabletControlIds:['image','mic','call'],
    slots: {
      radio:[142,553], language:[351,553], image:[570,535],
      mic:[700,535], call:[875,515], video:[1000,515]
    },
    remote:[25,110,1235,290],
    remoteSharing:[910,145,195,222],
    sideWindow:[[1877,25],[1903,90],[1903,260],[1888,448],[1465,448],[1465,397],[1433,364],[1364,344],[1304,352],[1274,374],[1270,336],[1300,282],[1378,198],[1507,125],[1675,61],[1812,25]],
    sideContent:[1255,16,650,440],
    sideWindowFull:[[1877,25],[1903,90],[1903,260],[1888,448],[1260,448],[1260,336],[1300,282],[1378,198],[1507,125],[1675,61],[1812,25]],
    sideMirrorShell:[1260,350,195,105],
    sideMirror:[[1334,367],[1360,367],[1384,374],[1405,383],[1418,395],[1423,410],[1421,423],[1412,432],[1385,435],[1345,435],[1336,428],[1331,415],[1328,395],[1328,380]],
    sideMirrorRect:[1328,367,95,68],
    // The folding self-view hinges immediately below the central overhead.
    mirror:[569,110,112,152],
    overhead:[[550,73],[625,73],[700,73]],
    shareKeys:[[1540,650],[1600,656],[1660,664]],
    doorControls:{rewind:[1350,547],play:[1385,553],forward:[1420,560],keep:[1370,608],follow:[1430,614],more:[1490,618]}
  };
})();
