# High-school football coaching decisions that software can support

**Research date:** 2026-07-31  
**Product context:** A Football Manager-inspired management simulation for U.S. high-school football head coaches  
**Question:** Which coaching and athletic-program decisions merit software support if the goal is to help coaches make better decisions and win games?

## Executive finding

The strongest product opportunity is not a generic “football simulator.” It is a **weekly decision system** that connects opponent evidence, a coach's game model, practice allocation, player availability, and game-day choices. The evidence supports six real workflows: film/scouting, practice design, player development and availability, health-and-safety process, jurisdiction-specific compliance, and game-state decisions. The proposed features below are product inferences from those workflows; governing bodies and studies generally do not test software products directly.

A credible product should make the head coach feel like the operator of an athletic department while preserving the Friday-night emotional fantasy. Its core decision loop should be:

> review evidence → form a hypothesis → allocate scarce practice reps → certify who can participate → prepare decisions in advance → execute → learn from outcomes

## Evidence and product implications

### 1. Game planning and film

#### What primary sources establish

- Film exchange is a formal competitive workflow, not an optional convenience. Texas UIL's current football film policy requires tight and wide views for every play, defines the evaluation purpose of each angle, and requires footage from pre-snap through the whistle. It explicitly calls out formations, shifts, motions, stemming, hard counts, protections, mesh, spacing, and line play as information the recording must preserve. UIL also permits mutually agreed structured breakdown data including down, distance, hash, and yard line. ([UIL Football Game Film Exchange Policy](https://www.uiltexas.org/football/page/uil-football-game-film-exchange-policy))
- UIL playoff teams must exchange the required game videos on a deadline, while use of video/data technology during a contest is restricted to approved locations in Texas. ([UIL Constitution and Contest Rules, football](https://www.uiltexas.org/policy/constitution/athletics/football); [UIL Football Manual, regular season](https://www.uiltexas.org/football/manual/football-manual-regular-season))
- NFHS's football statistics curriculum covers rushing and passing, first downs, kicks and returns, fumbles, tackles and sacks, penalties, touchdowns, total offense, and all-purpose yardage. That establishes a common post-play record beyond the final score. ([NFHS announcement and course description](https://nfhs.org/stories/nfhs-learning-center-publishes-courses-for-football-statistics-volleyball-statistics-the-female-and-male-athlete-triad))

#### Product inference

The product should treat each play as linked **video + context + coaching judgment**, not as video alone. A useful scouting workspace would support:

- synchronized tight/wide clips with capture-quality checks;
- down, distance, hash, yard line, score/time, personnel, formation, motion, concept, pressure/coverage, result, and coach-confidence tags;
- tendency queries conditioned on situation rather than unqualified averages;
- clips behind every generated claim so a coach can challenge the analysis;
- an opponent-plan board containing hypotheses, evidence for and against, planned answers, and the practice periods that install those answers;
- post-game review that distinguishes a poor decision from poor execution and a good decision with a bad outcome.

The simulation should reward signal quality and correct diagnosis, not merely completion of “watch film” tasks. Missing angles, small samples, inconsistent tags, and opponent self-scout counters should create uncertainty.

### 2. Practice planning and allocation

#### What primary sources establish

- Practice is constrained by acclimatization, equipment, duration, rest, and contact rules. NFHS guidance recommends beginning with shorter, less intense practices, longer recovery intervals, progressive protective equipment, and emphasis on instruction during early practices. ([NFHS heat-acclimatization position statement](https://assets.nfhs.org/umbraco/media/5919613/nfhs-heat-acclimatization-april-2022-final.pdf))
- USA Football's practice framework distinguishes levels of contact and recommends controlling full-contact frequency and duration, avoiding consecutive contact days, and removing high-risk drills. ([USA Football Practice Guidelines](https://usafootball.com/coaches-organizations/practice-guidelines))
- USA Football's published sample plan time-boxes warm-up, athletic foundations, hydration, position-specific offense and defense, team scheme, contact preparation, and coaching points. This documents the granularity of an existing planning workflow; it does not prove that this particular template improves performance. ([USA Football sample practice plan](https://fdm.usafootball.com/docs/default-source/league-resources/fdm-20---practice-plan-sample.pdf?sfvrsn=40dd01e0_4))
- A current state example shows why plans must validate at the athlete level: UIL limits each football player to 90 minutes of full-contact practice per week during preseason, regular season, and postseason, in addition to practice-duration, recovery, and acclimatization rules. ([UIL Constitution and Contest Rules, Section 1250](https://wwwprod.uiltexas.org/policy/constitution/athletics/football))
- State rules can add precise constraints. UIL requires recovery time between multiple practices and limits the duration of a film/review session that remains part of one practice. ([UIL Preseason Football Practice Limitations FAQ](https://www.uiltexas.org/football/page/preseason-football-practice-limitations-FAQ))
- An observational study of 24 high-school players across a season found cumulative head-impact frequency and magnitude increased broadly with drill contact intensity; live drills produced the highest cumulative exposure, while high-magnitude impacts occurred more often in live and thud drills. This is a small, single-program study and measures exposure, not an individual medical threshold. ([Kuo et al., *Journal of Applied Biomechanics*, full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7428124/))
- Another study of 42 varsity players estimated that replacing contact practices with non-contact practices would reduce recorded seasonal impacts, with different exposure patterns by position. It did not establish the effect on long-term health or the minimum contact needed for performance. ([Broglio et al., *American Journal of Sports Medicine*, full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC4351256/))
- In an intervention study with 70 high-school players, a functional assessment was used to select targeted pre-practice technique drills, demonstrating the feasibility of connecting evaluation to practice intervention. ([Duma et al., *Medicine & Science in Sports & Exercise*, full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7028524/))

#### Product inference

Practice planning is a constrained allocation problem. The software should let coaches build periods from objectives, drills, position groups, expected reps, contact level, equipment, duration, and responsible assistant. It should then show:

- which game-plan answers have received enough quality reps;
- which players and units are overloaded, under-repped, or missing prerequisite technique work;
- contact minutes/days by player, group, and team, without pretending that minutes equal a medical diagnosis;
- automatic conflicts with the selected state association's current restrictions;
- plan-versus-actual notes so coaches can learn which practice designs transferred to Friday.

The key gameplay trade-off is meaningful: limited time can go to fundamentals, opponent-specific installation, situational football, special teams, recovery, or player development. More physical work must not be modeled as an automatic path to better execution.

### 3. Roster, eligibility, availability, and player development

#### What primary sources establish

- High-school roster availability is not simply a talent/depth-chart judgment. Georgia GHSA, for example, requires certification based on academics, age, semesters, residence, and transfer rules; requires a current physical before tryouts, practice, workouts, or games; and limits a football player's combined varsity/sub-varsity participation to six quarters per week. ([GHSA By-Law 1.00](https://www.ghsa.net/constitution-section-2025-2026-law-100-student))
- UIL likewise requires comprehensive football eligibility forms signed by an administrator and coach before varsity participation and has additional transfer documentation. ([UIL Football Manual, pre-season regulations](https://www.uiltexas.org/football/page/football-manual-pre-season-regulations))
- NFHS's football coaching curriculum is position-specific across offense, defense, and special teams and emphasizes teaching, feedback, participation, and stress reduction. ([NFHS Football Courses](https://www.nfhs.org/sports/football/courses); [NFHS Coaching Football course outline](https://assets.nfhs.org/umbraco/media/1015441/coaching-football.pdf))

#### Product inference

“Can play,” “should play,” and “will develop if given reps” must be separate concepts. The roster workspace should combine:

- eligibility and required-document status;
- medically controlled participation status, visible only at the appropriate level;
- depth charts by position and package, including special teams;
- position-skill evaluations, playbook/assignment mastery, coach confidence, and developmental goals;
- practice and game reps by role;
- academic/support check-ins and non-punitive alerts;
- succession planning across varsity, junior varsity, and younger cohorts.

The simulation should create authentic choices around a high-upside but inexperienced player, a two-way starter's rep load, special-teams opportunity cost, and developing next year's roster without turning minors into tradable assets. Player ratings should be uncertain, contextual, and revisable.

### 4. Health, contact exposure, environment, and emergency readiness

#### What primary sources establish

- CDC directs coaches to remove an athlete immediately when concussion is suspected, keep the athlete out the same day and until cleared, and leave return-to-sport decisions to a healthcare provider. ([CDC HEADS UP: Responding to a Sports-related Concussion](https://www.cdc.gov/heads-up/response/index.html))
- CDC's coach guidance asks coaches to record injury circumstances and observed signs for healthcare personnel and parents. It does not authorize a coach to diagnose or clear the athlete. ([CDC HEADS UP fact sheet for high-school coaches](https://www.cdc.gov/heads-up/media/pdfs/custom/headsupconcussion_fact_sheet_coaches.pdf))
- NFHS recommends venue-specific emergency action plans, rehearsal, defined responsibilities, accessible communication and emergency equipment, and coordination with medical professionals and local responders. Its guidance also points to wet-bulb globe temperature monitoring for practice/event modification. ([NFHS Emergency Action Plan position statement](https://assets.nfhs.org/umbraco/media/7213372/nfhs-smac-emergency-action-plans-eap-position-statement-final-10-7-24.pdf))
- The NFHS sports-medicine index is versioned and includes current guidance on football contact drills, heat illness, hydration, lightning, air quality, and emergency action plans. ([NFHS Sports Medicine Position Statements and Guidelines](https://www.nfhs.org/resources/sports/nfhs-sports-medicine-position-statements-and-guidelines))
- A six-year observational study at 13 Florida high schools found exertional heat-illness risk was highest early in preseason and rose materially above 82°F wet-bulb globe temperature. A separate Georgia policy evaluation found lower heat-syncope/heat-exhaustion rates after mandatory acclimatization and activity-modification rules. These population findings support environmental and acclimatization tracking; they do not predict an individual athlete's condition. ([Cooper et al., PubMed record](https://pubmed.ncbi.nlm.nih.gov/34568503/); [Cooper et al., *Journal of Athletic Training*, full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7384466/))

#### Product inference and safety boundary

Software can support **process and communication**, not medical judgment. It should provide availability states, incident time/context capture, documented restrictions, clearance provenance, environmental readings, EAP checklists, and role-based notifications. A coach-facing view should default to the minimum information needed to follow restrictions.

It should never infer concussion severity, recommend that a symptomatic athlete play, convert sensor readings into medical clearance, or let a coach override a healthcare restriction. “Workload” should mean observable practice/game exposure and recovery inputs, with clear uncertainty—not a proprietary readiness score presented as clinical truth.

### 5. Rules, compliance, and athletic-department operations

#### What primary sources establish

- There is no single static national rules profile. NFHS maintains national high-school football rules, but state associations adopt, amend, and administer competition rules. Texas UIL publishes NCAA-rule exceptions and its own practice, technology, filming, eligibility, and contest policies. ([NFHS Football Rules](https://www.nfhs.org/sports/football/rules); [UIL Football Rules & Guidelines](https://www.uiltexas.org/football/rules-guidelines))
- Consequences can be material. GHSA lists fines and possible forfeiture for eligibility, physical-exam, participation-limit, illegal-practice, video, and institutional-control violations. ([GHSA fines structure](https://www.ghsa.net/constitution-section-2025-2026-appendix-p-fines-structure-rules-violations))
- Rules change over time. NFHS's 2026 football page identifies new equipment rules and annual points of emphasis, while its 2025 revisions changed permitted electronic signaling yet continued to prohibit player-worn audio/video devices. ([NFHS Football Rules](https://www.nfhs.org/sports/football/rules); [NFHS 2025 rules revisions](https://www.nfhs.org/stories/player-equipment-changes-highlight-2025-high-school-football-rules-revisions))

#### Product inference

Compliance must be an explicit, versioned domain layer keyed by state association, season, level, and competition. The product should show the rule source and effective date behind every warning, maintain an audit trail, and distinguish a hard prohibition from guidance or local policy. “NFHS mode” alone is insufficient for a product claiming operational reliability.

The management-sim layer can make these constraints legible and interesting: practice calendars, staff credential deadlines, eligibility reviews, equipment certification, film-exchange deadlines, game administration, weather contingencies, ejections, and player participation limits all affect the coach's available choices.

### 6. Game-day decision-making

#### What primary sources establish

- Game state has rules-specific timing consequences. NFHS uses a 40-second play clock in many dead-ball situations and a 25-second clock after specified administrative stoppages; the play clock also operates during overtime. ([NFHS play-clock change explanation](https://nfhs.org/stories/40-second-play-clock-postseason-instant-replay-among-football-changes); [NFHS instructions for game and play-clock operators](https://assets.nfhs.org/umbraco/media/4016214/2025-nfhs-general-instructions-for-football-game-and-play-clock-operators-final-3-10-25.pdf))
- In-game technology permissions differ by jurisdiction. Texas UIL's published regular-season manual allows video/data technology only in the coaching booth and locker room, not the sideline or field team area. ([UIL Football Manual, regular season](https://www.uiltexas.org/football/manual/football-manual-regular-season))
- Fourth-down models show how football decisions can be formulated around field position, distance, outcome probabilities, and future states. However, the widely cited primary research uses NFL data; its numerical recommendations should not be transferred directly to high-school teams with different rules, kicking ability, roster depth, and data volume. ([Romer, NBER Working Paper 9024](https://www.nber.org/papers/w9024))

#### Product inference

The game-day layer should support precomputed, coach-owned decision policies rather than demand complex live data entry. At minimum it should help prepare and rehearse:

- fourth-down go/punt/field-goal thresholds;
- point-after-touchdown choices;
- clock and timeout plans;
- end-of-half, backed-up, red-zone, four-minute, two-minute, and overtime packages;
- substitution/depth contingencies and special-teams decisions;
- opponent adjustments tied to observed evidence.

Recommendations should show assumptions and ranges. A high-school-specific model needs local team data (conversion ability, snap/punt/field-goal reliability, explosive-play and turnover rates), opponent strength, game state, and uncertainty. Where live devices are restricted, the product's value should come through printable/legal decision cards, booth workflows, halftime review, and rehearsal.

## Recommended product priorities

### First playable decision system

1. **Film-to-plan loop:** import or represent a game, tag plays, surface conditional tendencies, save evidence-backed opponent hypotheses, and convert those hypotheses into a call sheet and practice objectives.
2. **Practice allocator:** period plan, reps, contact level, install coverage, plan-versus-actual, and jurisdiction-aware validation.
3. **Roster availability and development:** eligibility status, position/package depth charts, mastery, reps, goals, and clear separation of coach and medical authority.
4. **Friday decision room:** situational rehearsal plus explainable decision cards for fourth down, clock, conversions, and contingencies.
5. **Post-game learning:** grade the information and decision separately from execution and outcome.

### Product principles

- **Evidence before recommendation:** every tendency links to sample size and plays.
- **Decisions before dashboards:** a screen should answer what choice is pending, why, and what changes it.
- **Uncertainty is a feature:** distinguish known facts, staff judgment, model estimates, and missing information.
- **Jurisdiction is configuration:** state/season rules shape every calendar, availability, technology, and game workflow.
- **Safety is a hard constraint:** medical restrictions and emergency processes are not morale or performance modifiers.
- **Small-program reality:** support one coach wearing several hats, two-way players, limited staff, imperfect film, and uneven data.
- **The sim should teach transfer:** the user should be able to explain why a decision was good and apply that reasoning outside the game.

## Suggested domain objects

The evidence implies a domain centered on decisions rather than screens:

- `Program`, `Season`, `JurisdictionRuleSet`, `Competition`
- `Coach`, `StaffRole`, `Player`, `EligibilityStatus`, `ParticipationRestriction`, `AvailabilityStatus`
- `PositionRole`, `DepthChart`, `SkillAssessment`, `DevelopmentGoal`, `Rep`
- `Game`, `Play`, `GameState`, `FilmAngle`, `Observation`, `Tendency`, `ScoutingHypothesis`
- `GamePlan`, `Concept`, `Package`, `SituationalPolicy`, `CallSheet`
- `PracticePlan`, `PracticePeriod`, `Drill`, `ContactLevel`, `PracticeActual`
- `Incident`, `ClearanceRecord`, `EnvironmentalReading`, `EmergencyActionPlan`
- `Decision`, `Option`, `Assumption`, `Evidence`, `Prediction`, `Outcome`, `Review`

Medical records should not be collapsed into ordinary player ratings. A coach can receive an actionable availability restriction without receiving diagnosis details they do not need.

## Evidence limits and next research

- Governing-body documents establish required processes and constraints, not that a particular interface will improve win rate.
- The contact-exposure studies cited here are observational or small interventions; they support drill/contact tracking as an exposure-management tool, not individual injury prediction.
- NFL fourth-down results establish a modeling method, not high-school thresholds.
- State rules cited as examples cannot be generalized to all states. Every launch jurisdiction needs a current rule audit.

Before fixing the feature roadmap, conduct contextual interviews and observe at least 8–12 programs across school size, competitive level, staff size, and state. Ask coaches to walk through one real opponent week and one game, then test whether the prototype changes a pending decision. Product validation should measure time-to-decision, evidence retrieval, plan-to-practice traceability, rules errors prevented, and retrospective decision quality before claiming that it increases wins.
