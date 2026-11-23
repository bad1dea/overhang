# Overhang privacy

Overhang collects nothing.

- Neither the app nor the Safari extension makes network requests. The extension's own pages are locked to that by
  their content security policy (`connect-src 'none'` in `Extension/Resources/manifest.json`).
- The only things kept are your settings: which sites you switched Overhang off for, and whether text may run under
  Safari's buttons. They stay in Safari's extension storage on your iPhone.
- No accounts, analytics, ads or tracking.

Safari warns that an extension allowed on a site can read and change its pages, passwords and card numbers included.
That warning is the same for every extension that changes how pages look. Overhang reads where boxes sit on the page
and how wide they are, and changes their layout. It doesn't read what's typed into forms and doesn't keep anything it
sees.

You decide where it runs: set All Websites to Ask in Settings › Apps › Safari › Extensions › Overhang and allow only the
sites you want. Everything it does is in [content.js](../Extension/Resources/content.js).
