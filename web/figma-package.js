'use strict';
globalThis.FolioFigmaPackage = {
  configure(files, address) {
    const url = new URL(address);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw new Error('HTTPS 스튜디오 주소 또는 로컬 개발 주소를 사용해 주세요.');
    const origin = url.origin;
    return files.map(file => {
      let text = file.text;
      if (file.name === 'manifest.json') {
        const manifest = JSON.parse(text);
        manifest.networkAccess = local ? { allowedDomains: ['none'], devAllowedDomains: [origin] } : { allowedDomains: [origin] };
        text = JSON.stringify(manifest, null, 2);
      }
      if (file.name === 'ui.html') text = text.replace(/(<meta name="folio-studio-origin" content=")[^"]*(">)/, '$1' + origin + '$2');
      return { name: file.name, text };
    });
  }
};
