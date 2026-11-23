#!/usr/bin/env python3
"""Weekly source metadata collector. No legal thesis or quiz answer is generated from headlines."""
import datetime as dt, html, json, re, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin

ROOT=Path(__file__).resolve().parents[1]
HEADERS={'User-Agent':'DeltaJurisEducationalFeedReader/1.0 (+public RSS metadata)'}
SOURCES={
 'STJ': [
 'https://processo.stj.jus.br/jurisprudencia/externo/InformativoFeed',
 'https://scon.stj.jus.br/SCON/JurisprudenciaEmTesesFeed',
 'https://scon.stj.jus.br/SCON/PesquisaProntaFeed'],
 'Dizer o Direito':['https://www.dizerodireito.com.br/feeds/posts/default?alt=rss'],
}
STF_PAGE='https://www.stf.jus.br/textos/verTexto.asp?servico=informativoSTF'

def fetch(url):
 req=urllib.request.Request(url,headers=HEADERS)
 with urllib.request.urlopen(req,timeout=25) as r:return r.read()

def clean(t):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',t or ''))).strip()

def feed_items(source,url):
 root=ET.fromstring(fetch(url)); out=[]
 for e in root.findall('.//item')[:35]:
  title=clean(e.findtext('title')); link=(e.findtext('link') or '').strip(); date=clean(e.findtext('pubDate'))
  if title and link.startswith('https://') or (title and link.startswith('http://')):out.append(dict(source=source,title=title,url=link,published=date))
 # Atom fallback
 ns={'a':'http://www.w3.org/2005/Atom'}
 for e in root.findall('.//a:entry',ns)[:35]:
  title=clean(e.findtext('a:title',default='',namespaces=ns)); links=e.findall('a:link',ns); link=next((l.get('href') for l in links if l.get('rel','alternate')=='alternate'),None)
  date=e.findtext('a:updated',default='',namespaces=ns)
  if title and link and link.startswith('http'):out.append(dict(source=source,title=title,url=link,published=date))
 return out

class STFLinks(HTMLParser):
 def __init__(self):super().__init__();self.href=None;self.buf=[];self.found=[]
 def handle_starttag(self,tag,attrs):
  if tag=='a':self.href=dict(attrs).get('href');self.buf=[]
 def handle_data(self,d):
  if self.href is not None:self.buf.append(d)
 def handle_endtag(self,tag):
  if tag=='a' and self.href:
   title=clean(' '.join(self.buf));link=urljoin(STF_PAGE,self.href)
   if (re.search(r'informativo|\b12[0-9]{2}\b',title,re.I) or re.search(r'Informativo_stf_\d+',link,re.I)) and link.startswith('http'):
    self.found.append(dict(source='STF',title=title or 'Informativo STF',url=link,published=''))
   self.href=None

def main():
 items=[];errors=[]
 for source,urls in SOURCES.items():
  for url in urls:
   try:items.extend(feed_items(source,url))
   except Exception as exc:errors.append({'source':source,'url':url,'message':str(exc)[:180]})
 try:
  parser=STFLinks();parser.feed(fetch(STF_PAGE).decode('utf-8','replace'));items.extend(parser.found[:30]);
  if not parser.found:errors.append({'source':'STF','message':'Nenhum link de informativo identificado no HTML; verificar estrutura do portal.'})
 except Exception as exc:errors.append({'source':'STF','message':str(exc)[:180]})
 dedup={}
 for x in items:
  if x['url'] not in dedup:dedup[x['url']]=x
 oldpath=ROOT/'data/updates.json'
 if oldpath.exists():
  try:
   old=json.loads(oldpath.read_text());
   for x in old.get('items',[]):dedup.setdefault(x['url'],x)
  except Exception:pass
 payload={'updated_at':dt.datetime.now(dt.timezone.utc).isoformat(),'items':list(dedup.values())[:350],'errors':errors}
 oldpath.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f"Found {len(items)} current items; stored {len(payload['items'])}; errors {len(errors)}")

if __name__=='__main__':main()
