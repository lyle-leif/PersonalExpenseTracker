"use strict";
var MonixMotion = (() => {
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

  // phone-preview/motion-core.mjs
  var motion_core_exports = {};
  __export(motion_core_exports, {
    BuddyController: () => BuddyController,
    REACTIONS: () => REACTIONS
  });
  var REACTIONS = ["wave", "tilt", "wiggle", "hug", "bounce"];
  var duration = { wave: 1800, tilt: 1500, wiggle: 1300, hug: 2300, bounce: 1700 };
  var BuddyController = class {
    constructor({ now = Date.now, random = Math.random, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id), available = () => true, motion = () => true, onGesture = () => {
    }, onRest = () => {
    }, onAck = () => {
    }, onStatic = () => {
    }, onWords = () => {
    } } = {}) {
      Object.assign(this, { now, random, setTimer, clearTimer, available, motion, onGesture, onRest, onAck, onStatic, onWords });
      this.timer = null;
      this.settle = null;
      this.active = false;
      this.busy = false;
      this.last = null;
      this.lastWord = null;
      this.lastAction = -Infinity;
      this.wordsDue = now() + 45e3 + random() * 15e3;
      this.energy = "playful";
    }
    choose(values, last) {
      const pool = values.filter((v) => v !== last);
      return pool[Math.min(pool.length - 1, Math.floor(this.random() * pool.length))];
    }
    words(direct = false) {
      if (!direct && this.now() < this.wordsDue) return;
      const text = this.choose(direct ? ["Oh, hi!", "You rang?", "Hello again.", "You found me."] : ["Still here.", "Oh, hello.", "Just checking in."], this.lastWord);
      this.lastWord = text;
      this.wordsDue = this.now() + 45e3 + this.random() * 15e3;
      this.onWords(text);
    }
    reconcile(energy = this.energy) {
      const changed = energy !== this.energy;
      this.energy = energy;
      const next = this.available() && this.motion();
      if (next === this.active && !changed) return;
      this.stop();
      this.active = next;
      if (next) {
        this.wordsDue = this.now() + 45e3 + this.random() * 15e3;
        this.arm();
      }
    }
    arm() {
      this.clearTimer(this.timer);
      this.timer = null;
      if (!this.active) return;
      this.timer = this.setTimer(() => {
        this.timer = null;
        if (!this.available() || !this.motion()) {
          this.reconcile();
          return;
        }
        this.play(false);
      }, this.energy === "calm" ? 18e3 + this.random() * 6e3 : 1e4 + this.random() * 5e3);
    }
    play(direct = false, requested = null) {
      if (!this.available()) return false;
      if (!this.motion()) {
        if (direct) {
          this.onStatic();
          this.words(true);
        }
        return false;
      }
      if (this.busy) {
        if (direct) this.onAck();
        return false;
      }
      this.clearTimer(this.timer);
      this.timer = null;
      this.busy = true;
      const gesture = requested || this.choose(REACTIONS, this.last);
      this.last = gesture;
      this.onGesture(gesture, direct);
      this.words(direct);
      this.settle = this.setTimer(() => {
        this.settle = null;
        this.busy = false;
        this.onRest();
        this.arm();
      }, duration[gesture] || 1800);
      return true;
    }
    tap(requested = null) {
      return this.play(true, requested);
    }
    action() {
      if (this.now() - this.lastAction < 4e3 || !this.available() || !this.motion()) return false;
      this.lastAction = this.now();
      return this.play(false);
    }
    stop() {
      this.clearTimer(this.timer);
      this.clearTimer(this.settle);
      this.timer = this.settle = null;
      this.active = false;
      this.busy = false;
      this.onRest();
    }
    destroy() {
      this.stop();
    }
  };
  return __toCommonJS(motion_core_exports);
})();
