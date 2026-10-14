# Fonts

The site serves its own copies of Sofia Sans and Sofia Sans Extra Condensed (SIL Open Font
License, `src/assets/fonts/OFL.txt`), so no page asks Google for anything.

They were cut from the variable fonts in the google/fonts repository the way Google Fonts
serves them: only the weights the site uses (Extra Condensed 500–900, Sofia Sans 300–750,
italic 400–600), split into Latin, Latin Extended, Cyrillic and Cyrillic Extended, as WOFF2.

To cut them again: get `ofl/sofiasans` and `ofl/sofiasansextracondensed` from
https://github.com/google/fonts, then `python3 scripts/fonts/make_fonts.py <that folder>`.
(`npm run fonts` does the same by downloading from Google Fonts, where that's reachable.)
