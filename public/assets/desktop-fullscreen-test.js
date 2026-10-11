const closeFixture = () => window.__TAURI_INTERNALS__.invoke('exit_fullscreen_fixture');
document.getElementById('close').addEventListener('click', closeFixture);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeFixture(); });
