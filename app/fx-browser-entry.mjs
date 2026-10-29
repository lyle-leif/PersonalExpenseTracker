import * as core from './fx-core.mjs';
import * as device from './fx-device.mjs';
globalThis.MonixFX = { ...core, ...device };
