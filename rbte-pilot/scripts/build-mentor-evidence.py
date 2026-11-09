from pathlib import Path
import json, hashlib
r=Path(__file__).resolve().parents[2]
app=r/'rbte-pilot'
revision='047806b4ab3e4f1bb0fe9580eac5fc6c2768967c'
records=[]
def add(id,path,stages,start=None,end=None,repo='ARB774/DS-RBTE',commit=revision,source_path=None):
    raw=(r/path).read_bytes(); text=raw.decode('utf-8').replace('\r\n','\n')
    excerpt='\n'.join(text.splitlines()[start-1:end]) if start else text
    records.append(dict(id=id,repo=repo,commit=commit,path=source_path or path,sha256=hashlib.sha256(text.encode()).hexdigest(),range=f'L{start}-L{end}' if start else 'full',stages=stages,text=excerpt))
base='Предложение ценности B2B/'
add('DS-RBTE.CORE',base+'Постоянное ядро наставника.md',['*'])
add('DS-RBTE.STATE',base+'Карточка состояния наставника.md',['*'])
add('DS-RBTE.CLOUD-DISPLAY',base+'Оперативный модуль работы с Тучей.md',['S5'])
tz=base+'Техническое задание на наставничество обучающегося по теме Разработка предложения ценности на B2B-рынке.md'
add('DS-RBTE.SESSION',tz,['*'],524,560)
add('DS-RBTE.S0',tz,['S0'],1087,1154)
add('DS-RBTE.S6.COMMON',tz,['S6.1','S6.2','S6.3'],2404,2419)
for stage,start,end in [('S1',1187,1218),('S2',1219,1246),('S3',1419,1547),('S4',1777,1934),('S5',1935,2374),('S6.1',2420,2535),('S6.2',2536,2576),('S6.3',2577,2602),('S7',2603,2702),('S8',2703,2752),('S9',2753,2759),('S10',2760,2772),('S11',2773,2841)]:
    add('DS-RBTE.'+stage,tz,[stage],start,end)
manifest=json.loads((app/'lib/pack-toc-sources.json').read_text('utf-8'))
for id,stages in [('TOC.M.003',['S5','S6.1','S6.2','S6.3']),('TOC.M.004',['S6.1','S6.2','S6.3']),('TOCT.6',['S6.1','S6.2','S6.3']),('TOCT.7',['S7','S8']),('TOC.WP.003',['S6.1','S6.2','S6.3']),('TOC.WP.006',['S7','S8']),('TOC.WP.004',['S5']),('TOC.DOC.040',['S5']),('TOC.D.008',['S6.1','S6.2','S6.3'])]:
    s=manifest['sources'][id]
    add(id,'rbte-pilot/knowledge/pack-toc/'+s['path'],stages,repo=manifest['repo'],commit=manifest['commit'],source_path=s['path'])
dest=app/'lib/value-proposition-evidence.json'
dest.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
