---
status: closed
label: wayfinder:grilling
parent: ../friday-night-manager-product-map.md
resolution: ../../phase-5-program-workspace.md
---

# Define the shared Decision Model boundary

## Question

Which concepts and behaviors must remain identical between the Simulation Experience and Program Workspace, and which data, permissions, recommendations, and outcomes must remain experience-specific?

## Resolution

Share the Coaching Week loop, Coaching Decision shape, Evidence provenance, Player Availability vs diagnosis, versioned Jurisdiction Rule Set, and process-separated Decision Review. Do not share people, film, grades, medical facts, persistence, or outcomes. Simulation outcomes are a deterministic fold of coach actions; Program Workspace outcomes are real games and must not feed the simulator. Live data requires School Approval and a FERPA school-official contractor Data Context (ADR 0001, ADR 0003). The Convex `weeks` table is not that context.
