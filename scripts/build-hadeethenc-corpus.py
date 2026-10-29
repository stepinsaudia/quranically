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
    with dest.open("w",encoding="utf-8") as out:
        out.write("-- HadeethEnc official English release. Original source wording must never be altered.\n")
        out.write("-- Publisher terms: https://hadeethenc.com/en\n")
        out.write("UPDATE knowledge_sources SET version_label="+quote(version)+",publisher_notice="+quote(notice)+",updated_at=datetime('now') WHERE id='hadeethenc-en' AND rights_mode='verified_verbatim';\n")
        for data in prepared:
            values=",".join(quote(x) for x in data)
            out.write("INSERT INTO knowledge_passages("+names+") VALUES("+values+") ON CONFLICT(id) DO UPDATE SET original_text=excluded.original_text,translation_text=excluded.translation_text,explanation_text=excluded.explanation_text,benefits_text=excluded.benefits_text,grade_text=excluded.grade_text,takhrij_text=excluded.takhrij_text,normalized_search=excluded.normalized_search,source_url=excluded.source_url,content_version=excluded.content_version,content_sha256=excluded.content_sha256,updated_at=datetime('now');\n")
    print(json.dumps({"publisher":"HadeethEnc","language":"en","edition":version,"records":len(prepared),"unique_ids":len(seen),"size_bytes":dest.stat().st_size,"publisher_notice_preserved":bool(notice)}))
if __name__=="__main__":main()
