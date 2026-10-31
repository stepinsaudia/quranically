# Quranically — Five-Discipline Source-to-Life Contract
**Status:** Development architecture, non-exhaustive editorial pilot. **Not** a fatwa service, medical service or certification of every imported text.

## Canonical concept
One technology platform. Five separate knowledge disciplines. One canonical citation for every textual claim. Every public answer distinguishes (1) what the cited source says, (2) what a named authority or editor understands from it, (3) a voluntary, bounded everyday application, and (4) what the available evidence cannot establish. Unreviewed content must carry its review status. The protected Admin publishes content; public visitors cannot use unreviewed private records.

## Qur’an: revelation, translation, Tafsir, reflection
The original Arabic verse is primary; translation is attributed to a named edition, **not** the Arabic revelation itself. An authorised, edition-attributed Tafsir is separate from an editorial theme summary. A reflection may suggest reading the original passage, studying its context, remembering its moral teaching or taking appropriate ethical action; it must not invent a specified recitation count, guaranteed outcome, legal obligation or personal ruling. Qur’anic themes belong within Qur’an. Reader verse-to-study links require exact `chapter:ayah` citation matches, never keyword closeness. Hadith may provide context in cited studies, not masquerade as Qur’anic Tafsir.
**Primary source boundary:** the canonical citation for a Qur’anic thematic learning guide must be a Qur’an citation of the SAME article.

## Sunnah and Hadith: report, attribution, authentication, action
Distinguish sayings, actions, approvals, companions’ practices and later scholarly explanation. Preserve report wording, narrator chain/collection where available, exact ID, grading and **who** assigned the grading. An editor must not regrade a Hadith or turn one context-dependent narrated action into a universal Sunnah method. Show practical ethical examples only as editorial examples, not new Prophetic commands. Discuss conditions, relevant scholarly disagreement and scope.
**Primary citation:** Hadith from the SAME article; Qur’anic support can be additional but not the primary proof of a claimed report.

## Seerah: historically grounded biography and lived character
Connect events to source confidence, time/location where supported, participants, circumstances, consequences and ethical lessons. Do not equate historical books with a canonical Sahih collection or assert disputed chronology as certainty. Life lessons must not convert a uniquely Prophetic event into a present-day legal command. Distinguish directly transmitted Qur’anic/Hadith history from later reconstructions.
**Primary citation:** Qur’an, Hadith or an attributed classical historical source from that SAME article.

## Prophetic Medicine: narrated practice versus daily life versus clinical evidence
Preserve the exact religious report, identity of the practitioner, historically described preparation and method, traditional interpretation, ordinary food/hygiene use, treatment context, clinical evidence and clear contraindications. Daily culinary use is not an authenticated universal dosage. Historical invasive methods are documented rather than prescribed. Medical claims need clinical appraisal and clinician review; seller availability never determines guidance. The separate `tibb_use_guides` schema preserves these distinctions.

## Living Guidance: ordinary decisions without self-issued fatwas
A question must be assessed by topic and circumstance, with Qur’an, Hadith and qualified jurisprudence distinguished. Broad ethical advice and optional practical steps can be provided with exact citations. Binding personal rulings, contested school differences, marital/legal/financial and safety-critical situations require contextual qualified scholarly or professional guidance. Never mix biomedical treatment into general religious advice as though it were a religious ruling.
**Primary citation:** Qur’an or Hadith from the SAME article, with further jurisprudence explicitly attributed.

## Database and Admin controls
- `encyclopedia_articles`: one canonical article, one domain and published state.
- `encyclopedia_citations`: original references and per-source verification state. A link does not imply permission to redistribute full source text.
- `discipline_learning_guides`: one-to-one practice/learning record for Qur’anic Themes, Sunnah, Seerah and Guidance. Requires same-article, domain-permitted primary citation. Never duplicate a shared Hadith in five independent databases.
- `tibb_use_guides`: separate practical medical-tradition record with explicit attribution and independent clinical/religious review.
- `journeys` / `steps`: guided learning journeys; steps are editorially sourced and not automatic fatwas.
- `sources`: ownership, reuse permissions, URLs and licence notes; **not** all open-access text is openly redistributable.

## Public rendering contract
The public answer first states sourced evidence and its status, followed by contextual understanding, examples of lived application and limits. If no published guide exists, show that limitation; do NOT manufacture a remedy, practice, Tafsir, fatwa, Hadith grade or historical certainty. Cross-domain references may be offered only as explicitly labelled **other perspectives**, never as an answer in a foreign discipline. Source and status links must remain visible. Arabic word-for-word readings need distinct editions and transcription checking.

## Acceptance tests
1. Four sample articles (patience, truthfulness, Hijrah, anger) have distinct learning models with exact canonical citations and pending expert-review labels.
2. Changing a guide's citation to another article or to a prohibited source type is rejected by protected Admin before database writes.
3. Draft and archived guides do not appear on public responses.
4. The Qur’an Reader only finds studies for **exact** verse references.
5. A query scoped to Seerah/Hadith/Qur’an/Guidance does not fetch Tibb ingredients or biomedical research as its primary answer.
6. The source-backed answer is fully readable on screen, not merely a link to another site.
7. Public and Admin layouts remain structurally coherent at mobile and desktop, with no silent source substitutions.

### Reference principles
- Quran.com Study Mode: https://quran.com/en/product-updates/new-study-mode-on-quran-com (reading, words, Tafsir and reflections are distinct layers).
- HadeethEnc: https://hadeethenc.com/en (publisher-attributed report, grading and explanations).
- International Islamic Fiqh Academy, Iftā Requirements: https://iifa-aifi.org/en/33591.html (qualified context-sensitive jurisprudential rulings).
- US National Library of Medicine, Prophetic Medicine: https://www.nlm.nih.gov/hmd/arabic/prophetic_med1.html (the historical literature is wider than ingredient narratives).
