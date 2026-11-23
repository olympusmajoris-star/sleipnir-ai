{{flutter_js}}
{{flutter_build_config}}
_flutter.loader.load({
  config: { canvasKitBaseUrl: 'canvaskit/', canvasKitVariant: 'full' },
  onEntrypointLoaded: async function (engineInitializer) {
    const host = document.querySelector('#phone');
    const appRunner = await engineInitializer.initializeEngine({ hostElement: host });
    await appRunner.runApp();
    const boot = document.querySelector('#boot');
    if (boot) boot.remove();
  }
});
