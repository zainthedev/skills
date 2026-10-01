# lingo evidence base

## 1. Preface

This document is the evidence base for lingo, dojo's sibling for learning a human language. lingo inherits dojo's general learning science, retrieval practice, spacing, prediction questions, worked examples for novices and hint-only AI help, and does not restate it: those rows, with their citations, are in dojo's [evidence document](../../dojo/docs/evidence.md), section 3, and lingo relies on them as dojo does. This file adds what is particular to languages: input, output and interaction; corrective feedback in speech and in writing; vocabulary; tasks; levels and hours; and what an AI conversation partner can and cannot be trusted with.

Compiled on 2026-10-01 from searches of primary sources and publisher pages. Every claim carries a URL in section 5. The rule is dojo's: a lingo design choice that rests on evidence points here, skills and templates restate a rule without carrying citations, and a claim that cannot be traced to a row here is a design preference and is phrased as one.

## 2. What lingo keeps from dojo, and why it still holds

| dojo rule | Holds for languages because | Where in lingo |
|-----------|----------------------------|----------------|
| Retrieval prompts at the end of every lesson, answers in a sidecar | The testing effect was shown on foreign-language vocabulary itself: repeated retrieval of Swahili-English pairs produced large gains in delayed recall while repeated study after learning produced none, and learners did not predict it (Karpicke and Roediger 2008) | Retrieval practice, checkpoints, quiz |
| Spacing through checkpoints, no scheduler | Spacing evidence comes largely from verbal recall tasks (Cepeda 2006) | Checkpoints sample earlier sections; Anki schedules words |
| Prediction questions before the assignment | Pretesting helps prequestioned content (dojo section 3) | Before you start |
| AI that withholds answers | Unrestricted AI raised practice and lowered the unassisted test; a hint-only tutor removed the harm (Bastani 2025, in dojo's citations) | Coach, talk, review never write the learner's text |
| Predicted versus actual score | Learners misjudge what they will recall (Karpicke and Roediger 2008; dojo section 3) | Checkpoints and quiz |

## 3. Language learning evidence

| Claim | Evidence | Strength | lingo design |
|-------|----------|----------|--------------|
| Input that the learner can follow drives acquisition | The input hypothesis (Krashen 1982), a theory more than a finding; extensive reading has a medium positive effect on proficiency, d = 0.46 across 22 group-contrast samples (Nakanishi 2015) | Moderate (ER effect); theory contested | Lessons are short so the hours go to listening and reading; How lines say how to make input comprehensible |
| Comprehension needs most words known | Readers needed about 98% of running words known for adequate unassisted comprehension, in a study of 66 learners (Hu and Nation 2000), since replicated and examined (Kremmel 2023) | Moderate | Words are high-frequency and drawn from the assigned input; input sits at or just above the learner's level |
| Producing language matters on its own | Immersion learners with years of input understood well and produced less accurately; output pushes learners to notice what they cannot yet say (Swain 1985) | Moderate (theory with classroom grounding) | Say prompts, tasks, talk |
| Interaction helps | Learners who interacted outperformed those who did not, with large effects clearer on delayed tests, across 28 studies (Mackey and Goo 2007) | Strong | `/lingo-talk` exists |
| Oral corrective feedback works, and prompts beat recasts overall | Feedback had significant, durable effects; prompts (elicitation, clarification requests, repetition, metalinguistic clues) gave larger effects than recasts, d = 0.83 against 0.53 between groups (Lyster and Saito 2010); recasts were the most frequent teacher move but the least likely to lead to learner repair (Lyster and Ranta 1997) | Strong | Talk prompts first for a structure the course taught |
| Recasts suit some learners, prompts suit beginners | Low-proficiency learners gained significantly more from prompts than recasts; high-proficiency learners gained equally from both (Ammar and Spada 2006) | Moderate (one quasi-experiment, n = 64) | More prompts with clues at A0 to A2; recasts carry more of the load from B1 |
| Explicit feedback wins early, implicit lasts | Corrective feedback had a medium overall effect that held over time; explicit feedback beat implicit on immediate and short-delayed tests, implicit held up better on long-delayed tests (Li 2010) | Strong | Talk mixes in-conversation prompts and recasts with an explicit closing summary |
| Feedback timing matters less than its presence | Immediate and delayed feedback both helped in written synchronous chat, without a clear winner (feedback-timing studies in written SCMC, 2023) | Emerging | One correction per turn, the rest in the summary |
| Left alone, text chat corrects by recast and the recast passes unnoticed | In naturalistic native-learner text chat, recasts were the only feedback that occurred, with no immediate effect on uptake and one delayed instance (Akbar) | Emerging (exploratory, small) | Talk does not rely on recasts for what the course taught; it prompts for those |
| Written corrective feedback improves accuracy | Medium positive effect on written accuracy, moderated by proficiency, setting and genre (Kang and Han 2015) | Strong | `/lingo-review` exists |
| Focused feedback beats flooding the learner | Focused feedback on a few error types is easier to notice and act on than correcting everything (Ellis, Sheen, Murakami and Takashima 2008) | Moderate | At most eight marks a round, current structures first |
| Direct or indirect written feedback | Mixed: both direct and indirect comprehensive feedback improved accuracy durably, direct more for grammar and indirect more for non-grammar errors (Van Beuningen, De Jong and Kuiken 2012); direct feedback helped advanced writers (Bitchener and Knoch 2010) | Contested | lingo marks without giving the fix, a design choice from the AI rules, not a finding; ADR 0009 records the trade-off and the hint names the rule at A0 and A1 |
| Explicit instruction helps | Focused instruction gave large, durable gains, and explicit types beat implicit (Norris and Ortega 2000) | Strong | Each lesson has a Core idea in the native language at low levels |
| Task-based teaching works | A meta-analysis of TBLT programmes found positive effects (Bryfonski and McKay 2019), with method critiques since (Xuan, Cheung and Liu 2025; Boers and Faez 2023) | Moderate | Tasks replace projects |
| Shadowing helps lower-level listeners | Shadowing improved phoneme perception across levels and listening comprehension mainly for lower-proficiency learners (Hamada 2016) | Moderate | One listening item per lesson carries a shadowing or record-and-compare Do line |
| Chatbots help language learning | Meta-analyses of chatbot-assisted language learning report medium positive effects, roughly g = 0.5 to 0.6, moderated by modality, generative AI and comparison group (Lyu 2025; a 2022-2024 EFL meta-analysis) | Moderate, with publication-bias and novelty caveats | Talk is a partner with rules, not a tutor that explains or translates |

What lingo does not claim: that input alone is enough, that one correction style is best for every learner and structure, that AI conversation replaces a human partner, or that a self-reported level is a test result.

## 4. Levels and hours

- The CEFR describes six levels from A1 to C2 and a self-assessment grid by skill (Council of Europe, level descriptions and self-assessment grid; Companion volume 2020). lingo's placement table in PROFILE-FORMAT.md is a shortened adaptation of that grid, and placement is self-report: no test is run.
- Cambridge English gives approximate cumulative guided learning hours for English: A2 180 to 200, B1 350 to 400, B2 500 to 600, C1 700 to 800, C2 1,000 to 1,200. These are for English with a teacher; lingo uses them to warn that a CEFR step takes a few hundred hours, never as a promise.
- The Foreign Service Institute puts general professional proficiency for English speakers at 24 to 30 weeks (600 to 750 class hours) for languages such as Spanish and French, about 36 weeks for German, and 88 weeks (2,200 class hours) for Arabic, Mandarin, Japanese and Korean. lingo uses this to warn that distance from the native language multiplies the hours.
- National institutes publish free curricula by level, which lingo uses as structure sources, such as the Instituto Cervantes Plan curricular for Spanish.

## 5. Citations

- Akbar, F. S. Studies in Applied Linguistics and TESOL (Columbia University). Corrective feedback in written synchronous and asynchronous computer-mediated communication. https://journals.library.columbia.edu/index.php/SALT/article/view/1222 (PDF: https://files.eric.ed.gov/fulltext/EJ1176713.pdf)
- Ammar, A., and Spada, N. (2006). Studies in Second Language Acquisition, 28(4), 543-574. One size fits all? Recasts, prompts, and L2 learning. https://www.researchgate.net/publication/232021519_One_size_fits_all_Recasts_prompts_and_L2_learning
- Bitchener, J., and Knoch, U. (2010). Journal of Second Language Writing, 19, 207-217. Raising the linguistic accuracy level of advanced L2 writers with written corrective feedback. https://www.sciencedirect.com/science/article/abs/pii/S1060374310000421
- Boers, F., and Faez, F. (2023). Language Teaching Research. Meta-analysis to estimate the relative effectiveness of TBLT programs: Are we there yet? https://doi.org/10.1177/13621688231167573
- Bryfonski, L., and McKay, T. H. (2019). Language Teaching Research, 23(5), 603-632. TBLT implementation and evaluation: A meta-analysis. https://sites.google.com/view/larabryfonski/publications-and-presentations
- Cambridge English. Guided learning hours. https://support.cambridgeenglish.org/hc/en-gb/articles/202838506-Guided-learning-hours
- Council of Europe. The CEFR levels, with the global scale and the self-assessment grid. https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions
- Council of Europe (2020). Common European Framework of Reference for Languages: Learning, teaching, assessment. Companion volume. https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4
- Ellis, R., Sheen, Y., Murakami, M., and Takashima, H. (2008). System, 36(3), 353-371. The effects of focused and unfocused written corrective feedback in an English as a foreign language context. https://www.researchgate.net/publication/222298830_The_effects_of_focused_and_unfocused_written_corrective_feedback_in_an_English_as_a_foreign_language_context
- Feedback timing in written SCMC (2023). Computer Assisted Language Learning. The effects of feedback timing on L2 development in written SCMC. https://www.tandfonline.com/doi/full/10.1080/09588221.2023.2171066
- Foreign Service Institute, U.S. Department of State. Foreign language training: language learning timelines. https://2021-2025.state.gov/foreign-language-training/
- Hamada, Y. (2016). Language Teaching Research, 20(1), 35-52. Shadowing: Who benefits and how? Uncovering a booming EFL teaching technique for listening comprehension. https://www.researchgate.net/publication/283911163_Shadowing_Who_benefits_and_how_Uncovering_a_booming_EFL_teaching_technique_for_listening_comprehension
- Hu, M., and Nation, P. (2000). Reading in a Foreign Language, 13(1), 403-430. Unknown vocabulary density and reading comprehension. https://nflrc.hawaii.edu/rfl/item/43
- Instituto Cervantes. Plan curricular del Instituto Cervantes: Niveles de referencia para el español. https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/
- Kang, E., and Han, Z. (2015). The Modern Language Journal, 99(1), 1-18. The efficacy of written corrective feedback in improving L2 written accuracy: A meta-analysis. https://onlinelibrary.wiley.com/doi/abs/10.1111/modl.12189
- Karpicke, J. D., and Roediger, H. L. (2008). Science, 319(5865), 966-968. The critical importance of retrieval for learning. https://www.science.org/doi/abs/10.1126/science.1152408 (PDF: http://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Karpicke-Roediger-2008_Sci.pdf)
- Krashen, S. D. (1982). Principles and practice in second language acquisition. Pergamon. Free from the author: https://sdkrashen.com/content/books/principles_and_practice.pdf
- Kremmel and others (2023). Language Learning. Unknown vocabulary density and reading comprehension: Replicating Hu and Nation (2000). https://onlinelibrary.wiley.com/doi/10.1111/lang.12622
- Li, S. (2010). Language Learning, 60(2), 309-365. The effectiveness of corrective feedback in SLA: A meta-analysis. https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9922.2010.00561.x
- Lyster, R., and Ranta, L. (1997). Studies in Second Language Acquisition, 19(1), 37-66. Corrective feedback and learner uptake: Negotiation of form in communicative classrooms. https://eric.ed.gov/?id=EJ539354
- Lyster, R., and Saito, K. (2010). Studies in Second Language Acquisition, 32(2), 265-302. Oral feedback in classroom SLA: A meta-analysis. https://www.researchgate.net/publication/234580927_Oral_Feedback_in_Classroom_SLA_A_Meta-Analysis
- Lyu and others (2025). International Journal of Applied Linguistics. Effectiveness of chatbots in improving language learning: A meta-analysis of comparative studies. https://onlinelibrary.wiley.com/doi/full/10.1111/ijal.12668
- Can AI chatbots effectively improve EFL learners' learning effects? A meta-analysis of empirical research from 2022-2024. https://www.researchgate.net/publication/388829750_Can_AI_chatbots_effectively_improve_EFL_learners'_learning_effects-A_meta-analysis_of_empirical_research_from_2022-2024
- Mackey, A., and Goo, J. (2007). In A. Mackey (Ed.), Conversational interaction in second language acquisition (pp. 407-453). Oxford University Press. Interaction research in SLA: A meta-analysis and research synthesis. https://research.lancaster-university.uk/en/publications/interaction-research-in-sla-a-meta-analysis-and-research-synthesi/
- Nakanishi, T. (2015). TESOL Quarterly, 49(1), 6-37. A meta-analysis of extensive reading research. https://doi.org/10.1002/tesq.157
- Norris, J. M., and Ortega, L. (2000). Language Learning, 50(3), 417-528. Effectiveness of L2 instruction: A research synthesis and quantitative meta-analysis. https://onlinelibrary.wiley.com/doi/abs/10.1111/0023-8333.00136
- Swain, M. (1985). In S. Gass and C. Madden (Eds.), Input in second language acquisition (pp. 235-253). Newbury House. Communicative competence: Some roles of comprehensible input and comprehensible output in its development. Discussed with the hypothesis at https://files.eric.ed.gov/fulltext/EJ420159.pdf
- Van Beuningen, C. G., De Jong, N. H., and Kuiken, F. (2012). Language Learning, 62(1), 1-41. Evidence on the effectiveness of comprehensive error correction in second language writing. https://www.researchgate.net/publication/263679139_Evidence_on_the_Effectiveness_of_Comprehensive_Error_Correction_in_Second_Language_Writing
- Xuan, Q., Cheung, A., and Liu, J. (2025). Language Teaching Research. How effective is task-based language teaching to enhance second language learning? A technical comment on Bryfonski and McKay (2019). https://journals.sagepub.com/doi/10.1177/13621688221131127
