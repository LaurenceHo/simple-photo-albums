// Polyfill SlowBuffer for Node.js v25+ where it was removed.
// Required by buffer-equal-constant-time (transitive dep of google-auth-library via jws/jwa).
const bufferModule = require('buffer');
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}
