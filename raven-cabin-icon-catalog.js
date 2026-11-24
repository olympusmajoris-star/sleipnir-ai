/* Searchable catalog of the locally supplied Lucide glyphs. No network assets. */
(function (G) {
  'use strict';

  // Prefer the current descriptive names when the library exports an identical
  // glyph under an older name. Every alias remains in the search vocabulary.
  const preferred=new Set((
    'SquareActivity AlarmClockCheck AlarmClockMinus AlarmClockPlus CircleAlert OctagonAlert TriangleAlert ChartArea '+
    'ArrowDownAZ ArrowDownZA ArrowUpAZ ArrowUpZA CircleArrowDown CircleArrowOutDownLeft SquareArrowOutDownLeft '+
    'SquareArrowDownLeft CircleArrowOutDownRight SquareArrowOutDownRight SquareArrowDownRight SquareArrowDown '+
    'ArrowDownWideNarrow CircleArrowLeft SquareArrowLeft CircleArrowRight SquareArrowRight CircleArrowUp '+
    'CircleArrowOutUpLeft SquareArrowOutUpLeft SquareArrowUpLeft ArrowUpNarrowWide CircleArrowOutUpRight '+
    'SquareArrowOutUpRight SquareArrowUpRight SquareArrowUp SquareAsterisk Axis3d BadgeCheck ChartNoAxesColumnIncreasing '+
    'ChartNoAxesColumn ChartColumn ChartColumnIncreasing ChartColumnBig ChartBar ChartBarBig BetweenHorizontalEnd '+
    'BetweenHorizontalStart BookDashed SquareDashed Braces ChartCandlestick Captions ChartLine ChartNoAxesGantt ChartPie '+
    'ChartScatter CircleCheckBig CircleCheck SquareCheckBig SquareCheck CircleChevronDown SquareChevronDown '+
    'CircleChevronLeft SquareChevronLeft CircleChevronRight SquareChevronRight CircleChevronUp SquareChevronUp '+
    'CircleDivide CircleGauge CircleHelp CircleMinus CircleParking CircleParkingOff CirclePause CirclePercent CirclePlay '+
    'CirclePlus CirclePower CircleSlash2 CircleStop CircleUser CircleUserRound CircleX ClipboardPen ClipboardPenLine '+
    'CloudDownload CloudUpload CodeXml SquareCode Columns2 Columns3 ContactRound DiamondPercent SquareDivide SquareDot '+
    'Earth SquarePen Pen PenLine Ellipsis EllipsisVertical SquareEqual FileAxis3d FileChartColumnIncreasing FileChartColumn '+
    'FileChartLine FileChartPie FileCog FilePen FilePenLine FolderCog FolderPen Utensils UtensilsCrossed RectangleEllipsis '+
    'SquareChartGantt GitCommitHorizontal Grid3x3 Grid2x2 Grid2x2Plus HandHelping House IceCreamCone IceCreamBowl '+
    'IndentIncrease IndentDecrease SquareMousePointer SquareKanban SquareDashedKanban LaptopMinimal Layers PanelsTopLeft '+
    'SquareLibrary LoaderCircle LockKeyholeOpen LockOpen SquareM SquareMenu MicVocal SquareMinus SquareDashedMousePointer '+
    'Move3d OctagonPause OctagonX PaintbrushVertical TreePalm PanelBottomDashed PanelLeft PanelLeftClose PanelLeftDashed '+
    'PanelLeftOpen PanelRightDashed PanelTopDashed Rows3 SquareParking SquareParkingOff SquarePercent SquarePi '+
    'SquarePilcrow SquarePlay PlugZap SquarePlus SquarePower Rotate3d Rows2 Scale3d University SquareScissors '+
    'SquareBottomDashedScissors SendHorizontal ShieldX SquareSigma SquareSlash SlidersVertical Sparkles '+
    'SquareSplitHorizontal SquareSplitVertical SquareTerminal SquareUser SquareUserRound SquareX TestTubeDiagonal '+
    'TextSelect TramFront TvMinimal UserRound UserRoundCheck UserRoundCog UserRoundMinus UserRoundPlus UserRoundX '+
    'UsersRound WalletMinimal WandSparkles'
  ).split(/\s+/));

  const suggestions={
    image:[
      'Image','Images','ImagePlus','ImageUp','ImageDown','ImagePlay','ImageUpscale','GalleryHorizontal','GalleryHorizontalEnd',
      'GalleryVertical','GalleryVerticalEnd','GalleryThumbnails','Camera','SwitchCamera','FileImage','Folder','FolderOpen',
      'FolderPlus','FolderInput','Paperclip','Album','BookImage','Scan','ScanLine','SquarePlus','CirclePlus','Plus'
    ],
    mic:[
      'Mic','MicVocal','AudioLines','AudioWaveform','Speech','Podcast','Radio','RadioTower','Headset','Headphones',
      'Voicemail','Volume2','MessageSquareText','MessageCircle','Captions','TextCursorInput','ScanText','FileAudio','FileAudio2',
      'CircleDot','Waves','Ear','EarOff','MicOff'
    ],
    call:[
      'Phone','PhoneCall','PhoneOutgoing','PhoneIncoming','PhoneForwarded','Headset','Headphones','RadioReceiver','Voicemail',
      'Contact','ContactRound','UserRound','UsersRound','MessageCircle','MessagesSquare','MessageSquare','Speech',
      'Signal','Radio','RadioTower','Smartphone','SmartphoneNfc'
    ],
    video:[
      'Video','Camera','SwitchCamera','Webcam','ScreenShare','PictureInPicture','PictureInPicture2','MonitorPlay','Monitor',
      'Clapperboard','Film','Videotape','FileVideo','FileVideo2','ListVideo','TvMinimalPlay','Airplay','Cast','Presentation',
      'CirclePlay','SquarePlay','Play','Smartphone','Cctv','VideoOff'
    ],
    radio:[
      'Volume2','Volume1','Volume','Speech','AudioLines','AudioWaveform','Headphones','Headset','Radio','RadioReceiver',
      'Podcast','BookAudio','BookHeadphones','Speaker','Ear','Music','Music2','Music3','Music4','Play','CirclePlay','SquarePlay',
      'Captions','FileAudio','FileAudio2','VolumeOff','VolumeX'
    ],
    language:[
      'Languages','Globe','Earth','LetterText','ALargeSmall','Type','WholeWord','CaseSensitive','CaseUpper','CaseLower',
      'MessageCircle','MessageSquareText','MessagesSquare','Text','TextSearch','ScanText','BookOpenText','BookText','BookA',
      'Captions','Speech','TextQuote','ScrollText','FileText','NotebookText'
    ],
    send:[
      'Send','SendHorizontal','ArrowUp','ArrowUpRight','CornerUpRight','Forward','Share','Share2','Upload','CloudUpload',
      'ArrowUpFromLine','ArrowRightFromLine','ArrowRight','ArrowBigUp','ArrowBigRight','MoveUpRight','CornerRightUp',
      'CornerDownRight','ArrowBigUpDash','ArrowBigRightDash','MessageSquareShare','SquareArrowUp','SquareArrowUpRight',
      'CircleArrowUp','CircleArrowOutUpRight','ArrowRightToLine','ArrowUpToLine','ChevronUp','ChevronsUp','Navigation','Navigation2'
    ],
    motion:[
      'Play','Pause','CirclePlay','CirclePause','SquarePlay','OctagonPause','StepForward','SkipForward','FastForward',
      'Repeat','Repeat1','Repeat2','RotateCw','RotateCcw','RefreshCw','RefreshCcw','Gauge','CircleGauge','Route','RouteOff',
      'MoveRight','ArrowRight','CircleStop','Square','Timer','Film','Clapperboard','Waypoints'
    ],
    camera:[
      'Camera','SwitchCamera','Video','Webcam','ScanFace','UserRound','User','ContactRound','SquareUserRound','CircleUserRound',
      'CameraOff','VideoOff','Cctv','Focus','Scan','Eye','EyeOff','PictureInPicture','PictureInPicture2','Monitor','CircleUser'
    ],
    end:[
      'PhoneOff','PhoneMissed','VideoOff','CameraOff','X','CircleX','SquareX','OctagonX','Power','PowerOff','CirclePower',
      'SquarePower','LogOut','DoorOpen','CircleStop','Square','Unplug','Link2Off','CircleSlash','Ban','CircleMinus','Minus'
    ],
    share:[
      'Share','Share2','Forward','Send','SendHorizontal','MessageSquareShare','ScreenShare','ExternalLink','Link','Link2',
      'Copy','CopyPlus','ClipboardCopy','CornerUpRight','ArrowUpRight','MoveUpRight','ArrowUpFromLine','Upload','CloudUpload',
      'ArrowRightFromLine','ArrowRightLeft','Repeat','Repeat2','GitFork','Network','Waypoints','Radio','Rss','Users',
      'UsersRound','ImageUp','GalleryHorizontal','Paperclip','FolderOutput','FileOutput','ArrowUpToLine','CornerDownRight'
    ],
    return:[
      'ArrowLeft','ArrowLeftToLine','ArrowLeftFromLine','CornerUpLeft','CornerDownLeft','Undo','Undo2','UndoDot','Reply',
      'ReplyAll','ChevronLeft','ChevronsLeft','ArrowBigLeft','ArrowBigLeftDash','CircleArrowLeft','SquareArrowLeft',
      'MoveLeft','StepBack','SkipBack','LogOut','DoorOpen','RotateCcw','History','CornerLeftUp','CornerLeftDown','PanelLeftClose'
    ],
    pick:[
      'ImagePlus','Image','Images','ImageUp','GalleryHorizontal','GalleryHorizontalEnd','GalleryVertical','GalleryVerticalEnd',
      'GalleryThumbnails','Paperclip','FolderOpen','FolderPlus','FolderInput','FolderSearch','FileImage','FilePlus','FilePlus2',
      'FileVideo','FileVideo2','Film','Album','Camera','Upload','CloudUpload','Plus','CirclePlus','SquarePlus','MousePointerClick'
    ]
  };

  const vocabulary={
    image:'photos photo photograph picture pictures image gallery album attachment attach upload media landscape',
    mic:'microphone mic dictate dictation talk to text voice speech record recorder transcribe transcription audio listen',
    call:'call calling dial phone telephone conversation contact ring receiver headset voice audio',
    video:'video call calling facetime camera webcam live feed film movie screen display monitor stream',
    radio:'read aloud listen listening speech speak spoken sound volume audio voice radio speaker headphones playback',
    language:'language languages translate translation translator auto translation interpret text words caption captions subtitles',
    send:'send submit deliver message outgoing dispatch paper plane arrow enter post',
    motion:'motion move movement road driving play pause playback loop repeat speed animation pan preview',
    camera:'camera self selfie mirror reflection face local user preview video webcam feed switch',
    end:'end hang up hangup leave stop exit close cancel disconnect off finish terminate call video',
    share:'share sharing pass along forward repost send link copy transfer publish broadcast distribution attachment',
    return:'return back previous go back undo reply reverse windshield call home left',
    pick:'pick choose select browse open attach attachment add upload file files photo image video media gallery'
  };
  const groupLabels={image:'Photos',mic:'Talk to text',call:'Voice call',video:'Video call',radio:'Read aloud',language:'Translation',send:'Send',motion:'Road motion',camera:'Self camera',end:'End call',share:'Share',return:'Return',pick:'Choose media'};
  const actionAliases={photos:'image',photo:'image',attach:'image',dictate:'mic',dictation:'mic',read:'radio',audio:'radio',voice:'radio',translate:'language',translation:'language',back:'return',incoming:'share',choose:'pick',play:'motion',pause:'motion',hangup:'end',self:'camera'};
  const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const label=name=>String(name).replace(/([A-Z]+)([A-Z][a-z])/g,'$1 $2').replace(/([a-z\d])([A-Z])/g,'$1 $2').replace(/([a-zA-Z])(\d)/g,'$1 $2').trim();

  function create(lucide){
    const registry=lucide&&(lucide.icons||lucide)||{},glyphs=new Map(),lookup=new Map(),actionEntries={};
    for(const [name,definition] of Object.entries(registry)){
      if(!/^[A-Z]/.test(name)||!Array.isArray(definition)||definition[0]!=='svg'||!Array.isArray(definition[2]))continue;
      if(!glyphs.has(definition))glyphs.set(definition,[]);
      glyphs.get(definition).push(name);
    }
    const all=[];
    for(const aliases of glyphs.values()){
      const name=aliases.find(n=>preferred.has(n))||aliases[0];
      const entry={name,label:label(name),keywords:'',groups:[]};
      entry.keywords=Array.from(new Set(aliases.flatMap(alias=>[normalize(alias),normalize(label(alias))]))).join(' ');
      all.push(entry);for(const alias of aliases){lookup.set(alias,entry);lookup.set(normalize(alias),entry);lookup.set(normalize(label(alias)),entry);}
    }
    for(const [action,names] of Object.entries(suggestions)){
      const list=[],seen=new Set();
      for(const name of names){const entry=lookup.get(name);if(!entry||seen.has(entry.name))continue;seen.add(entry.name);entry.groups.push(action);list.push(entry);}
      actionEntries[action]=list;
    }
    for(const entry of all)entry.keywords+=' '+entry.groups.map(group=>vocabulary[group]).join(' ');
    all.sort((a,b)=>a.label.localeCompare(b.label,'en',{numeric:true}));
    const resolveAction=action=>actionAliases[action]||action;
    const forAction=action=>(actionEntries[resolveAction(String(action||''))]||[]).slice();
    function search(query,action){
      const raw=normalize(query),terms=raw.split(' ').filter(Boolean),pool=action&&action!=='all'?forAction(action):all;
      if(!terms.length)return pool.slice();
      return pool.filter(entry=>terms.every(term=>entry.keywords.includes(term))).map(entry=>{
        const name=normalize(entry.name),text=normalize(entry.label);
        const score=(name===raw||text===raw?1000:0)+(name.startsWith(raw)?100:0)+(text.startsWith(raw)?80:0)+terms.reduce((n,term)=>n+(text.split(' ').includes(term)?10:0),0);
        return {entry,score};
      }).sort((a,b)=>b.score-a.score||a.entry.label.localeCompare(b.entry.label,'en',{numeric:true})).map(result=>result.entry);
    }
    Object.defineProperties(all,{
      all:{value:all},
      forAction:{value:forAction},
      getSuggestions:{value:forAction},
      search:{value:search},
      get:{value:name=>lookup.get(String(name))||lookup.get(normalize(name))||null},
      groupLabels:{value:{...groupLabels}}
    });
    return all;
  }

  G.RavenCabinIconCatalog={create,groups:{...groupLabels}};
})(window);
