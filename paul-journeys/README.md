# To the Ends of the Earth — The Journeys of Paul

A third-person, open-area 3D game that runs in the browser and follows the apostle Paul through the book of Acts — from the road to Damascus to the shipwreck on Malta.

No build step, no external assets, no network calls at runtime: everything (terrain, towns, ships, people, weather, sound) is generated in code on top of a vendored copy of three.js.

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

- Every line shown in quotation marks with a reference is a verbatim excerpt of the **World English Bible** (public domain). `npm install && npm run verify` checks all of them against the WEB text.
- Lines in italics without a reference are the game's own narration and only summarise the same passages.
- The player never invents words for biblical figures, and events are not rearranged. Where the game compresses time it says so and quotes the passage it skips.
- Scenery, faces, clothing, weather and the layout of towns are an artist's impression; the Bible does not describe them. Place names on the journey map are approximate.

## Technical notes

- `js/engine.js` — renderer, sky, sun and soft shadows, wind (grass, trees, cloth, sails), rain, lightning, bloom, ocean.
- `js/world.js` — terrain, vegetation, first-century architecture, the merchant ship.
- `js/characters.js` — articulated people and animals, procedurally animated.
- `js/player.js` — input, camera, and movement on foot, swimming, on deck, at the helm and on horseback.
- `js/game.js`, `js/tasks.js`, `js/ui.js`, `js/audio.js` — game loop, scripting API, tasks and rewards, HUD, procedural sound.
- `js/chapters_a.js`, `js/chapters_b.js` — the eight chapters.
- Test hooks: `?ch=N` starts at a chapter; `?auto&speed=8` plays the scripts unattended.
- Graphics quality steps down automatically on slow devices unless the player chooses a setting.

## Licences

- Game code: same licence as this repository.
- three.js (in `vendor/`): MIT, © three.js authors — see `vendor/LICENSE`.
- Scripture: World English Bible, public domain.
