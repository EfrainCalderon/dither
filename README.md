# Dither

A Pomodoro timer that lives in a tiny halftone aquarium. Finish a focus session, earn a fish.

- **Focus for 25 minutes.** When it ends, click **rest up**: a koi drops in from the sky and dives into the tank, and the camera rides along in close-up before easing back out. Fish reset at midnight.
- **The tank grows with you.** Each session moves it along: moss creeps, carpets fill in, stems reach out of the water, the water slowly evaporates.
- **The sky is real.** It follows the sun and moon where you are. At night the base lights up (click the base to turn it off).
- **The koi feel alive.** Their bodies bend as they swim, long fins trail and ripple, eyes look around and blink, gills and mouths move as they breathe, and some have puffy cheeks. Every so often they play: a chase, circling each other, follow the leader, coming up to the surface, nibbling the bottom, nose to nose.
- **Play with it.** Drag to turn the tank and keep an eye out for rare things on the sand. Click a koi and it jumps while the camera follows it up close; click anywhere else, press Esc, zoom out, or tap **whole tank** to come back. You can also scroll or pinch to zoom right in.
- **New tank** rolls a fresh layout. Undo is there for 3 seconds.
- **Music** loops under focus and rest, fading in and out with the timer. Volume and mute sit bottom right. If you come back to a session and the music is waiting (browsers need a tap before sound can play), a play button shows next to the volume.
- **Keeps your screen on** while a session runs, so a phone propped on your desk doesn't dim and lock mid-focus. Paused or idle, it sleeps as usual.
- **Works in the background.** Switch to another tab and the timer keeps going: the bell rings and the music fades out right on time. Open it in two tabs and they stay in step, so a session only counts once.
- **Call it a day** appears when a focus session ends, next to "rest up". It drops a giant brain into the tank and leaves just the title, so you can explore with no timer asking for anything. Click the title to bring back "start focus". It never shows during focus.

Everything is drawn as halftone dots: three.js renders the scene into a tiny image, one pixel per dot, and a second pass turns each pixel into a dot.

## Run it

It's one self-contained file: open `index.html` in a browser, or serve the folder as a static site (no build step needed to deploy).

## Change it

The readable source lives in `source/`:

```
cd source
npm install
npm run build      # writes ../index.html
npm run lab        # writes ../../dither-fish-lab.html: the app plus a fish tuning panel (not deployed)
```

## Music

- Focus: "Lofi Loop" — Music by [Marek Zielinski](https://pixabay.com/users/zephiramusic-54643547/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=589689) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=589689)
- Rest: "Lofi Relaxing" — Music by [Marek Zielinski](https://pixabay.com/users/zephiramusic-54643547/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=582284) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=582284)

Pixabay license certificates are in `audio/licenses/`.

Created by [Efrain Calderon](https://www.efrain.design).
