/* Hosted controls for the core preview's existing live Tweak interface. */
(function (G) {
  'use strict';
  const controls = document.getElementById('rr-settings-fields');
  G.Tweak = class {
    constructor({ onChange }) { this.onChange = onChange; }
    addSlider(state, property, options) {
      const label = document.createElement('label'); label.className = 'rr-setting';
      const name = document.createElement('span'); name.textContent = options.label;
      const value = document.createElement('output');
      const input = document.createElement('input'); input.type = 'range';
      input.id = 'rr-setting-' + property; input.min = options.min; input.max = options.max;
      input.step = options.step || 1; input.value = state[property];
      value.setAttribute('for', input.id);
      const update = () => { value.textContent = String(Number(input.value)) + (options.unit || ''); };
      input.addEventListener('input', () => { state[property] = Number(input.value); update(); this.onChange(); });
      label.append(name, value, input); controls.append(label); update();
      return this;
    }
  };
  const sections = Array.from(document.querySelectorAll('#raven-windshield-console > section'));
  const buttons = Array.from(document.querySelectorAll('[data-car-choice]'));
  const full = document.getElementById('rr-full-screen');
  function choose(car) {
    if (!buttons.some(button => button.dataset.carChoice === car)) car = 'maybach';
    sections.forEach(section => { section.hidden = section.querySelector('.rw-mount').dataset.car !== car; });
    buttons.forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.carChoice === car)); });
    const url = new URL('raven-road-studio.html', location.href); url.searchParams.set('car', car);
    full.href = url.href;
  }
  buttons.forEach(button => button.addEventListener('click', () => choose(button.dataset.carChoice)));
  choose(new URL(location.href).searchParams.get('car') || 'maybach');
  const back = document.getElementById('rr-back');
  back.addEventListener('click', event => {
    try {
      if (G.parent !== G && G.parent.location.origin === location.origin && G.parent.RavenWindshieldWorkspace) {
        event.preventDefault(); G.parent.RavenWindshieldWorkspace.close();
      }
    } catch (_) { /* The normal Studio link remains available. */ }
  });
})(window);
