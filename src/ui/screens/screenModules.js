'use strict';

(function attachScreenModules(globalScope) {
  function createHomeScreenModule(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const container = opts.container || null;
    const mapping = opts.mapping || null;
    const renderer = opts.renderer || globalScope.GrowSimHomeRenderer || null;
    const onUpdate = typeof opts.onUpdate === 'function' ? opts.onUpdate : (() => undefined);
    const onBindEvents = typeof opts.onBindEvents === 'function' ? opts.onBindEvents : (() => undefined);

    return {
      id: 'home',
      container,
      mapping,
      render(vm) {
        if (renderer && typeof renderer.render === 'function') {
          return renderer.render(vm, container);
        }
        return container;
      },
      bindEvents(controller) {
        if (renderer && typeof renderer.bindEvents === 'function') {
          renderer.bindEvents(controller, container);
          return;
        }
        onBindEvents(controller);
      },
      update(vm, prevVm) {
        if (renderer && typeof renderer.update === 'function') {
          renderer.update(vm, prevVm, container);
          return;
        }
        onUpdate(vm, prevVm);
      }
    };
  }

  function createPassiveScreenModule(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const screenId = String(opts.id || 'screen');
    const container = opts.container || null;
    const mapping = opts.mapping || null;

    return {
      id: screenId,
      container,
      mapping,
      render() {
        return container;
      },
      bindEvents() {
      },
      update() {
      }
    };
  }

  function createOverlayModule(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const moduleId = String(opts.id || 'overlay');
    const renderFn = typeof opts.render === 'function' ? opts.render : (() => undefined);
    const bindFn = typeof opts.bindEvents === 'function' ? opts.bindEvents : (() => undefined);
    const updateFn = typeof opts.update === 'function' ? opts.update : (() => undefined);

    return {
      id: moduleId,
      render(vm) {
        return renderFn(vm);
      },
      bindEvents(controller) {
        bindFn(controller);
      },
      update(vm, prevVm) {
        updateFn(vm, prevVm);
      }
    };
  }

  function createMenuOverlayModule(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const onBindEvents = typeof opts.onBindEvents === 'function' ? opts.onBindEvents : (() => undefined);
    const onUpdate = typeof opts.onUpdate === 'function' ? opts.onUpdate : (() => undefined);

    return createOverlayModule({
      id: 'menuOverlay',
      bindEvents(controller) {
        onBindEvents(controller);
      },
      update(vm, prevVm) {
        onUpdate(vm, prevVm);
      }
    });
  }

  function createSheetsOverlayModule(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const onBindEvents = typeof opts.onBindEvents === 'function' ? opts.onBindEvents : (() => undefined);
    const onUpdate = typeof opts.onUpdate === 'function' ? opts.onUpdate : (() => undefined);

    return createOverlayModule({
      id: 'sheetsOverlay',
      bindEvents(controller) {
        onBindEvents(controller);
      },
      update(vm, prevVm) {
        onUpdate(vm, prevVm);
      }
    });
  }

  globalScope.GrowSimScreenModules = Object.freeze({
    createHomeScreenModule,
    createPassiveScreenModule,
    createMenuOverlayModule,
    createSheetsOverlayModule
  });
})(window);
