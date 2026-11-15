# AI assistance disclosure

The following parts of this repository were developed with the help of an AI assistant (Claude, by Anthropic), working at the request of a project contributor
who directed the work and ran the results:

- `harmonization/` : the MODIS/VIIRS harmonization script, its analysis, S3 helper, documentation notebook and README
- `risk_model_weekly/` : the weekly hotspot-risk model (code, tests, configuration, README and the generated outputs)
- the README section "Harmonized series and weekly risk model" and this file

Every Python file in those folders starts with an "AI-assisted code" header, and the notebook has a note at the top.
AI-written code can contain mistakes: the numbers in the documentation come from running the code on the FIRMS data, but they should be reviewed before reuse.

Other code in the repository (`backend/`, `web/`, `esp32/`, `ml/`, `deploy/`) is not covered by this statement; its authors should add their own disclosure if relevant.
