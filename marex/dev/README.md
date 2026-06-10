# Dev notes

Smoke tests for the app (no browser needed):

```sh
npm install jsdom fake-indexeddb
node test-app.js
```

Update `ROOT` in `test-app.js` if the repo lives elsewhere.

When changing any app file, bump `VERSION` in `../sw.js` so installed
PWAs pick up the new files.
