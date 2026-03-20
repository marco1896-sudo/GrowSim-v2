'use strict';

(function attachUiPrimitives(globalScope) {
  function applyDataset(node, dataset) {
    if (!dataset || typeof dataset !== 'object') {
      return;
    }
    for (const [key, value] of Object.entries(dataset)) {
      if (value === undefined || value === null) {
        continue;
      }
      node.dataset[key] = String(value);
    }
  }

  function applyAttributes(node, attrs) {
    if (!attrs || typeof attrs !== 'object') {
      return;
    }
    for (const [name, value] of Object.entries(attrs)) {
      if (value === undefined || value === null) {
        continue;
      }
      node.setAttribute(name, String(value));
    }
  }

  function appendChildren(node, children) {
    if (!Array.isArray(children)) {
      return;
    }
    for (const child of children) {
      if (child instanceof Node) {
        node.appendChild(child);
      }
    }
  }

  function createBaseElement(tag, baseClass, props) {
    const options = props && typeof props === 'object' ? props : {};
    const elementTag = typeof options.tag === 'string' && options.tag ? options.tag : tag;
    const node = document.createElement(elementTag);

    const extraClass = typeof options.className === 'string' ? options.className.trim() : '';
    node.className = extraClass ? `${baseClass} ${extraClass}` : baseClass;

    if (typeof options.text === 'string') {
      node.textContent = options.text;
    }
    if (typeof options.html === 'string') {
      node.innerHTML = options.html;
    }

    applyDataset(node, options.dataset);
    applyAttributes(node, options.attrs);
    appendChildren(node, options.children);

    return node;
  }

  function card(props) {
    return createBaseElement('article', 'gs-card', props);
  }

  function button(props) {
    const node = createBaseElement('button', 'gs-button', props);
    if (!node.hasAttribute('type')) {
      node.setAttribute('type', 'button');
    }
    return node;
  }

  function statusRow(props) {
    return createBaseElement('article', 'gs-status-row', props);
  }

  function modal(props) {
    return createBaseElement('section', 'gs-modal', props);
  }

  const api = Object.freeze({
    card,
    button,
    statusRow,
    modal
  });

  globalScope.GrowSimUIPrimitives = api;
})(window);
