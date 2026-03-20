'use strict';

(function attachUiController(globalScope) {
  class UIController {
    constructor(deps) {
      const safeDeps = deps && typeof deps === 'object' ? deps : {};
      this.deps = safeDeps;
      this.dispatchDepth = 0;
    }

    isDispatching() {
      return this.dispatchDepth > 0;
    }

    dispatch(intentName, payload, handler) {
      this.dispatchDepth += 1;
      try {
        if (typeof this.deps.onIntent === 'function') {
          this.deps.onIntent(intentName, payload);
        }
        return handler();
      } finally {
        this.dispatchDepth -= 1;
      }
    }

    handleAction(actionId) {
      const id = String(actionId || '');
      if (!id || typeof this.deps.applyAction !== 'function') {
        return { ok: false, reason: 'controller_action_unavailable', actionId: id };
      }
      return this.dispatch('action.execute', { actionId: id }, () => this.deps.applyAction(id));
    }

    handleEventOption(optionId) {
      const id = String(optionId || '');
      if (!id || typeof this.deps.applyEventOption !== 'function') {
        return { ok: false, reason: 'controller_event_option_unavailable', optionId: id };
      }
      return this.dispatch('event.option', { optionId: id }, () => this.deps.applyEventOption(id));
    }

    handleOpenSheet(sheetName) {
      const name = String(sheetName || '');
      if (!name || typeof this.deps.openSheet !== 'function') {
        return false;
      }
      this.dispatch('sheet.open', { sheetName: name }, () => {
        this.deps.openSheet(name);
      });
      return true;
    }

    handleCloseSheet() {
      if (typeof this.deps.closeSheet !== 'function') {
        return false;
      }
      this.dispatch('sheet.close', {}, () => {
        this.deps.closeSheet();
      });
      return true;
    }

    handleMenuCommand(command, payload) {
      const commandId = String(command || '').trim().toLowerCase();
      if (!commandId) {
        return { ok: false, reason: 'menu_command_missing' };
      }

      return this.dispatch('menu.command', { command: commandId, payload: payload || null }, () => {
        switch (commandId) {
          case 'open_stats':
            if (typeof this.deps.closeMenu === 'function') {
              this.deps.closeMenu();
            }
            if (typeof this.deps.openSheet === 'function') {
              this.deps.openSheet('dashboard');
              return { ok: true, command: commandId };
            }
            return { ok: false, reason: 'menu_stats_unavailable' };
          case 'new_run':
            if (typeof this.deps.closeMenu === 'function') {
              this.deps.closeMenu();
            }
            if (typeof this.deps.resetRun === 'function') {
              const result = this.deps.resetRun();
              return { ok: true, command: commandId, result };
            }
            return { ok: false, reason: 'menu_new_run_unavailable' };
          case 'toggle_menu':
            if (typeof this.deps.toggleMenu === 'function') {
              this.deps.toggleMenu();
              return { ok: true, command: commandId };
            }
            return { ok: false, reason: 'menu_toggle_unavailable' };
          default:
            return { ok: false, reason: `menu_command_unknown:${commandId}` };
        }
      });
    }
  }

  function createUIController(deps) {
    return new UIController(deps);
  }

  globalScope.GrowSimUIController = Object.freeze({
    UIController,
    createUIController
  });
})(window);
