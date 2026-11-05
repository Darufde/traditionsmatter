// Loads the game's plain scripts into a Node VM context for headless tests.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
module.exports = function load(files) {
  const ctx = { console, Math, Date, Map, Set, Float32Array, Uint8Array, Int32Array, Uint32Array, Int8Array, Promise, Array, Object, JSON, Number, String, Infinity, localStorage: undefined };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
    vm.runInContext(src, ctx, { filename: f });
  }
  return ctx.TM;
};
