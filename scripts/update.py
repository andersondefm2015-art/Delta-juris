#!/usr/bin/env python3
"""Delta Juris: coletor conservador de metadados públicos.

Não transforma manchetes em teses, resumos ou questões jurídicas.
"""
from __future__ import annotations

import datetime as dt
import email.utils
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import codecs
import urllib.error
import urllib.request
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data' / 'updates.json'
TIMEOUT = 20
MAX_ITEMS = 350
USER_AGENT = 'DeltaJurisEducationalCollector/2.0 (public metadata)'

# URLs candidatas: disponibilidade e formato precisam ser validados a cada execução.
FEEDS = {
    'STJ': [
        'https://processo.stj.jus.br/jurisprudencia/externo/InformativoFeed',
        'https://scon.stj.jus.br/SCON/JurisprudenciaEmTesesFeed',
        'https://scon.stj.jus.br/SCON/PesquisaProntaFeed',
    ],
    'Dizer o Direito': [
        'https://www.dizerodireito.com.br/feeds/posts/default?alt=rss',
    ],
}
STF_PAGE = 'https://www.stf.jus.br/textos/verTexto.asp?servico=informativoSTF'


def fetch(url: str) -> tuple[bytes, str]:
    req = urllib.request.Request(url, headers={
        'User-Agent': USER_AGENT,
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8',
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
        return response.read(3_000_000), response.headers.get('Content-Type', '')


def clean(value: str | None) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', value or ''))).strip()


def valid_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == 'https' and bool(parsed.netloc)


def normalized_date(value: str | None) -> str:
    if not value:
        return ''
    try:
        parsed = email.utils.parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.isoformat()
    except (TypeError, ValueError, IndexError):
        pass
    try:
        return dt.datetime.fromisoformat(value.replace('Z', '+00:00')).isoformat()
    except ValueError:
        return clean(value)


def category(title: str) -> str:
    # Classificação por palavras-chave; não é análise do mérito jurídico.
    rules = [
        ('Direito Processual Penal', r'pris[aã]o|habeas corpus|inquérito|prova ilícita|audiência de custódia|processo penal|anpp'),
        ('Direito Penal', r'crime|pena|tráfico|homicídio|furto|roubo|estupro|dosimetria'),
        ('Direito Constitucional', r'constituiç[aã]o|constitucional|direitos fundamentais|adi\b|adpf\b'),
        ('Direito Administrativo', r'administraç[aã]o pública|servidor|licitaç[aã]o|improbidade'),
        ('Direito Civil', r'responsabilidade civil|contrato|família|sucess[aã]o'),
    ]
    for label, pattern in rules:
        if re.search(pattern, title, re.IGNORECASE):
            return label
    return 'Não classificado'


def make_item(source: str, title: str, url: str, published: str = '') -> dict | None:
    title, url = clean(title), url.strip()
    if not title or not valid_url(url):
        return None
    return {
        'id': hashlib.sha256(url.encode('utf-8')).hexdigest()[:20],
        'source': source,
        'title': title,
        'url': url,
        'published': normalized_date(published),
        'category': category(title),
        'content_status': 'metadata_only',
        'verified_legal_summary': False,
    }


def parse_xml_with_fallback(raw: bytes, content_type: str) -> ET.Element:
    """Tenta XML original e uma reparação conservadora de codificação/entidades."""
    try:
        return ET.fromstring(raw)
    except ET.ParseError as first_error:
        charset_match = re.search(r'charset\s*=\s*["\']?([\w-]+)', content_type, re.I)
        charset = charset_match.group(1) if charset_match else 'utf-8'
        try:
            codecs.lookup(charset)
            decoded = raw.decode(charset, errors='replace')
        except (LookupError, UnicodeError):
            decoded = raw.decode('utf-8', errors='replace')
        # Remove declaração de encoding: agora a entrada é texto Unicode.
        decoded = re.sub(r'^\ufeff?\s*<\?xml[^>]*\?>', '', decoded, count=1, flags=re.I)
        # Remove caracteres de controle proibidos em XML 1.0.
        decoded = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', decoded)
        # Corrige apenas & isolados, sem alterar entidades XML válidas.
        decoded = re.sub(r'&(?!#(?:[0-9]+|x[0-9a-fA-F]+);|[a-zA-Z][a-zA-Z0-9._:-]*;)', '&amp;', decoded)
        try:
            return ET.fromstring(decoded)
        except ET.ParseError as second_error:
            raise ValueError(f'XML inválido; original: {first_error}; após reparo: {second_error}') from second_error


def parse_feed(source: str, url: str) -> list[dict]:
    raw, content_type = fetch(url)
    sample = raw[:300].lstrip().lower()
    if b'<html' in sample or b'<!doctype html' in sample:
        raise ValueError(f'HTML recebido em vez de RSS/Atom ({content_type})')
    try:
        root = parse_xml_with_fallback(raw, content_type)
    except ValueError as exc:
        raise ValueError(f'XML/RSS inválido ({content_type}): {exc}') from exc
    result = []
    for entry in root.findall('.//item')[:60]:
        item = make_item(source, entry.findtext('title') or '', entry.findtext('link') or '', entry.findtext('pubDate') or '')
        if item:
            result.append(item)
    atom = {'a': 'http://www.w3.org/2005/Atom'}
    for entry in root.findall('.//a:entry', atom)[:60]:
        links = entry.findall('a:link', atom)
        link = next((el.get('href', '') for el in links if el.get('rel', 'alternate') == 'alternate'), '')
        item = make_item(source, entry.findtext('a:title', default='', namespaces=atom),
                         urljoin(url, link), entry.findtext('a:published', default='', namespaces=atom)
                         or entry.findtext('a:updated', default='', namespaces=atom))
        if item:
            result.append(item)
    if not result:
        raise ValueError('Resposta XML válida, mas sem itens RSS/Atom reconhecidos')
    return result


class STFLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.href = None
        self.text = []
        self.items = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.href = dict(attrs).get('href')
            self.text = []

    def handle_data(self, data):
        if self.href is not None:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag != 'a':
            return
        if self.href:
            title = clean(' '.join(self.text))
            url = urljoin(STF_PAGE, self.href)
            if re.search(r'informativo', title, re.I) or re.search(r'informativo[_/-]?stf[_/-]?\d+', url, re.I):
                item = make_item('STF', title or 'Informativo STF', url)
                if item:
                    self.items.append(item)
        self.href = None
        self.text = []


def collect_stf() -> list[dict]:
    raw, _ = fetch(STF_PAGE)
    parser = STFLinks()
    parser.feed(raw.decode('utf-8', errors='replace'))
    if not parser.items:
        raise ValueError('Nenhum link de informativo encontrado; conferir página e seletores')
    return parser.items[:50]


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    old = {}
    if OUTPUT.exists():
        try:
            old = json.loads(OUTPUT.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError) as exc:
            print(f'AVISO: histórico anterior ilegível: {exc}')
    previous = [x for x in old.get('items', []) if isinstance(x, dict) and valid_url(x.get('url', ''))]
    indexed = {x['url']: x for x in previous}
    errors, statuses = [], []
    current_count = 0
    for source, urls in FEEDS.items():
        for url in urls:
            try:
                items = parse_feed(source, url)
                current_count += len(items)
                for item in items:
                    indexed[item['url']] = {**indexed.get(item['url'], {}), **item}
                statuses.append({'source': source, 'url': url, 'status': 'ok', 'count': len(items)})
            except (urllib.error.URLError, TimeoutError, ValueError, ET.ParseError, OSError) as exc:
                errors.append({'source': source, 'url': url, 'message': str(exc)[:250]})
                statuses.append({'source': source, 'url': url, 'status': 'error', 'count': 0})
    try:
        items = collect_stf()
        current_count += len(items)
        for item in items:
            indexed[item['url']] = {**indexed.get(item['url'], {}), **item}
        statuses.append({'source': 'STF', 'url': STF_PAGE, 'status': 'ok', 'count': len(items)})
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
        errors.append({'source': 'STF', 'url': STF_PAGE, 'message': str(exc)[:250]})
        statuses.append({'source': 'STF', 'url': STF_PAGE, 'status': 'error', 'count': 0})

    # Novos itens primeiro; o histórico antigo permanece disponível.
    fresh = [x for x in indexed.values() if x['url'] not in {p['url'] for p in previous}]
    old_items = [indexed[x['url']] for x in previous if x['url'] in indexed]
    items = (fresh + old_items)[:MAX_ITEMS]
    payload = {
        'schema_version': 2,
        'updated_at': dt.datetime.now(dt.timezone.utc).isoformat(),
        'items': items,
        'sources_status': statuses,
        'errors': errors,
        'stats': {'fetched': current_count, 'stored': len(items), 'failed_sources': len(errors)},
    }
    temporary = OUTPUT.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, OUTPUT)
    print(f"Collected {current_count}; stored {len(items)}; source errors {len(errors)}")


if __name__ == '__main__':
    main()
