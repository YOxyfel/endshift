# Adding yourself: name, photo, voice note, video

For a product that doesn't exist yet, the person behind it is most of the proof. Everything below is optional, and each piece appears on the site only once you've set it. Nothing shows a placeholder.

All of it lives in one place in `src/config/site.config.js`:

```js
founder: {
  name: 'Ivan',
  photo: 'founder.jpg',
  photoAlt: { en: 'Ivan behind the counter after a closing shift', bg: 'Иван зад щанда след затваряне' },
  line: { en: 'Eight years of closing shifts in retail.', bg: 'Осем години вечерни смени в търговията.' },
  voice: { en: 'voice-en.mp3', bg: 'voice-bg.mp3' },
  video: null,
  transcript: { en: '…', bg: '…' },
  videoUrl: null,
},
```

The files go in `src/assets/founder/`. Run `npm run build` afterwards. If a file named in the config is missing, the build stops and says which one, so a broken photo can never go live.

## Where each piece shows up

| Setting | Where |
| --- | --- |
| `name` | Signs the story on the Story page and the home page strip: "Ivan, founder". Also use it for `{{founder_name}}` in the welcome emails (`docs/EMAILS.md`). |
| `photo` | Story page, next to the signature (4:5, slightly turned like a print on the board). Home page: a small round version before the signature. |
| `line` | Under your name on the Story page. One sentence about your own shifts. |
| `voice` | A "Listen to the founder" button on the Story page. |
| `video` | A video player on the Story page, using the photo as its cover until it plays. |
| `transcript` | "Read it instead" under the voice note or video, for people who can't play sound. Write down what you say. |
| `videoUrl` | Alternative to `video`: a link to the clip on Instagram, TikTok or YouTube. |

## The photo

- **What works:** you, at or after work, in normal light. Not a studio portrait. The site's whole idea is the end of a real shift, so a photo from one (behind the counter, in the car park, at the kitchen pass) is worth more than a good-looking one.
- **Format:** JPEG, portrait 4:5. At least 800 × 1000 px, at most 1200 × 1500. Export at quality 80; aim for under 250 KB.
- **Name:** `founder.jpg` (or anything, as long as the config says the same).
- **Alt text:** describe what's in it in a few words, in both languages (`photoAlt`). It's read out to people using a screen reader.

## The voice note

- **Length:** 30 to 90 seconds. Say who you are, what your evenings after work actually look like, and why you're building this. Same honesty as the story: say what isn't finished.
- **How:** your phone's voice recorder, in a quiet room, phone 20 cm from your mouth. One take is fine; a slightly imperfect recording sounds more real than a polished one.
- **Format:** MP3 or M4A (AAC), mono, 64–96 kbps. That's about 0.5–1 MB per minute. Most phones' "share as audio file" gives you M4A, which works everywhere.
- **Two languages:** record one in English and one in Bulgarian if you can, and set `voice: { en: 'voice-en.mp3', bg: 'voice-bg.mp3' }`. With one file, set `voice: 'voice.mp3'` and both pages use it.
- **Transcript:** write it into `transcript` in both languages.

## The video

- **Length:** under 60 seconds, filmed upright (9:16) on a phone.
- **Format:** MP4 (H.264 + AAC), 720 × 1280, under 10 MB. HandBrake's "Fast 720p30" preset does this, or your phone's "smaller file" export.
- **Captions:** most people watch with the sound off. Burn subtitles into the video (CapCut, InShot, or the phone's own editor all do it), and fill in `transcript`.
- If the video already lives on Instagram or TikTok, set `videoUrl` instead and skip the file.

## Checking it

`npm run build`, then `npm run serve` and open `/story/` and `/bg/story/`. Look at it on a phone too: the photo sits above the text there.

Or send the files to Claude with the text for each field, and it'll do the rest.
