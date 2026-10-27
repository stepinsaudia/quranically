-- Editorial Arabic snippets and original explanatory paraphrases. Scripture and Hadith excerpts must undergo formal exact-text QA before scholarly approval.
ALTER TABLE tibb_entries ADD COLUMN source_arabic TEXT NOT NULL DEFAULT '';
ALTER TABLE tibb_entries ADD COLUMN source_meaning TEXT NOT NULL DEFAULT '';
UPDATE tibb_entries SET source_arabic='فِيهِ شِفَاءٌ لِلنَّاسِ',source_meaning='The verse describes healing associated with what emerges from bees.' WHERE id='honey';
UPDATE tibb_entries SET source_arabic='فِي الْحَبَّةِ السَّوْدَاءِ شِفَاءٌ مِنْ كُلِّ دَاءٍ إِلَّا السَّامَ',source_meaning='The narration speaks about healing in black seed, excluding death. Its medical application needs condition-specific research.' WHERE id='black-seed';
UPDATE tibb_entries SET source_arabic='إِنَّ التَّلْبِينَةَ تُجِمُّ فُؤَادَ الْمَرِيضِ وَتَذْهَبُ بِبَعْضِ الْحُزْنِ',source_meaning='The narration associates talbina with comfort for illness and some grief.' WHERE id='talbina';
UPDATE tibb_entries SET source_arabic='مَنْ تَصَبَّحَ كُلَّ يَوْمٍ سَبْعَ تَمَرَاتٍ عَجْوَةً',source_meaning='The narration mentions eating seven Ajwa dates in the morning. Read the complete source for its wording and context.' WHERE id='ajwa-dates';
UPDATE tibb_entries SET source_arabic='تَنْبُتُ بِالدُّهْنِ وَصِبْغٍ لِلْآكِلِينَ',source_meaning='The verse describes a tree producing oil and food for those who eat.' WHERE id='olive';
UPDATE tibb_entries SET source_arabic='لَأَمَرْتُهُمْ بِالسِّوَاكِ مَعَ كُلِّ صَلَاةٍ',source_meaning='The Prophet ﷺ spoke of using siwak with every prayer, were it not burdensome.' WHERE id='miswak';
UPDATE tibb_entries SET source_arabic='إِنَّ أَمْثَلَ مَا تَدَاوَيْتُمْ بِهِ الْحِجَامَةُ',source_meaning='The narration mentions cupping among practices used for treatment in that historical context.' WHERE id='hijama';
UPDATE tibb_entries SET source_arabic='وَمَا أَدْرَاكَ أَنَّهَا رُقْيَةٌ',source_meaning='The narration recognizes Al-Fatiha recitation in a ruqyah context.' WHERE id='ruqyah';
