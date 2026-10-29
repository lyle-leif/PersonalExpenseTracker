"use strict";
var MonixPrivacy = (() => {
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

  // app/privacy-browser.mjs
  var privacy_browser_exports = {};
  __export(privacy_browser_exports, {
    CardFlipController: () => CardFlipController,
    PIN_ITERATIONS: () => PIN_ITERATIONS,
    PrivacySession: () => PrivacySession,
    UNLOCK_IDLE_MS: () => UNLOCK_IDLE_MS,
    assertBalanceAccess: () => assertBalanceAccess,
    balanceVisible: () => balanceVisible,
    canRevealTotal: () => canRevealTotal,
    createPinVerifier: () => createPinVerifier,
    createPrivacyStore: () => createPrivacyStore,
    derivePin: () => derivePin,
    enrollDevice: () => enrollDevice,
    equalBytes: () => equalBytes,
    fromBase64url: () => fromBase64url,
    newDeviceChallenge: () => newDeviceChallenge,
    pinAttempt: () => pinAttempt,
    publicAccountView: () => publicAccountView,
    toBase64url: () => toBase64url,
    unlockDevice: () => unlockDevice,
    validVerifier: () => validVerifier,
    validatePin: () => validatePin,
    verifyDeviceAssertion: () => verifyDeviceAssertion
  });

  // app/balance-privacy.mjs
  var PIN_ITERATIONS = 6e5;
  var UNLOCK_IDLE_MS = 6e4;
  var encoder = new TextEncoder();
  var decoder = new TextDecoder();
  var toBase64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  function fromBase64url(text) {
    if (typeof text !== "string" || text.length > 16384 || !/^[\w-]*$/.test(text)) throw Error("Invalid verification data.");
    return Uint8Array.from(atob(text.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
  }
  function equalBytes(a, b) {
    a = new Uint8Array(a);
    b = new Uint8Array(b);
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
    return result === 0;
  }
  function validatePin(pin) {
    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) throw Error("Use exactly six digits for your Monix PIN.");
    return pin;
  }
  async function derivePin(pin, salt, cryptoApi = globalThis.crypto) {
    validatePin(pin);
    if (!cryptoApi?.subtle) throw Error("Secure PIN setup is unavailable in this browser.");
    const material = await cryptoApi.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await cryptoApi.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64url(salt), iterations: PIN_ITERATIONS }, material, 256));
  }
  async function createPinVerifier(pin, cryptoApi = globalThis.crypto) {
    const salt = toBase64url(cryptoApi.getRandomValues(new Uint8Array(16)));
    return { version: 1, algorithm: "PBKDF2-SHA256", iterations: PIN_ITERATIONS, salt, verifier: toBase64url(await derivePin(pin, salt, cryptoApi)) };
  }
  function validVerifier(pin) {
    return !!pin && pin.version === 1 && pin.algorithm === "PBKDF2-SHA256" && pin.iterations === PIN_ITERATIONS && fromBase64url(pin.salt).length === 16 && fromBase64url(pin.verifier).length === 32;
  }
  function pinAttempt(record, correct, now = Date.now()) {
    if (record.blockedUntil > now) return { record, result: { ok: false, blockedUntil: record.blockedUntil, remaining: 0 } };
    const next = { ...record };
    if (correct) {
      next.failures = 0;
      next.groups = 0;
      next.blockedUntil = 0;
      return { record: next, result: { ok: true, remaining: 5, blockedUntil: 0 } };
    }
    next.failures = (record.failures || 0) + 1;
    if (next.failures >= 5) {
      next.failures = 0;
      next.groups = Math.min((record.groups || 0) + 1, 5);
      next.blockedUntil = now + Math.min(3e5, 3e4 * 2 ** (next.groups - 1));
    }
    return { record: next, result: { ok: false, remaining: next.blockedUntil > now ? 0 : 5 - next.failures, blockedUntil: next.blockedUntil || 0 } };
  }
  function balanceVisible(account, unlocked = false) {
    return account.balanceLocked !== true || unlocked;
  }
  function canRevealTotal(accounts, unlocked = false) {
    return accounts.every((a) => balanceVisible(a, unlocked));
  }
  function publicAccountView(account, unlocked = false) {
    if (balanceVisible(account, unlocked)) return structuredClone(account);
    const { opening, limit, closingDay, dueDay, ...safe } = account;
    return { ...safe, balanceHidden: true };
  }
  function assertBalanceAccess(accounts, unlocked = false) {
    if (!canRevealTotal(accounts, unlocked)) throw Error("Unlock protected balances before continuing.");
  }
  var PrivacySession = class {
    constructor({ ownerId, now = Date.now, visible = () => true, onChange = () => {
    } }) {
      this.ownerId = ownerId;
      this.now = now;
      this.visible = visible;
      this.onChange = onChange;
      this.epoch = 0;
      this.until = 0;
      this.timer = null;
    }
    isUnlocked() {
      return !!this.ownerId && this.visible() && this.until > this.now();
    }
    begin() {
      return { ownerId: this.ownerId, epoch: this.epoch };
    }
    grant(ticket) {
      if (!ticket || ticket.ownerId !== this.ownerId || ticket.epoch !== this.epoch || !this.visible()) return false;
      this.until = this.now() + UNLOCK_IDLE_MS;
      this.schedule();
      this.onChange();
      return true;
    }
    touch() {
      if (this.isUnlocked()) {
        this.until = this.now() + UNLOCK_IDLE_MS;
        this.schedule();
      }
    }
    schedule() {
      clearTimeout(this.timer);
      if (this.until) this.timer = setTimeout(() => this.lock(), Math.max(1, this.until - this.now() + 1));
      this.timer?.unref?.();
    }
    lock() {
      clearTimeout(this.timer);
      this.timer = null;
      this.until = 0;
      this.epoch++;
      this.onChange();
    }
    switchOwner(ownerId) {
      this.lock();
      this.ownerId = ownerId;
    }
    destroy() {
      clearTimeout(this.timer);
      this.until = 0;
      this.epoch++;
    }
  };
  function derSignature(raw) {
    const bytes = new Uint8Array(raw);
    if (bytes.length < 8 || bytes[0] !== 48 || bytes[1] !== bytes.length - 2) throw Error("Invalid device signature.");
    let position = 2;
    const output = new Uint8Array(64);
    for (let i = 0; i < 2; i++) {
      if (bytes[position++] !== 2) throw Error("Invalid device signature.");
      const length = bytes[position++];
      if (length < 1 || length > 33 || position + length > bytes.length || bytes[position] & 128) throw Error("Invalid device signature.");
      let part = bytes.slice(position, position + length);
      position += length;
      if (part[0] === 0 && part.length > 1) part = part.slice(1);
      if (part.length > 32) throw Error("Invalid device signature.");
      output.set(part, 32 * i + 32 - part.length);
    }
    if (position !== bytes.length) throw Error("Invalid device signature.");
    return output;
  }
  function newDeviceChallenge({ ownerId, origin, rpId, now = Date.now(), cryptoApi = globalThis.crypto }) {
    if (!ownerId || new URL(origin).hostname !== rpId) throw Error("Invalid device-verification scope.");
    return { ownerId, origin, rpId, challenge: toBase64url(cryptoApi.getRandomValues(new Uint8Array(32))), expiresAt: now + 6e4, used: false };
  }
  async function checkAuthenticator(clientDataJSON, authenticatorData, request, cryptoApi, expectedType) {
    if (clientDataJSON.byteLength > 4096 || authenticatorData.byteLength < 37 || authenticatorData.byteLength > 4096) throw Error("Invalid device response.");
    const client = JSON.parse(decoder.decode(clientDataJSON)), auth = new Uint8Array(authenticatorData);
    if (client.type !== expectedType || client.challenge !== request.challenge || client.origin !== request.origin || client.crossOrigin === true) throw Error("Device response did not match this request.");
    if ((auth[32] & 5) !== 5) throw Error("Device user verification is required.");
    const rpHash = await cryptoApi.subtle.digest("SHA-256", encoder.encode(request.rpId));
    if (!equalBytes(auth.slice(0, 32), rpHash)) throw Error("Device response belongs to a different app.");
    return auth;
  }
  async function verifyDeviceAssertion({ request, enrollment, assertion, ownerId, now = Date.now(), cryptoApi = globalThis.crypto }) {
    if (request.used || request.expiresAt <= now || request.ownerId !== ownerId) throw Error("Device request expired or was cancelled.");
    request.used = true;
    if (enrollment.ownerId !== ownerId || enrollment.origin !== request.origin || enrollment.rpId !== request.rpId || enrollment.algorithm !== -7 || toBase64url(assertion.rawId) !== enrollment.credentialId) throw Error("Device enrollment did not match this account.");
    const response = assertion.response;
    if (response.userHandle && !equalBytes(response.userHandle, fromBase64url(enrollment.userHandle))) throw Error("Device response belongs to another account.");
    await checkAuthenticator(response.clientDataJSON, response.authenticatorData, request, cryptoApi, "webauthn.get");
    const hash = new Uint8Array(await cryptoApi.subtle.digest("SHA-256", response.clientDataJSON)), data = new Uint8Array(response.authenticatorData.byteLength + hash.length);
    data.set(new Uint8Array(response.authenticatorData));
    data.set(hash, response.authenticatorData.byteLength);
    const key = await cryptoApi.subtle.importKey("spki", fromBase64url(enrollment.spki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    if (!await cryptoApi.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derSignature(response.signature), data)) throw Error("Device signature could not be verified.");
    return true;
  }
  async function enrollDevice({ ownerId, origin = location.origin, rpId = location.hostname, credentials = navigator.credentials, cryptoApi = globalThis.crypto, signal }) {
    if (!origin.startsWith("https://")) throw Error("Device setup requires the final HTTPS app address.");
    const request = newDeviceChallenge({ ownerId, origin, rpId, cryptoApi }), userHandle = cryptoApi.getRandomValues(new Uint8Array(32));
    const credential = await credentials.create({ signal, publicKey: { challenge: fromBase64url(request.challenge), rp: { name: "Monix balance privacy", id: rpId }, user: { id: userHandle, name: "Monix " + toBase64url(userHandle).slice(0, 8), displayName: "Monix balance privacy" }, pubKeyCredParams: [{ type: "public-key", alg: -7 }], authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" }, attestation: "none", timeout: 6e4 } });
    if (!credential || signal?.aborted || Date.now() >= request.expiresAt) throw Error("Device setup was cancelled.");
    const response = credential.response, spki = response.getPublicKey?.();
    if (!spki || response.getPublicKeyAlgorithm?.() !== -7 || !response.getAuthenticatorData) throw Error("This browser cannot complete device setup. Use your Monix PIN.");
    await checkAuthenticator(response.clientDataJSON, response.getAuthenticatorData(), request, cryptoApi, "webauthn.create");
    return { version: 1, ownerId, origin, rpId, algorithm: -7, credentialId: toBase64url(credential.rawId), spki: toBase64url(spki), userHandle: toBase64url(userHandle), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  }
  async function unlockDevice({ ownerId, enrollment, credentials = navigator.credentials, cryptoApi = globalThis.crypto, signal }) {
    const request = newDeviceChallenge({ ownerId, origin: enrollment.origin, rpId: enrollment.rpId, cryptoApi });
    const assertion = await credentials.get({ signal, publicKey: { challenge: fromBase64url(request.challenge), rpId: request.rpId, allowCredentials: [{ id: fromBase64url(enrollment.credentialId), type: "public-key", transports: ["internal"] }], userVerification: "required", timeout: 6e4 } });
    if (!assertion || signal?.aborted) throw Error("Device unlock was cancelled.");
    const verified = await verifyDeviceAssertion({ request, enrollment, assertion, ownerId, cryptoApi });
    if (signal?.aborted) throw Error("Device unlock was cancelled.");
    return verified;
  }

  // app/privacy-store.mjs
  function createPrivacyStore({ name = "monix-balance-privacy-v1", origin = globalThis.location?.origin || "test-origin", indexedDB = globalThis.indexedDB, cryptoApi = globalThis.crypto, now = Date.now } = {}) {
    let connection;
    const db = () => connection ||= new Promise((resolve, reject) => {
      if (!indexedDB) {
        reject(Error("Private device storage is unavailable."));
        return;
      }
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("owners");
        r.result.createObjectStore("meta");
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => {
          r.result.close();
          connection = null;
        };
        resolve(r.result);
      };
      r.onerror = () => {
        connection = null;
        reject(Error("Could not open private device storage."));
      };
    });
    const key = (ownerId) => {
      if (typeof ownerId !== "string" || !ownerId || ownerId.length > 200) throw Error("An authenticated owner is required.");
      return origin + "|" + ownerId;
    };
    async function mutate(ownerId, fn) {
      const database = await db();
      return new Promise((resolve, reject) => {
        const tx = database.transaction(["owners", "meta"], "readwrite"), store = tx.objectStore("owners");
        let result, error;
        const r = store.get(key(ownerId)), install = tx.objectStore("meta").get("installation");
        let old, installation, loaded = 0;
        const apply = () => {
          if (++loaded !== 2) return;
          try {
            if (!installation) {
              installation = cryptoApi.randomUUID();
              tx.objectStore("meta").put(installation, "installation");
            }
            const base = old || { version: 1, ownerId, origin, installation, revision: 0, failures: 0, groups: 0, blockedUntil: 0, preferDevice: true };
            if (base.ownerId !== ownerId || base.origin !== origin || base.installation !== installation) throw Error("Private device identity mismatch.");
            const value = fn(structuredClone(base));
            result = value.result;
            store.put({ ...value.record, revision: base.revision + 1 }, key(ownerId));
          } catch (e) {
            error = e;
            tx.abort();
          }
        };
        r.onsuccess = () => {
          old = r.result;
          apply();
        };
        install.onsuccess = () => {
          installation = install.result;
          apply();
        };
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(error || Error("Could not save privacy settings. Your previous settings are retained."));
        tx.onerror = () => {
        };
      });
    }
    async function read(ownerId) {
      const database = await db();
      return new Promise((resolve, reject) => {
        const tx = database.transaction("owners"), r = tx.objectStore("owners").get(key(ownerId));
        r.onsuccess = () => {
          const row = r.result;
          if (row && (row.ownerId !== ownerId || row.origin !== origin)) {
            reject(Error("Private device identity mismatch."));
            return;
          }
          resolve(row || null);
        };
        r.onerror = () => reject(Error("Could not read privacy settings."));
      });
    }
    async function setup(ownerId, pin) {
      const verifier = await createPinVerifier(pin, cryptoApi);
      return mutate(ownerId, (record) => {
        if (record.pin) throw Error("A PIN already exists. Verify it before changing it.");
        return { record: { ...record, pin: verifier }, result: true };
      });
    }
    async function verify(ownerId, pin) {
      for (let retry = 0; retry < 3; retry++) {
        const snapshot = await read(ownerId);
        if (!snapshot?.pin || !validVerifier(snapshot.pin)) throw Error("Set up a Monix PIN on this installation first.");
        if (snapshot.blockedUntil > now()) return { ok: false, blockedUntil: snapshot.blockedUntil, remaining: 0 };
        const bytes = await derivePin(pin, snapshot.pin.salt, cryptoApi), correct = equalBytes(bytes, fromBase64url(snapshot.pin.verifier));
        const result = await mutate(ownerId, (record) => {
          if (record.pin?.verifier !== snapshot.pin.verifier) return { record, result: { changed: true } };
          return pinAttempt(record, correct, now());
        });
        if (!result.changed) return result;
      }
      throw Error("PIN settings changed in another tab. Try again.");
    }
    async function change(ownerId, current, next) {
      const snapshot = await read(ownerId), verified = await verify(ownerId, current);
      if (!verified.ok) return verified;
      const verifier = await createPinVerifier(next, cryptoApi);
      await mutate(ownerId, (record) => {
        if (record.pin?.verifier !== snapshot?.pin?.verifier) throw Error("PIN changed in another tab. Try again.");
        return { record: { ...record, pin: verifier, failures: 0, groups: 0, blockedUntil: 0 }, result: true };
      });
      return { ok: true };
    }
    async function preference(ownerId, preferDevice) {
      if (typeof preferDevice !== "boolean") throw Error("Invalid device-unlock preference.");
      return mutate(ownerId, (record) => ({ record: { ...record, preferDevice }, result: true }));
    }
    async function saveEnrollment(ownerId, enrollment) {
      return mutate(ownerId, (record) => {
        if (!record.pin || enrollment.ownerId !== ownerId || enrollment.origin !== origin || enrollment.algorithm !== -7) throw Error("Device enrollment did not match this owner.");
        return { record: { ...record, enrollment: structuredClone(enrollment) }, result: true };
      });
    }
    async function clearOwner(ownerId) {
      const database = await db();
      await new Promise((resolve, reject) => {
        const tx = database.transaction("owners", "readwrite");
        tx.objectStore("owners").delete(key(ownerId));
        tx.oncomplete = resolve;
        tx.onabort = () => reject(Error("Could not clear privacy settings."));
        tx.onerror = () => {
        };
      });
    }
    return { read, setup, verify, change, preference, saveEnrollment, clearOwner, close: async () => {
      (await db()).close();
      connection = null;
    } };
  }

  // app/card-flip.mjs
  var CardFlipController = class {
    constructor() {
      this.jobs = /* @__PURE__ */ new Map();
    }
    isBusy(id) {
      return this.jobs.has(id);
    }
    async flip({ id, allowed, reduced = false, exit, swap, enter, finish = () => {
    } }) {
      if (this.isBusy(id) || !allowed()) return false;
      const job = new AbortController();
      this.jobs.set(id, job);
      try {
        if (!reduced) await exit(job.signal);
        if (job.signal.aborted || !allowed()) return false;
        swap();
        if (!reduced) await enter(job.signal);
        return !job.signal.aborted;
      } catch (error) {
        if (!job.signal.aborted) throw error;
        return false;
      } finally {
        if (this.jobs.get(id) === job) this.jobs.delete(id);
        finish();
      }
    }
    cancelAll() {
      for (const job of this.jobs.values()) job.abort();
      this.jobs.clear();
    }
  };
  return __toCommonJS(privacy_browser_exports);
})();
window.MonixPrivacy=MonixPrivacy;
