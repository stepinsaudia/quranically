# Read-only source shape probe for official HadeethEnc English XLSX.
# No full text printed, stored or published. Uses Python standard library only.
import io, json, re, urllib.request, zipfile, xml.etree.ElementTree as ET
url='https://hadeethenc.com/en/browse/download/en'
try:
    request=urllib.request.Request(url,headers={'User-Agent':'Quranically-source-provenance-audit/1.0','Accept':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
    with urllib.request.urlopen(request,timeout=28) as response:
        body=response.read(35000001)
    if len(body)>35000000:raise ValueError('Dataset exceeds bounded import probe')
    archive=zipfile.ZipFile(io.BytesIO(body))
    n={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    shared=[]
    if 'xl/sharedStrings.xml' in archive.namelist():
        root=ET.fromstring(archive.read('xl/sharedStrings.xml'))
        shared=[''.join(e.itertext()) for e in root.findall('x:si',n)]
    sheets=[s for s in archive.namelist() if re.fullmatch(r'xl/worksheets/sheet\d+\.xml',s)]
    for sheet in sheets[:3]:
        rows=0;first=[]
        with archive.open(sheet) as reader:
            for event,elem in ET.iterparse(reader,events=('end',)):
                if elem.tag.endswith('}row'):
                    rows+=1
                    if rows<=2:
                        cells=[]
                        for cell in list(elem):
                            if not cell.tag.endswith('}c'):continue
                            v=cell.find('x:v',n)
                            inline=cell.find('x:is',n)
                            val=v.text if v is not None else ''.join(inline.itertext()) if inline is not None else ''
                            if cell.get('t')=='s' and str(val).isdigit() and int(val)<len(shared):val=shared[int(val)]
                            cells.append([cell.get('r'),str(val)[:70]])
                        first.append(cells)
                    elem.clear()
        print(json.dumps({'sheet':sheet,'rows':rows,'header_samples':first,'sharedStrings':len(shared),'bytes':len(body)},ensure_ascii=False))
except Exception as e:
    print(json.dumps({'status':'unavailable','error':str(e)[:140]}))
