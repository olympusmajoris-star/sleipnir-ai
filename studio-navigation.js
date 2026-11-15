/* Navigation is independent of editor loading, sign-in and save availability. */
(() => {
  'use strict';
  const nav = document.querySelector('.studio-page-navigation');
  if (!nav) return;
  const menu = nav.querySelector('.studio-page-menu');
  for (const group of window.StudioWorkspaceCore?.GROUPS || []) {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = group.name;
    section.append(heading);
    for (const [id, name] of group.pages) {
      const link = document.createElement('a');
      link.textContent = name;
      link.href = 'workshop.html?' + new URLSearchParams({group: group.id, item: id});
      link.target = '_top';
      section.append(link);
    }
    menu.append(section);
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') nav.querySelector('details')?.removeAttribute('open');
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target)) nav.querySelector('details')?.removeAttribute('open');
  });
})();
