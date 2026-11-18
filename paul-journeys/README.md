# To the Ends of the Earth — The Journeys of Paul

A third-person, open-area 3D game that runs in the browser and follows the apostle Paul through the book of Acts — from the road to Damascus to the shipwreck on Malta.

No build step and no network calls at runtime. Paul is a realistic, motion-captured character from the open-source Microsoft Rocketbox library (`assets/paul.glb`); everything else (terrain, towns, ships, the other people, weather, sound) is generated in code on top of a vendored copy of three.js.

## Languages

The game is playable in **English** and **Spanish (Español)**. Pick the language with the toggle at the top of the title screen (it can also be changed from the pause menu, and the browser's language is used the first time). `?lang=es` or `?lang=en` forces one.

- English Scripture: World English Bible (public domain). Spanish Scripture: **Reina-Valera (1909)** (public domain), so quotations read in the older, formal Spanish of that translation.
- Spanish lines are never translated by the game: every quotation is taken from the Reina-Valera text by reference (`js/i18n/es-scripture.js`, with excerpts for part-verse quotations in `js/i18n/es-quotes.js`). The two Bibles are different translations of different manuscript traditions, so a few verses differ in content, not just wording (for example Acts 9:5-6 in the Reina-Valera includes the sentence about kicking against the goads).
- The interface, narration, objectives and names are in `js/i18n/es.js`, keyed by the English text; the Spanish is the author's own translation and should be reviewed by a native speaker before wide release.
- To check completeness, open the game with `?lang=es&auto&speed=12` and read `__i18n.miss` in the console when it finishes: it lists any text that has no Spanish yet.

## Play

```bash
npm start            # serves this folder on http://localhost:8080
```

Any static web server works (GitHub Pages, Netlify, S3, nginx …) — just publish this folder. Opening `index.html` straight from disk will not work because browsers block ES modules on `file://`.

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | `W A S D` or arrows | left thumb |
| Look | mouse (click the scene to capture the pointer) | right thumb |
| Run / gallop | `Shift` | push the stick fully |
| Jump / continue dialogue | `Space` | ⤒ button / tap the text |
| Act, speak, greet | `E` | E button |
| Journal and rewards | `J` | ✎ button |
| Pause | `Esc` | II button |

## Chapters

| | Chapter | Scripture | What you do |
| --- | --- | --- | --- |
| I | The Road to Damascus | Acts 9:1-25 | Walk the road at noon, are struck blind by the light, are led by the hand into the city, receive your sight from Ananias |
| II | Sent Out to Cyprus | Acts 13:1-12 | Sail from Seleucia to Salamis, cross the island to Paphos, confront Elymas before the proconsul |
| III | The Gods of Lystra | Acts 14:8-20 | Heal the lame man, stop the sacrifice at the gates, are stoned, rise and re-enter the city |
| IV | Midnight in Philippi | Acts 16:9-34 | Meet Lydia at the riverside, free the slave girl, sing in the stocks, the earthquake and the jailer |
| V | The Unknown God | Acts 17:16-34 | Walk the idols of the Athenian marketplace and speak on the Areopagus |
| VI | Great is Artemis | Acts 19:23-41 | The silversmiths' riot and the theatre of Ephesus |
| VII | By Night to Antipatris | Acts 21:27 – 23:35 | Speak from the barracks stairs, then ride with the escort through a storm |
| VIII | Shipwreck | Acts 27:1 – 28:10 | The fourteen-night storm, the wreck, the swim ashore, the fire and the viper on Malta |

## Tasks and rewards

Besides the story objective, every chapter has optional tasks shown under **Along the way**:

- **Letters** — glowing scrolls, each a passage from one of Paul's epistles, kept in the journal.
- **Fellowship** — greet the people you meet (`E`); Paul answers with one of his own greetings or blessings.
- **Discovery** — find landmarks, and do deeds such as working at the tentmaker's bench in Ephesus and giving the earnings away (Acts 20:34-35), or catching the fair wind to Cyprus.

Each completed category earns a **crown** (1 Corinthians 9:25). Everything earns points toward a **rank** (Traveller → Witness → Herald → Ambassador → Finisher of the Course), and ranks unlock new **mantles** for Paul to wear. Progress is saved in the browser.

## Faithfulness to the text

- Every line shown in quotation marks with a reference is a verbatim excerpt of the **World English Bible** (public domain). `npm install && npm run verify` checks all of them against the WEB text, and checks every Spanish excerpt against the Reina-Valera (1909).
- Lines in italics without a reference are the game's own narration and only summarise the same passages.
- The player never invents words for biblical figures, and events are not rearranged. Where the game compresses time it says so and quotes the passage it skips.
- Scenery, faces, clothing, weather and the layout of towns are an artist's impression; the Bible does not describe them. Place names on the journey map are approximate.

## Technical notes

- `js/engine.js` — renderer, sky, sun and soft shadows, wind (grass, trees, cloth, sails), rain, lightning, bloom, ocean.
- `js/world.js` — terrain, vegetation, first-century architecture, the merchant ship.
- `js/hero.js` — Paul: a realistic motion-captured character (Microsoft Rocketbox, MIT — see `assets/CREDITS.md`), with story poses layered on the real skeleton; falls back to the built-in figure if the model cannot load.
- `js/characters.js` — the other people and the animals, procedurally animated.
- `js/player.js` — input, camera, and movement on foot, swimming, on deck, at the helm and on horseback.
- `js/game.js`, `js/tasks.js`, `js/ui.js`, `js/audio.js` — game loop, scripting API, tasks and rewards, HUD, procedural sound.
- `js/chapters_a.js`, `js/chapters_b.js` — the eight chapters.
- `js/i18n.js`, `js/i18n/` — language support (see Languages).
- Test hooks: `?ch=N` starts at a chapter; `?auto&speed=8` plays the scripts unattended.
- Graphics quality steps down automatically on slow devices unless the player chooses a setting.

## Licences

- Game code: same licence as this repository.
- three.js (in `vendor/`): MIT, © three.js authors — see `vendor/LICENSE`.
- Paul's model and animations: Microsoft Rocketbox Avatar Library, MIT, © 2020 Microsoft — see `assets/CREDITS.md`.
- Scripture: World English Bible and Reina-Valera (1909), both public domain. The Spanish verses come from the Scrollmapper open Bible databases (`SpaRV.json`); regenerate them with `node tools/build-es-scripture.mjs <SpaRV.json>`.
