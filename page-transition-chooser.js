/* Each choice opens one work surface; the phone and editor actions stay in view. */
(() => {
  'use strict';
  const groups = {
    scope:'Pages and direction', style:'Transition style', timing:'Speed and intensity',
    material:'Glass material', placement:'Glass placement', camera:'Camera and visibility'
  };
  let dialog, chooser, bar, heading, back, undo, prompt, active = '';
  const $ = id => document.getElementById('pt-' + id);
  function button(text, click) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = click; return b;
  }
  function update() {
    if (!dialog) return;
    const off = !dialog.querySelector('#pt-glass .pg-glass-values') || dialog.querySelector('#pt-glass .pg-glass-values').hidden;
    prompt.hidden = !off || !['placement','camera'].includes(active);
    const scope = $('scope');
    const from = $('from').selectedOptions[0]?.textContent, to = $('to').selectedOptions[0]?.textContent;
    $('choice-context').textContent = scope.value === 'selection' ? (dialog.dataset.ptSelectionLabel || 'Selected item') : scope.value === 'default' ? 'App default' : scope.value === 'page' ? (to || 'Destination page') : [from,to].filter(Boolean).join(' → ');
    undo.disabled = !window.SleipnirTransitionEditor.canUndo?.();
  }
  function show(group, focus = true) {
    const old = active;
    active = Object.hasOwn(groups,group) ? group : '';
    dialog.dataset.ptWork = active;
    chooser.hidden = !!active;
    heading.textContent = groups[active] || 'What do you want to edit?';
    back.hidden = !active;
    for (const node of dialog.querySelectorAll('[data-pt-group]')) node.classList.toggle('pt-other-group', node.dataset.ptGroup !== active);
    const transition = $('effect').closest('fieldset');
    transition.classList.toggle('pt-other-group', active !== 'style' && active !== 'timing');
    $('glass').classList.toggle('pt-other-group', !['material','placement','camera'].includes(active));
    update();
    if (focus) {
      if (active) heading.focus({preventScroll:true});
      else (chooser.querySelector('[data-choice="' + old + '"]') || chooser.querySelector('button')).focus({preventScroll:true});
    }
    window.dispatchEvent(new CustomEvent('studio:transition-group',{detail:{group:active}}));
  }
  function mount() {
    dialog = $('editor');
    const panel = dialog.querySelector('.pt-settings');
    bar = document.createElement('div'); bar.className = 'pt-focus-head';
    back = button('← Back', () => {
      if (new URLSearchParams(location.search).get('workshopFocus') === '1' && window.parent !== window) {
        window.parent.postMessage({type:'studio:transition-workshop-back'}, location.origin);
      } else show('');
    });
    bar.append(back); const context = document.createElement('span'); context.id = 'pt-choice-context'; bar.append(context);
    heading = document.createElement('h3'); heading.tabIndex = -1;
    chooser = document.createElement('div'); chooser.className = 'pt-choose-tool';
    for(const [id,title] of Object.entries(groups)) {
      const b=button(title,() => show(id)); b.dataset.choice = id; chooser.append(b);
    }
    prompt = document.createElement('p'); prompt.className = 'pt-pane-prompt';
    prompt.append('The glass pane is off. ', button('Choose glass material', () => show('material')));
    panel.prepend(bar, heading, chooser, prompt);
    $('scope').closest('fieldset').dataset.ptGroup = 'scope';
    for (const key of ['effect','variant','layer','direction','color','intensity','duration']) {
      $(key).closest('label').dataset.ptGroup = ['intensity','duration'].includes(key) ? 'timing' : 'style';
    }
    $('layer-info').dataset.ptGroup='style';
    $('camera').dataset.ptGroup='camera';
    undo=button('Undo', () => { window.SleipnirTransitionEditor.undo?.(); update(); });
    undo.id='pt-undo'; $('save').before(undo);
    dialog.addEventListener('change',update);
    dialog.addEventListener('input',update);
    new MutationObserver(update).observe($('glass'),{subtree:true,attributes:true,attributeFilter:['hidden']});
    // Select an existing pane in the phone to go straight to its positioning tools.
    $('stage').addEventListener('click',event => {
      if (active === 'placement' || $('glass').querySelector('.pg-glass-values')?.hidden) return;
      const handle = $('stage').querySelector('.pg-glass-handles');
      if (!handle || handle.hidden) return;
      const rect = $('stage').getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width*100, y=(event.clientY-rect.top)/rect.height*100;
      const s=handle.style, l=parseFloat(s.left), t=parseFloat(s.top), w=parseFloat(s.width), h=parseFloat(s.height);
      if (x>=l && x<=l+w && y>=t && y<=t+h) show('placement');
    });
  }
  addEventListener('studio:transition-editor-opened', event => { if(!dialog) mount(); show(event.detail?.group,false); });
  addEventListener('studio:transition-history',update);
})();
