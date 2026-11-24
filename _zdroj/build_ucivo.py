import re, markdown, html
md=open('_zdroj/vytah.md').read()
md=re.sub(r"```latex\n\\text\{Efektivnost\}.*?```", '<div class="f">Efektivnost = výstup / vstup &nbsp;&nbsp;·&nbsp;&nbsp; Produktivita práce = výstup / počet pracovníků</div>', md, flags=re.S)
md=re.sub(r"```latex\n\\text\{Bod zvratu.*?```", '<div class="f">Bod zvratu: Q = FN / (P − vn) &nbsp;&nbsp;·&nbsp;&nbsp; CN = FN + vn · Q &nbsp;&nbsp;·&nbsp;&nbsp; TR = P · Q</div>', md, flags=re.S)
parts=re.split(r'^## ', md, flags=re.M)[1:]
subj={'Ekonomika':('EKO','eko'),'Právo':('PRA','pra'),'Účetnictví':('UCE','uce'),'Chytáky a čísla k zapamatování':('CHY','chy')}
tabs=[];bodies=[];toc=[]
for p in parts:
    title,body=p.split('\n',1)
    title=title.strip()
    if title not in subj: continue
    code,pre=subj[title]
    secs=re.split(r'^### ', body, flags=re.M)
    intro=secs[0]; items=[]
    out=[markdown.markdown(intro, extensions=['tables'])] if intro.strip() else []
    for k,s in enumerate(secs[1:],1):
        h,b=s.split('\n',1); sid=f"{pre}-{k}"
        items.append((sid,h.strip()))
        hb=markdown.markdown(b, extensions=['tables'])
        hb=hb.replace('<table>','<div class="scroll"><table>').replace('</table>','</table></div>')
        out.append(f'<section id="{sid}" class="sec"><div class="sh"><h3>{html.escape(h.strip())}</h3><label class="done"><input type="checkbox" data-sec="{sid}"> Přečteno</label></div>{hb}'+(f'<p class="pr" style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="dvojice.html#{sid}">Zkoušet se ve dvou</a><a class="btn ghost" href="trenink.html#sec-{sid}">Procvičit kapitolu</a></p>' if code!='CHY' else '')+'</section>')
    if not items:
        sid=pre; items=[(sid,title)]
        out=[f'<section id="{sid}" class="sec"><div class="sh"><h3>{title}</h3><label class="done"><input type="checkbox" data-sec="{sid}"> Přečteno</label></div>'+markdown.markdown(body,extensions=['tables']).replace('<table>','<div class="scroll"><table>').replace('</table>','</table></div>')+'</section>']
    tabs.append((code,title,items)); bodies.append((code,title,''.join(out)))
nav='<nav class="toc" aria-label="Obsah">'+''.join(f'<div class="tg"><span class="pill {c}">{t if c!="CHY" else "Chytáky"}</span>'+''.join(f'<a href="#{i}" data-sec="{i}">{html.escape(h)}</a>' for i,h in it)+'</div>' for c,t,it in tabs)+'</nav>'
main=''.join(f'<div class="subj" id="s-{c}"><h2><span class="pill {c}" style="font-size:16px;vertical-align:middle">{t}</span></h2>{b}</div>' for c,t,b in bodies)
tpl=open('_zdroj/ucivo.tpl.html').read()
open('ucivo.html','w').write(tpl.replace('__TOC__',nav).replace('__MAIN__',main))
import json; json.dump([(i,h,c) for c,t,it in tabs for i,h in it],open('sections.json','w'),ensure_ascii=False)
print([ (c,len(it)) for c,t,it in tabs])
