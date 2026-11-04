/* 看板娘：本地的 Live2D 组件（source/live2d/），不依赖任何外链 CDN */
(function () {
  'use strict';

  function boot() {
    if (typeof L2Dwidget === 'undefined') return;

    try {
      L2Dwidget.init({
        model: {
          jsonPath: '/live2d/models/shizuku/shizuku.model.json',
          scale: 1
        },
        display: {
          position: 'right',
          width: 190,
          height: 380,
          hOffset: 0,
          vOffset: -8,
          superSample: 2
        },
        mobile: { show: true, scale: 0.55, motion: true },
        react: { opacity: 1 },
        dialog: { enable: false },
        name: { canvas: 'live2dcanvas', div: 'live2d-widget' }
      });
    } catch (e) {
      // 看板娘只是装饰，出错也不该影响阅读
      if (window.console) console.warn('[live2d] init failed:', e);
    }
  }

  if (document.readyState === 'complete') {
    boot();
  } else {
    window.addEventListener('load', boot);
  }
})();
