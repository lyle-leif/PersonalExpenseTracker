"use strict";
var MonixLayout = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // phone-preview/layout-core.mjs
  var layout_core_exports = {};
  __export(layout_core_exports, {
    migrateMotionPreferences: () => migrateMotionPreferences,
    viewportLayout: () => viewportLayout
  });
  function migrateMotionPreferences(value) {
    const saved = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    if (saved.motionVersion === 2) return { ...saved };
    return { ...saved, paused: false, reduced: false, motionVersion: 2 };
  }
  function viewportLayout({ layoutHeight, visualHeight = layoutHeight, offsetTop = 0, scale = 1, editing = false, dynamicHeight = layoutHeight }) {
    const zoomed = Math.abs(scale - 1) > 0.05;
    const keyboard = !zoomed && editing && layoutHeight - visualHeight > 100;
    const height = !zoomed && !keyboard ? Math.max(1, Math.min(layoutHeight, visualHeight + offsetTop)) : layoutHeight;
    return { keyboard, height, fallback: Math.abs(dynamicHeight - height) > 2, keyboardHeight: keyboard ? visualHeight : null, keyboardTop: keyboard ? offsetTop : null };
  }
  return __toCommonJS(layout_core_exports);
})();
