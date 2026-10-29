#!/usr/bin/env python3
"""Offline, reproducible HadeethEnc source import into the existing D1 schema.

No data is checked into Git. The original Arabic, translation, explanation,
benefits, grading, and takhrij are stored verbatim in separate columns.
Only separate search_text is normalized, without changing the source wording.
"""
import hashlib, io, json, re, sys, unicodedata, urllib.request, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

URL = "https://hadeethenc.com/en/browse/download/en"
NS = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
NEEDED = ("id","title","hadith_text_ar","hadith_text","explanation","benefits","grade","takhrij","link","lang")

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

def normalize(value):
    text = unicodedata.normalize("NFKC", value).lower()
    text = "".join(c for c in text if unicodedata.category(c) not in ("Mn", "Me"))
    text = text.translate(str.maketrans("إأآٱى", "ااااي"))
    return re.sub(r"\s+", " ", "".join(c if c.isalnum() else " " for c in text)).strip()

def main():
    dest = Path(sys.argv[1] if len(sys.argv)>1 else "/tmp/quranically-hadeethenc.sql")
    request = urllib.request.Request(URL, headers={"User-Agent":"Quranically-source-sync/1.0","Accept":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
    with urllib.request.urlopen(request, timeout=35) as res:
        blob = res.read(35000001)
    if len(blob)>35000000:raise ValueError("Official source export exceeds safety budget")
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        ss=ET.fromstring(z.read("xl/sharedStrings.xml"))
        strings=["".join(x.itertext()) for x in ss.findall("x:si",NS)]
        def cell(row):
            out={}
            for c in row.findall("x:c",NS):
                tag=re.match("[A-Z]+",c.attrib.get("r",""))
                if not tag:continue
                v=c.find("x:v",NS)
                inline=c.find("x:is",NS)
                value=(v.text or "") if v is not None else "".join(inline.itertext()) if inline is not None else ""
                if c.attrib.get("t")=="s" and value.isdecimal():value=strings[int(value)]
                out[tag.group(0)]=value
            return out
        with z.open("xl/worksheets/sheet1.xml") as file:
            rows=[]
            for _,elem in ET.iterparse(file,events=("end",)):
                if elem.tag.endswith("}row"):
                    rows.append(cell(elem))
                    elem.clear()
    notice=rows[0].get("A","")
    match=re.search(r"\(v(\d+\.\d+\.\d+)\)",notice)
    if not match or "hadeethenc.com" not in notice.lower():raise ValueError("Official version/attribution header missing")
    version="v"+match.group(1)
    if not re.search(r"# Language: English",notice):raise ValueError("Unexpected language")
    head=rows[1]
    cols={name:letter for letter,name in head.items()}
    if any(k not in cols for k in NEEDED):raise ValueError("Official XLSX columns changed: "+repr(sorted(cols)))
    prepared=[];seen=set()
    for row in rows[2:]:
        data={name:row.get(letter,"") for name,letter in cols.items()}
        key=str(data["id"]).strip()
        if not re.fullmatch(r"\d{1,9}",key):raise ValueError("Non-numeric publisher record id")
        if key in seen:raise ValueError("Duplicate publisher record id: "+key)
        seen.add(key)
        if data["lang"].strip().lower()!="en":raise ValueError("Unexpected record language")
        if not data["hadith_text"] or not data["hadith_text_ar"]:raise ValueError("Missing Arabic or English in "+key)
        url=data["link"].strip()
        if urlparse(url).scheme!="https" or urlparse(url).hostname not in ("hadeethenc.com","www.hadeethenc.com"):
            raise ValueError("Unexpected publisher source URL: "+key)
        source_id="hadeethenc-en"
        doc_id=hashlib.sha256((source_id+"|"+key).encode()).hexdigest()[:40]
        original=data["hadith_text_ar"];translation=data["hadith_text"]
        explanation=data.get("explanation","");benefits=data.get("benefits","")
        grade=data.get("grade","");takhrij=data.get("takhrij","")
        title=data["title"]
        normalized=normalize(" ".join([title,key,original,translation,explanation,benefits,takhrij]))[:39000]
        digest=hashlib.sha256(json.dumps([source_id,key,original,translation,explanation,benefits,grade,takhrij],ensure_ascii=False).encode()).hexdigest()
        prepared.append((doc_id,source_id,key,title,"sunnah",original,translation,explanation,benefits,grade,takhrij,normalized,url,version,digest,"en","unreviewed","published"))
    if len(prepared)<2000:raise ValueError("Official export unexpectedly incomplete")
    dest.parent.mkdir(parents=True,exist_ok=True)
    names="id,source_id,external_ref,title,domain,original_text,translation_text,explanation_text,benefits_text,grade_text,takhrij_text,normalized_search,source_url,content_version,content_sha256,language,expert_review,status"
    # Do not send the full text of a long Hadith as one D1 statement.
    # This also supports bounded, idempotent remote imports in 100-record chunks.
    import os
    chunk_dir = Path(os.environ["QST_CORPUS_CHUNK_DIR"]) if os.environ.get("QST_CORPUS_CHUNK_DIR") else None
    if chunk_dir: chunk_dir.mkdir(parents=True,exist_ok=True)
    header = "-- Official HadeethEnc English release v1.25.0. Source wording unchanged.\\n" + "UPDATE knowledge_sources SET version_label="+quote(version)+",publisher_notice="+quote(notice)+",updated_at=datetime('now') WHERE id='hadeethenc-en' AND rights_mode='verified_verbatim';\\n"
    fields = ("original_text","translation_text","explanation_text","benefits_text","grade_text","takhrij_text","normalized_search")
    indexes = (5,6,7,8,9,10,11)
    # Each SQL statement must remain below D1's smallest practical SQL budget.
    def emit_text(out,stmt):
        raw=stmt.encode("utf-8")
        if len(raw)>=7000: raise ValueError("Oversized SQL statement: "+str(len(raw)))
        out.write(stmt+"\\n")
    def write_document(out,data):
        ident=data[0]
        blank=list(data)
        for ix in indexes:blank[ix]=""
        blank[-1]="draft"
        values=",".join(quote(x) for x in blank)
        initial=("INSERT INTO knowledge_passages("+names+") VALUES("+values+") "+
                 "ON CONFLICT(id) DO UPDATE SET title=excluded.title,domain=excluded.domain,"+
                 "original_text='',translation_text='',explanation_text='',benefits_text='',grade_text='',"+
                 "takhrij_text='',normalized_search='',source_url=excluded.source_url,content_version=excluded.content_version,"+
                 "content_sha256=excluded.content_sha256,language=excluded.language,expert_review='unreviewed',"+
                 "status='draft',updated_at=datetime('now');")
        emit_text(out,initial)
        for col,ix in zip(fields,indexes):
            original=data[ix]
            for offset in range(0,len(original),600):
                exact=original[offset:offset+600]
                emit_text(out,"UPDATE knowledge_passages SET "+col+"="+col+"||"+quote(exact)+" WHERE id="+quote(ident)+";")
        emit_text(out,"UPDATE knowledge_passages SET status='published' WHERE id="+quote(ident)+";")
    with dest.open("w",encoding="utf-8") as out:
        out.write(header)
        if chunk_dir:
            for part,start in enumerate(range(0,len(prepared),100),1):
                chunk=chunk_dir/("corpus-part-%04d.sql"%part)
                with chunk.open("w",encoding="utf-8") as batch:
                    if part==1: batch.write(header)
                    for data in prepared[start:start+100]:
                        write_document(out,data)
                        write_document(batch,data)
        else:
            for data in prepared: write_document(out,data)
    largest=max((len(line.encode("utf-8")) for line in dest.open(encoding="utf-8")),default=0)
    print(json.dumps({"publisher":"HadeethEnc","language":"en","edition":version,"records":len(prepared),"unique_ids":len(seen),"size_bytes":dest.stat().st_size,"publisher_notice_preserved":bool(notice),"largest_statement_bytes":largest,"parts":len(list(chunk_dir.glob('corpus-part-*.sql'))) if chunk_dir else 0}))
if __name__=="__main__":main()
