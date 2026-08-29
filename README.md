# reactive-pulse-check

A structured decision aid for reactive communications. See `SPEC.md` for
what it does and why, and `COPY.md` for the interface copy.

## Running it

This tool is plain HTML, CSS and JavaScript with no build step, but its
question set is loaded from `config/config.default.json` by `fetch`, which
browsers block from a `file://` URL. Serve the directory over `http://`
instead, for example:

```
python3 -m http.server
```

then open `http://localhost:8000` in a browser.