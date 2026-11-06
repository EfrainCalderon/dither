# Dither

A Pomodoro timer that lives in a tiny halftone aquarium. Finish a focus session, earn a fish.

- **Focus for 25 minutes.** When it ends, click **rest up**: a goldfish or koi drops into the tank and splashes in. Fish reset at midnight.
- **The tank grows with you.** Each session moves it along: moss creeps, carpets fill in, stems reach out of the water, the water slowly evaporates.
- **The sky is real.** It follows the sun and moon where you are. At night the base lights up (click the base to turn it off).
- **Play with it.** Drag to turn the tank, click the fish, and keep an eye out for rare things on the sand.
- **New tank** rolls a fresh layout. Undo is there for 4 seconds.

Everything is drawn as halftone dots: three.js renders the scene into a tiny image, one pixel per dot, and a second pass turns each pixel into a dot.

## Run it

It's one self-contained file: open `index.html` in a browser, or serve the folder as a static site (no build step needed to deploy).

## Change it

The readable source lives in `source/`:

```
cd source
npm install
npm run build      # writes ../index.html
```

Created by [Efrain Calderon](https://www.efrain.design).
