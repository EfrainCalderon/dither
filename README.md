# Dither

A Pomodoro timer that lives in a tiny halftone aquarium. Finish a focus session, earn a fish.

- **The Pomodoro round.** Tabs above the timer switch between **Focus** (25:00), **Short rest** (5:00) and **Long rest** (15:00). Dither follows the classic round on its own: focus and a short rest three times, then a fourth focus and a long rest. The current tab sits on a soft pill, and the three are the same width so the middle one lines up with the digits. **Pause** sits under a running timer, with a skip icon beside it that moves on to the next session. While paused, the digits fade back and a pause mark is drawn right over them in the same dots and outline; **Start** picks it back up.
- **Every focus earns something.** Start your short rest and a koi drops in from the sky and dives into the tank, with the camera riding along in close-up until you tap away, press Esc, or zoom out. Finish the fourth focus and starting the long rest drops in a **special find** instead. Fish and finds reset at midnight.
- **Special finds** come in tiers. Common: rubber duck, paper boat, Sharpie, green glow stick. Uncommon: first-gen iPod, inhaler, treasure chest, deep-sea diver. Rare: submarine, sunken ship, the Magician tarot card. Rarest: the red glow stick. Every one does something when you click it: the duck squeaks, the Sharpie's cap pops off, the sub makes a lap of the tank, the glow sticks flare and light up everything around them, and so on.
- **Each new tank may come with a find of its own:** a bright coral (click it and it spawns), a moss ball (it floats up to the surface and back) or a sand dollar (it flips like a coin).
- **The tank grows with you.** Each session moves it along: moss creeps, carpets fill in, stems reach out of the water, the water slowly evaporates. During focus it makes six slow turns.
- **The sky is real.** It follows the sun and moon where you are. At night the base lights up (click the base to turn it off).
- **The koi feel alive.** Their bodies bend as they swim, long fins trail and ripple, eyes look around and blink, gills and mouths move as they breathe, and some have puffy cheeks. Every so often they play: a chase, circling each other, follow the leader, coming up to the surface, nibbling the bottom, nose to nose.
- **Play with it.** Drag sideways to turn the tank, or up and down to look higher or lower (there's more room to look around when you're zoomed in). Click a koi and it jumps (an arc, a belly flop or a stone skip) while the camera follows it up close; click anywhere else, press Esc, or zoom out to come back. You can also scroll or pinch to zoom right in.
- **A brain says hello.** On the title screen a giant brain splashes into the tank. It floats there until you start your first focus.
- **Controls stay put.** About and **New tank** sit bottom left, sound bottom right (a slider on desktop). They fade back while a focus session runs and come forward when you move. New tank has a 3-second undo.
- **Music** loops under focus and rest, fading in and out with the timer. An 8-bit level-up chime rings when a session ends. If you come back to a session and the music is waiting (browsers need a tap before sound can play), a play button shows next to the volume.
- **Keeps your screen on** while a session runs, so a phone propped on your desk doesn't dim and lock mid-focus. Paused or idle, it sleeps as usual.
- **Works in the background.** Switch to another tab and the timer keeps going: the bell rings and the music fades out right on time. Open it in two tabs and they stay in step, so a session only counts once.
- **About** has the credits and a **Buy me a coffee** button that opens a tip window right in the page.

Everything is drawn as halftone dots: three.js renders the scene into a tiny image, one pixel per dot, and a second pass turns each pixel into a dot.

The type is a pixel font, Jersey 25, built into the page so it shows right away on any device (no font server to wait on), and nothing is smaller than 20px. Buttons are solid boxes with stepped 8-bit corners, and they flip between dark and light with the sky behind them, so their words always pass WCAG contrast. The About, New tank and sound icons are solid ones from [Phosphor](https://phosphoricons.com) (MIT license).

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

- Chime: "Level Up Enhancement" — Sound Effect by [Lesiakower](https://pixabay.com/users/lesiakower-25701529/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=153002) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=153002)

Pixabay license certificates for the music are in `audio/licenses/`.

## Type

[Jersey 25](https://fonts.google.com/specimen/Jersey+25) by Sarah Cadigan-Fried, under the SIL Open Font License.

Created by [Efrain Calderon](https://www.efrain.design).
