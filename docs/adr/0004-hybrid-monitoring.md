# Players monitor their own instruments; the game plays the backing

Each player hears their instrument through their own chain (the TD-17's headphone or amp output, a guitar or bass amp or amp sim, or the Scarlett's direct monitoring), and the game plays only the backing track and click. Routing every instrument through the game would add round-trip latency and contend for the audio interface, and that buys nothing when strings are unjudged.

## Consequences

- The game's own latency budget is output only (backing track and visuals), calibrated with YARG's existing audio and video calibration.
- Taking direct input for takes must not block an amp sim from using the same interface; whether the Scarlett's ASIO driver allows two clients is unverified and must be tested before takes are built.
- Software monitoring through the game stays possible later as an option, not a requirement.
