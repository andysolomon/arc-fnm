---
status: closed
label: wayfinder:grilling
parent: ../friday-night-manager-product-map.md
resolution: ../../phase-4-5-validation.md
---

# Define trust, uncertainty, and causality

## Question

How should the product expose sample size, confidence, incomplete information, execution variance, and simulation randomness so that users learn from decisions without being taught that every win validates the choice?

## Resolution

There is no clock and no entropy in the match engine; variance is a function of the take-the-field snapshot (`execSeedInputFor` in `src/domain/matchDay.ts`). Every play is tagged with a cause (practiced, thin, unseen, accepted risk). Decision Review refuses to let result points pick the process grade. Sample size and conditions stay on Evidence; missing information stays unknown. Open teaching gaps are recorded in `docs/phase-4-5-validation.md` (LEARN-1..4) and are not treated as solved.
