'use strict';

(function attachScreenRuntime(globalScope) {
  class ScreenRuntimeManager {
    constructor(options) {
      const opts = options && typeof options === 'object' ? options : {};
      this.root = opts.root || document;
      this.defaultScreenId = String(opts.defaultScreenId || 'home');
      this.activeScreenId = this.defaultScreenId;
      this.controller = null;
      this.screens = new Map();
      this.prevViewModels = new Map();
      this.boundScreenIds = new Set();
    }

    register(screenModule) {
      if (!screenModule || typeof screenModule !== 'object' || typeof screenModule.id !== 'string') {
        return false;
      }
      const module = {
        id: screenModule.id,
        container: screenModule.container || null,
        mapping: screenModule.mapping || null,
        render: typeof screenModule.render === 'function' ? screenModule.render : (() => undefined),
        bindEvents: typeof screenModule.bindEvents === 'function' ? screenModule.bindEvents : (() => undefined),
        update: typeof screenModule.update === 'function' ? screenModule.update : (() => undefined)
      };
      this.screens.set(module.id, module);
      return true;
    }

    bindController(controller) {
      this.controller = controller || null;
      for (const [screenId, screenModule] of this.screens.entries()) {
        if (this.boundScreenIds.has(screenId)) {
          continue;
        }
        screenModule.bindEvents(this.controller);
        this.boundScreenIds.add(screenId);
      }
    }

    setActiveScreen(screenId) {
      const nextId = String(screenId || this.defaultScreenId);
      this.activeScreenId = this.screens.has(nextId) ? nextId : this.defaultScreenId;
      this.applyVisibility();
      return this.activeScreenId;
    }

    getActiveScreenId() {
      return this.activeScreenId;
    }

    applyVisibility() {
      for (const screenModule of this.screens.values()) {
        const node = this.resolveContainer(screenModule);
        if (!node) {
          continue;
        }
        const isActive = screenModule.id === this.activeScreenId;
        node.classList.toggle('is-active', isActive);
        node.hidden = !isActive;
        node.setAttribute('aria-hidden', String(!isActive));
        node.style.display = isActive ? 'grid' : 'none';
        node.style.pointerEvents = isActive ? 'auto' : 'none';
      }
    }

    resolveContainer(screenModule) {
      if (screenModule.container instanceof HTMLElement) {
        return screenModule.container;
      }
      const selector = `.hud-screen[data-screen="${screenModule.id}"]`;
      const found = this.root.querySelector(selector);
      if (found instanceof HTMLElement) {
        screenModule.container = found;
        return found;
      }
      return null;
    }

    computeViewModel(screenModule, appState) {
      if (!screenModule.mapping || typeof screenModule.mapping.toViewModel !== 'function') {
        return appState;
      }
      return screenModule.mapping.toViewModel(appState);
    }

    render(appState) {
      const active = this.screens.get(this.activeScreenId);
      if (!active) {
        return;
      }

      this.applyVisibility();

      const vm = this.computeViewModel(active, appState);
      active.render(vm);

      if (!this.boundScreenIds.has(active.id)) {
        active.bindEvents(this.controller);
        this.boundScreenIds.add(active.id);
      }

      const previousVm = this.prevViewModels.get(active.id);
      active.update(vm, previousVm);
      this.prevViewModels.set(active.id, vm);
    }
  }

  function createScreenRuntimeManager(options) {
    return new ScreenRuntimeManager(options);
  }

  globalScope.GrowSimScreenRuntime = Object.freeze({
    ScreenRuntimeManager,
    createScreenRuntimeManager
  });
})(window);
