# Container Substrate Start Charge Generated Report

## Kurzfazit

Es gibt jetzt zwei echte Container-PNGs aus der Start-Charge: `container_nursery_pot_seedling_v001` als brauchbare, aber formkritische Nursery-Variante und `container_plastic_round_3l_v001` als saubere runde Standard-Topfform. Der gezielte Korrekturversuch fuer `container_nursery_pot_seedling_v002` blieb technisch rate-limited, aber der naechste Einzelversuch fuer den 3l-Rundtopf war erfolgreich.

Gesamtstatus: `single_render_available_with_intermittent_rate_limits`

## Geplante 8 Assets

- `container_nursery_pot_seedling_v001`
- `container_plastic_round_3l_v001`
- `container_plastic_round_7l_v001`
- `container_fabric_pot_15l_v001`
- `substrate_lightmix_soil_moist_v001`
- `substrate_lightmix_soil_dry_v001`
- `substrate_coco_perlite_moist_v001`
- `substrate_coco_perlite_dry_v001`

## Zielpfade

- `assets/containers/start_charge/container_nursery_pot_seedling_v001.png`
- `assets/containers/start_charge/container_plastic_round_3l_v001.png`
- `assets/containers/start_charge/container_plastic_round_7l_v001.png`
- `assets/containers/start_charge/container_fabric_pot_15l_v001.png`
- `assets/substrates/start_charge/substrate_lightmix_soil_moist_v001.png`
- `assets/substrates/start_charge/substrate_lightmix_soil_dry_v001.png`
- `assets/substrates/start_charge/substrate_coco_perlite_moist_v001.png`
- `assets/substrates/start_charge/substrate_coco_perlite_dry_v001.png`

## Erfolgreich erzeugte Assets

- `container_nursery_pot_seedling_v001`
- `container_plastic_round_3l_v001`

## Zusätzlicher v002-Korrekturversuch

- Zielasset: `assets/containers/start_charge/container_nursery_pot_seedling_v002.png`
- Ergebnis: `not_generated_rate_limited`
- Grund: gezielter Einzel-Render fuer die rundere Nursery-Topfform direkt mit `TooManyRequests` blockiert

## Wegen Rate-Limit nicht erzeugte Assets

- `container_plastic_round_3l_v001`
- `container_plastic_round_7l_v001`
- `container_fabric_pot_15l_v001`
- `substrate_lightmix_soil_moist_v001`
- `substrate_lightmix_soil_dry_v001`
- `substrate_coco_perlite_moist_v001`
- `substrate_coco_perlite_dry_v001`

## QA-Status pro Asset

- `container_nursery_pot_seedling_v001`: `needs_review` - echte PNG erzeugt; transparent, keine Fremdelemente, gute Oeffnung, aber Form wirkt eher quadratisch als klar rund/nursery-typisch
- `container_nursery_pot_seedling_v002`: `not_generated_rate_limited` - Korrekturversuch fuer rundere Nursery-Form technisch blockiert
- `container_plastic_round_3l_v001`: `pass` - echte PNG erzeugt; klar runde Form, transparente Freistellung, keine Pflanze, keine Erde, stabile Oeffnung und guter Anchor fuer spaeteres Substrat-/Pflanzen-Layer
- `container_plastic_round_7l_v001`: `not_generated_rate_limited` - in dieser Phase bewusst nicht versucht
- `container_fabric_pot_15l_v001`: `not_generated_rate_limited` - in dieser Phase bewusst nicht versucht
- `substrate_lightmix_soil_moist_v001`: `not_generated_rate_limited` - in dieser Phase bewusst nicht versucht
- `substrate_lightmix_soil_dry_v001`: `not_generated_rate_limited` - in dieser Phase bewusst nicht versucht
- `substrate_coco_perlite_moist_v001`: `not_generated_rate_limited` - in dieser Phase bewusst nicht versucht
- `substrate_coco_perlite_dry_v001`: `not_generated_rate_limited` - in dieser Phase bewusst nicht versucht

## Anchor / Canvas / Layering

- Zielvorgabe bleibt `2048x2048` transparent pro Asset.
- Container muessen spaeter eine klar lesbare offene Rim-/Substratoeffnung haben.
- Substratlayer muessen ohne Topfwand funktionieren und auf denselben Center-/Rim-Anker passen.
- `container_nursery_pot_seedling_v001` hat eine brauchbare offene Rim-Form und genug Innenraum fuer ein spaeteres Substrat-Layer.
- Der Anchor wirkt fuer einen kleinen Startertopf plausibel, sollte aber spaeter im Mockup gegen Pflanzen-Socket und Medium-Fit gegengeprueft werden.
- `container_plastic_round_3l_v001` hat eine klarere runde Oeffnung und eine stabilere, neutralere Serienform; es eignet sich gut als Referenz fuer die weiteren Standard-Container.

## Kombinationsmockups

- `container_nursery_pot_seedling_v001` ist direkt fuer erste Kombinationsmockups geeignet, aber noch mit manueller Formpruefung.
- `container_plastic_round_3l_v001` ist direkt fuer Kombinationsmockups geeignet.

## Vergleich v001 vs. v002

- `v001`: vorhanden, layerfaehig, aber formal zu eckig fuer einen klaren runden Nursery-Pot
- `v002`: in diesem Run nicht erzeugt, daher kein visueller Direktvergleich moeglich

## Risiken

- Die Bildgenerierung bleibt instabil: ein Einzelrender war erfolgreich, der naechste Einzelrender wieder rate-limited.
- Die aktuelle Topfform ist brauchbar, aber nicht perfekt passend zur Bezeichnung `round` bzw. `nursery`.
- Der 3l-Rundtopf wirkt als Formbasis deutlich stabiler als der Nursery-Testtopf.
- Ohne weitere Einzelerzeugungen bleibt die Familienkonsistenz der kompletten 8er-Charge offen.

## Naechste empfohlene Phase

Als naechstes weiter streng einzeln rendern. Sinnvollster naechster Kandidat ist `container_plastic_round_7l_v001`, weil er direkt an die jetzt saubere 3l-Rundtopf-Form anschliesst.
