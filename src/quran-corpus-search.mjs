import corpus from './data/quran-verse-index.json' with {type:'json'};
export const quranCorpusInfo=()=>({publisher:corpus.publisher,edition:corpus.edition,verses:corpus.verses,surahs:corpus.surahs,sha256:corpus.sha256,retrieved_at:corpus.retrieved_at,source_url:corpus.source_url,review_status:'translation_not_tafsir'});
