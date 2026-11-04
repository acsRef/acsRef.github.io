/* 樱花瓣飘落：纯 DOM + CSS 动画，不依赖任何库 */
(function () {
  'use strict';

  // 系统开启「减少动态效果」时直接不生成
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  var COUNT = window.innerWidth < 768 ? 5 : 11;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createPetal() {
    var petal = document.createElement('span');
    petal.className = 'sakura-petal';

    var size = rand(7, 13);
    petal.style.left = rand(-5, 100) + 'vw';
    petal.style.width = size + 'px';
    petal.style.height = size * 0.8 + 'px';
    petal.style.opacity = rand(0.28, 0.62).toFixed(2);
    petal.style.setProperty('--drift', rand(-140, 140).toFixed(0) + 'px');
    petal.style.animationDuration = rand(11, 22).toFixed(1) + 's';
    petal.style.animationDelay = (-rand(0, 20)).toFixed(1) + 's';
    return petal;
  }

  function start() {
    var layer = document.createElement('div');
    layer.className = 'sakura-layer';
    layer.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < COUNT; i++) {
      layer.appendChild(createPetal());
    }
    document.body.appendChild(layer);

    // 页面切到后台时暂停动画，省电
    document.addEventListener('visibilitychange', function () {
      var state = document.hidden ? 'paused' : 'running';
      Array.prototype.forEach.call(layer.children, function (petal) {
        petal.style.animationPlayState = state;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
