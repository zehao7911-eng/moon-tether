# Moon Tether

A complete English HTML5 lunar salvage game. Swipe across a cable or use its cutter button. A released capsule keeps the pendulum's motion. Watch its dotted landing prediction and cut when the receiver glows mint. On a double tether, your first cut chooses the swing. A missed capsule uses a spare and reloads that pickup. Slow motion is always available.

Recover every capsule in eight sectors across three sites. Earn medals for completion, no missed capsules and clean catches. Seven stars unlock Jade; the sector chart allows replay. The separately unlocked Copper and Rose finishes are optional GameWave rewards.

Open the root index.html or standalone.html offline. No CDN or account is required. The module entry index-source.html is available when served over HTTP. WebGL renders the original 3D station, with a playable canvas fallback if it cannot initialize. Node commands: node build.cjs, node tests.mjs.

The physics uses a pendulum for a single tether, a fixed pose for a double tether, and analytic gravity after release. A moving receiver's predicted future position is used by the same hit rule as the actual catch. This is an arcade recovery game.

Visual direction: model-scale scenery and layered industrial materials. Rezona's Paper Armada was inspected in its playable campaign for readable trajectories and impact feedback. Moon Tether uses original cable mechanics, artwork, models, code and synthesized sound. Three.js is bundled under the MIT license in vendor.

GameWave uses its injected neonlib independently of standalone startup. The first accepted cut starts a host round. The final catch, exhausted spares, or explicit sector abandonment ends it. A restored between-capsule save waits for a new cut. A saved in-flight capsule waits for Resume. Saves are scoped to moon-tether-v1. Confirmed positive likes unlock Copper and confirmed direct comments unlock Rose once per saved profile. Unsupported listeners stay hidden. Mock verification does not establish behavior inside the real GameWave app.
