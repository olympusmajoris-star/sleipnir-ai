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
  const back = document.getElementById('rr-back');
  back.addEventListener('click', event => {
    try {
      if (G.parent !== G && G.parent.location.origin === location.origin && G.parent.RavenWindshieldWorkspace) {
        event.preventDefault(); G.parent.RavenWindshieldWorkspace.close();
      }
    } catch (_) { /* The normal Studio link remains available. */ }
  });
})(window);
