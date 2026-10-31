#!/usr/bin/env python3
"""
Migración única: exportaciones de eXeLearning 4 (content.xml) → formato propio.

Uso:
    python3 -I migrar.py <copia_web> <carpeta_forms> <salida_repo>

<copia_web>     réplica de economiabach.netlify.app (index.html, unidades/, materiales/)
<carpeta_forms> HTML descargados de los Google Forms incrustados
<salida_repo>   raíz del repositorio (se escriben contenido/ y materiales/)

No hace falta volver a ejecutarlo: el contenido ya vive en contenido/.
Se conserva como registro de cómo se hizo la conversión.
"""
import glob
import html as htmlmod
import json
import os
import re
import shutil
import sys
import unicodedata
import xml.etree.ElementTree as ET

import yaml
from bs4 import BeautifulSoup, NavigableString, Tag
from PIL import Image

MIRROR, FORMS, OUT = sys.argv[1:4]
HERE = os.path.dirname(os.path.abspath(__file__))
N = '{http://www.intef.es/xsd/ode}'

informe = []  # incidencias para INFORME-MIGRACION.md


def log(msg):
    informe.append(msg)
    print(msg)


# ───────────────────────── utilidades ─────────────────────────

def slug(s, maxlen=48):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')
    return s[:maxlen].rstrip('-')


def props(e, tag):
    if e is None:
        return {}
    return {p.find(N + 'key').text: (p.find(N + 'value').text or '') for p in e.iter(N + tag)}


class Literal(str):
    pass


def _lit(dumper, data):
    return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')


yaml.add_representer(Literal, _lit, Dumper=yaml.SafeDumper)


def ydump(obj):
    return yaml.safe_dump(obj, allow_unicode=True, sort_keys=False, width=1000).rstrip()


def norm_style(st):
    return re.sub(r'\s+', '', (st or '').lower())


# ───────────────────── HTML → Markdown ─────────────────────

BLOCK_TAGS = {'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'iframe',
              'blockquote', 'hr', 'rubrica', 'figure', 'section', 'article'}


def esc_text(t):
    t = t.replace('\\', '\\\\').replace('*', '\\*').replace('_', '\\_').replace('`', '\\`')
    t = t.replace('<', '&lt;').replace('[', '\\[').replace(']', '\\]')
    return t


def wrap_emph(inner, mark):
    if not inner.strip():
        return inner
    lead = inner[:len(inner) - len(inner.lstrip())]
    trail = inner[len(inner.rstrip()):]
    return f'{lead}{mark}{inner.strip()}{mark}{trail}'


def inline(node):
    out = []
    for ch in node.children:
        if isinstance(ch, NavigableString):
            if ch.__class__.__name__ == 'Comment':
                continue
            out.append(esc_text(re.sub(r'\s+', ' ', str(ch))))
        elif isinstance(ch, Tag):
            n = ch.name
            if n in ('b', 'strong'):
                out.append(wrap_emph(inline(ch), '**'))
            elif n in ('i', 'em'):
                out.append(wrap_emph(inline(ch), '*'))
            elif n == 'a':
                href = ch.get('href', '')
                txt = inline(ch).strip() or href
                out.append(f'[{txt}]({href})' if href else txt)
            elif n == 'br':
                out.append('<br>')
            elif n == 'img':
                out.append(f'![{ch.get("alt", "")}]({ch.get("src", "")})')
            elif n == 'code':
                out.append('`' + ch.get_text() + '`')
            elif n in ('sup', 'sub', 'u', 'mark', 'small'):
                out.append(f'<{n}>{inline(ch)}</{n}>')
            else:
                out.append(inline(ch))
    s = ''.join(out)
    s = re.sub(r'\*\*\s*\*\*', '', s)
    return s


def block_start_escape(s):
    s = s.lstrip()
    s = re.sub(r'^(\d+)\.(\s)', r'\1\\.\2', s)
    s = re.sub(r'^([#>+\-=])', r'\\\1', s)
    return s


def clean_html_fragment(tag):
    """Copia limpia de un fragmento (tablas): sin style/class, con anchura de columna."""
    t = BeautifulSoup(str(tag), 'html.parser')
    for el in t.find_all(True):
        st = norm_style(el.get('style'))
        attrs = {}
        if el.name in ('th', 'td'):
            m = re.search(r'width:(\d+%)', st)
            if m and el.name == 'th':
                attrs['width'] = m.group(1)
            for a in ('colspan', 'rowspan'):
                if el.get(a):
                    attrs[a] = el.get(a)
        if el.name == 'a':
            attrs['href'] = el.get('href', '')
            if el.get('target'):
                attrs['target'] = '_blank'
                attrs['rel'] = 'noopener'
        if el.name == 'img':
            for a in ('src', 'alt'):
                attrs[a] = el.get(a, '')
        el.attrs = attrs
    s = str(t)
    s = re.sub(r'>\s+<', '><', s)
    s = re.sub(r'\n\s*', ' ', s)
    return s


CALLOUTS = [  # (color borde, fondo) → tipo
    ('#c1694a', 'aviso'),
    ('#1b4b66;background:#eef4f7', 'nota'),
    ('#1b4b66;background:#fdf3ec', 'idea'),
    ('#1b4b66', 'nota'),
]


def callout_kind(st):
    if 'border-left' not in st:
        return None
    for key, kind in CALLOUTS:
        if key in st:
            return kind
    return 'nota'


def is_title_p(el):
    if not (isinstance(el, Tag) and el.name == 'p') or el.find('iframe'):
        return False
    st = norm_style(el.get('style'))
    return ('font-weight:700' in st or 'font-weight:bold' in st) and 'margin:006px' in st


class Ctx:
    def __init__(self, unit, page_title, block_name, session):
        self.unit = unit
        self.page_title = page_title
        self.block_name = block_name
        self.session = session


def blocks(node, ctx, depth=0):
    """Devuelve lista de bloques Markdown para los hijos de node."""
    out, buf = [], []

    def flush():
        if buf:
            txt = ''.join(buf).strip()
            if txt:
                out.append(block_start_escape(txt))
            buf.clear()

    for ch in node.children:
        if isinstance(ch, NavigableString):
            if ch.__class__.__name__ == 'Comment':
                continue
            if str(ch).strip():
                buf.append(esc_text(re.sub(r'\s+', ' ', str(ch))))
            continue
        if not isinstance(ch, Tag):
            continue
        if ch.name not in BLOCK_TAGS:
            tmp = BeautifulSoup('<span></span>', 'html.parser').span
            tmp.append(ch.__copy__())
            buf.append(inline(tmp))
            continue
        flush()
        out.extend(block_el(ch, ctx, depth))
    flush()
    return [b for b in out if b and b.strip()]


def block_el(el, ctx, depth):
    n = el.name
    st = norm_style(el.get('style'))
    if n == 'rubrica':
        return ['```rubrica\n' + el['data-criterio'] + '\n```']
    if n in ('h1', 'h2', 'h3'):
        return ['### ' + inline(el).strip()]
    if n in ('h4', 'h5', 'h6'):
        return ['#### ' + inline(el).strip()]
    if n == 'hr':
        return ['***']
    if n == 'iframe':
        return iframe_block(el, ctx)
    if n == 'table':
        return [clean_html_fragment(el)]
    if n in ('ul', 'ol'):
        return [list_md(el, 0)]
    if n == 'blockquote':
        inner = '\n\n'.join(blocks(el, ctx, depth))
        return ['\n'.join('> ' + l if l else '>' for l in inner.split('\n'))]
    if n == 'p':
        if el.find('iframe'):
            return blocks(el, ctx, depth)
        txt = inline(el).strip()
        if not txt or txt == '&nbsp;':
            return []
        if 'margin:26px06px' in st and ('font-weight:700' in st or 'font-weight:bold' in st):
            return ['#### ' + txt]
        if 'font-style:italic' in st:
            return [wrap_emph(txt, '*')]
        if is_title_p(el):
            return ['**' + txt.strip('*') + '**']
        return [block_start_escape(txt)]
    if n == 'div' or n in ('section', 'article', 'figure'):
        kind = callout_kind(st)
        if kind:
            kids = [c for c in el.children if isinstance(c, Tag) or str(c).strip()]
            title = ''
            if kids and is_title_p(kids[0]):
                title = inline(kids[0]).strip()
                kids[0].extract()
            inner = blocks(el, ctx, depth + 1)
            fence = ':' * (3 + max(0, nested_callouts(el)))
            head = f'{fence} {kind}' + (f' {title}' if title else '')
            return [head + '\n' + '\n\n'.join(inner) + '\n' + fence]
        if 'iframe-error-message' in (el.get('class') or []):
            return []
        return blocks(el, ctx, depth)
    return blocks(el, ctx, depth)


def nested_callouts(el):
    d = 0
    for sub in el.find_all('div'):
        if callout_kind(norm_style(sub.get('style'))):
            d = 1
    return d


def list_md(el, level):
    lines = []
    ordered = el.name == 'ol'
    i = 1
    for li in el.find_all('li', recursive=False):
        sublists = [c for c in li.children if isinstance(c, Tag) and c.name in ('ul', 'ol')]
        for s in sublists:
            s.extract()
        # párrafos dentro del li → unir con <br>
        parts = []
        for c in li.children:
            if isinstance(c, Tag) and c.name == 'p':
                parts.append(inline(c).strip())
            else:
                tmp = BeautifulSoup('<span></span>', 'html.parser').span
                tmp.append(c.__copy__() if isinstance(c, Tag) else NavigableString(str(c)))
                t = inline(tmp)
                if t.strip():
                    parts.append(t.strip())
        text = ' '.join(p for p in parts if p)
        marker = f'{i}.' if ordered else '-'
        indent = '   ' * level
        lines.append(f'{indent}{marker} {text}')
        for s in sublists:
            lines.append(list_md(s, level + 1))
        i += 1
    return '\n'.join(lines)


# ───────────────────── Google Forms ─────────────────────

def load_forms():
    forms = {}
    for f in glob.glob(os.path.join(FORMS, '*.html')):
        s = open(f, encoding='utf-8').read()
        m = re.search(r'FB_PUBLIC_LOAD_DATA_ = (.*?);</script>', s, re.S)
        if not m:
            continue
        d = json.loads(m.group(1))
        fid = os.path.basename(f)[:-5]
        forms[fid] = {'id': fid, 'title': d[3], 'desc': d[1][0], 'items': d[1][1] or []}
    return forms


FORMS_DATA = load_forms()
CLAVES = yaml.safe_load(open(os.path.join(HERE, 'claves.yml'), encoding='utf-8'))


def find_form(pred):
    hits = [f for f in FORMS_DATA.values() if pred(f['title'])]
    return hits[0] if hits else None


def iframe_block(el, ctx):
    src = el.get('src', '')
    if 'youtube.com' in src or 'youtu.be' in src:
        return ['```video\n' + src.split('?')[0] + '\n```']
    if 'docs.google.com/forms' not in src:
        return [f'<iframe src="{src}" loading="lazy" title="Contenido externo"></iframe>']
    m = re.search(r'/d/e/([^/]+)/', src)
    embedded = FORMS_DATA.get(m.group(1)) if m else None
    n = ctx.unit['n']
    bname = ctx.block_name.lower()
    if 'práctica docente' in bname:
        form = find_form(lambda t: t.startswith(f'SdA {n} ·') and 'práctica docente' in t)
        kind = 'docente'
    elif bname.startswith('autoevaluaci'):
        form = find_form(lambda t: t == f'SdA {n} · Autoevaluación de cierre')
        kind = 'autoeval'
    else:
        form = find_form(lambda t: t.startswith(f'SdA {n} · S{ctx.session} ·'))
        kind = 'quiz'
    where = f'SdA {n} · {ctx.page_title} · «{ctx.block_name}»'
    if embedded and form and embedded['id'] != form['id']:
        log(f'- {where}: incrustaba «{embedded["title"]}» → corregido a «{form["title"]}».')
    if not form:
        log(f'- ⚠️ {where}: no se encontró el formulario que corresponde (incrustado: «{embedded and embedded["title"]}»).')
        return [f'<!-- formulario no localizado: {src} -->']

    if kind == 'docente':
        url = f'https://docs.google.com/forms/d/e/{form["id"]}/viewform'
        return ['```enlace-anonimo\n' + ydump({
            'url': url,
            'texto': 'Abrir el cuestionario anónimo',
            'nota': 'Este cuestionario es anónimo: se abre fuera de la plataforma y no guarda tu nombre.',
        }) + '\n```']

    if kind == 'autoeval':
        return ['```actividad\n' + ydump({
            'id': f'{ctx.unit["carpeta"]}-autoevaluacion',
            'tipo': 'autoevaluacion',
            'titulo': 'Autoevaluación de cierre',
            'instrucciones': 'Sitúate en un nivel de cada rúbrica y justifícalo con una **evidencia concreta** de tu propio trabajo. Termina con un aspecto de mejora: concreto, «estudiar más» no vale.',
            'criterios': [r['criterio'] for r in ctx.unit.get('rubricas', [])],
            'mejora': True,
        }) + '\n```']

    # cuestionario de sesión → verdadero/falso puntuable
    key = f'{ctx.unit["carpeta"]}-s{int(ctx.session):02d}'
    claves = CLAVES.get(key, [])
    preguntas = []
    qs = [it for it in form['items'] if it[3] == 2]
    if len(claves) != len(qs):
        log(f'- ⚠️ {key}: {len(qs)} preguntas y {len(claves)} claves.')
    for i, it in enumerate(qs):
        v, exp = (claves[i] if i < len(claves) else (None, ''))
        preguntas.append({
            'enunciado': it[1],
            'respuesta': {'V': 'verdadero', 'F': 'falso'}.get(v),
            'explicacion': exp,
        })
    return ['```actividad\n' + ydump({
        'id': key + '-cuestionario',
        'tipo': 'verdadero-falso',
        'titulo': f'Cuestionario de la sesión {ctx.session}',
        'puntua': True,
        'revisar': True,
        'instrucciones': 'Decide si cada afirmación es verdadera o falsa. Al corregir verás tu puntuación y la explicación de cada respuesta.',
        'preguntas': preguntas,
    }) + '\n```']


# ───────────────────── componentes eXe ─────────────────────

def image_out(unit, src_rel):
    """Convierte una imagen de recursos a WebP en contenido/<sda>/img/. Devuelve nombre."""
    name = os.path.basename(src_rel)
    src = os.path.join(MIRROR, 'unidades', unit['carpeta'], 'content', 'resources', name)
    base, _ = os.path.splitext(name)
    dst_dir = os.path.join(OUT, 'contenido', unit['carpeta'], 'img')
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, base + '.webp')
    if not os.path.exists(dst):
        im = Image.open(src)
        im = im.convert('RGBA') if im.mode in ('P', 'LA') else im
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=82, method=6)
    return base + '.webp'


def gallery_md(unit, comp):
    j = json.loads(comp.find(N + 'jsonProperties').text or '{}')
    lines = []
    for k in sorted([k for k in j if k.startswith('img_')], key=lambda k: int(k[4:])):
        im = j[k]
        fn = image_out(unit, im['img'].replace('{{context_path}}/', ''))
        lines.append(f'{fn} | {im.get("title", "").strip()}')
    return '```diapositivas\n' + '\n'.join(lines) + '\n```'


def tf_md(unit, comp, ctx, idx):
    j = json.loads(comp.find(N + 'jsonProperties').text or '{}')
    instr = BeautifulSoup(j.get('trueorfalseInstructionsTextarea', ''), 'html.parser')
    preguntas = []
    for q in j.get('questions', []):
        preguntas.append({
            'enunciado': inline(BeautifulSoup(q['question'], 'html.parser')).strip(),
            'respuesta': 'verdadero' if q['answer'] == 'true' else 'falso',
            'explicacion': inline(BeautifulSoup(q.get('feedback', ''), 'html.parser')).strip(),
        })
    return '```actividad\n' + ydump({
        'id': f'{unit["carpeta"]}-s{int(ctx.session or 0):02d}-repaso{idx}',
        'tipo': 'verdadero-falso',
        'titulo': 'Comprueba lo que sabes',
        'puntua': False,
        'instrucciones': ' '.join(blocks(instr, ctx)).strip(),
        'preguntas': preguntas,
    }) + '\n```'


RUB_LEVELS = ['Insuficiente', 'Suficiente', 'Bien', 'Notable', 'Sobresaliente']


def extract_rubrics(soup, unit):
    """Sustituye cada rúbrica (Criterio X.Y + descripción + 2 tablas) por <rubrica>."""
    found = []
    for p in soup.find_all('p'):
        m = re.fullmatch(r'\s*Criterio\s+(\d+\.\d+)\s*', p.get_text())
        if not m:
            continue
        sib = [s for s in p.next_siblings if isinstance(s, Tag)][:3]
        if len(sib) < 3 or sib[0].name != 'p' or sib[1].name != 'table' or sib[2].name != 'table':
            continue
        t1 = [td.get_text(' ', strip=True) for td in sib[1].find_all('td')]
        niveles = []
        for tr in sib[2].find('tbody').find_all('tr'):
            tds = tr.find_all('td')
            if len(tds) != 2:
                continue
            lab = tds[0].get_text(' ', strip=True)
            mm = re.match(r'(\w+)\s*\(([^)]*)\)', lab)
            niveles.append({'nivel': mm.group(1) if mm else lab,
                            'notas': mm.group(2) if mm else '',
                            'descriptor': tds[1].get_text(' ', strip=True)})
        rub = {'criterio': m.group(1), 'descripcion': sib[0].get_text(' ', strip=True),
               'competencia': t1[0] if t1 else '', 'saberes': t1[1] if len(t1) > 1 else '',
               'descriptores': t1[2] if len(t1) > 2 else '', 'niveles': niveles}
        found.append(rub)
        new = soup.new_tag('rubrica')
        new['data-criterio'] = m.group(1)
        p.insert_before(new)
        for s in [p] + sib:
            s.extract()
    return found


def component_md(unit, comp, ctx, counters):
    t = comp.find(N + 'odeIdeviceTypeName').text
    h = comp.find(N + 'htmlView').text or ''
    if t == 'image-gallery':
        return gallery_md(unit, comp)
    if t == 'trueorfalse':
        counters['tf'] += 1
        return tf_md(unit, comp, ctx, counters['tf'] if counters['tf'] > 1 else '')
    soup = BeautifulSoup(h, 'html.parser')
    for d in soup.select('.iframe-error-message'):
        d.decompose()
    rubs = extract_rubrics(soup, unit)
    for r in rubs:
        if r['criterio'] not in [x['criterio'] for x in unit['rubricas']]:
            unit['rubricas'].append(r)
    return '\n\n'.join(blocks(soup, ctx))


# ───────────────────── unidades ─────────────────────

def parse_index():
    s = open(os.path.join(MIRROR, 'index.html'), encoding='utf-8').read()
    arr = s[s.find('const UNIDADES = ['):s.find('];', s.find('const UNIDADES = ['))]
    units = []
    for obj in re.findall(r'\{(.*?)\}\s*,?\s*(?=\{|$)', arr, re.S):
        u = {}
        for k, v in re.findall(r'(\w+)\s*:\s*("(?:[^"\\]|\\.)*"|\d+)', obj):
            u[k] = int(v) if v.isdigit() else json.loads(v)
        if 'n' in u:
            units.append(u)
    return units


def convert_unit(meta):
    carpeta = meta['carpeta']
    r = ET.parse(os.path.join(MIRROR, 'unidades', carpeta, 'content.xml')).getroot()
    pp = props(r.find(N + 'odeProperties'), 'odeProperty')
    unit = {
        'n': meta['n'], 'carpeta': carpeta, 'titulo': meta['titulo'],
        'titulo_largo': pp.get('pp_title', ''), 'descripcion': pp.get('pp_description', ''),
        'autor': pp.get('pp_author', ''), 'trimestre': meta['tri'], 'sesiones': meta['ses'],
        'producto': meta['producto'], 'ce': meta['ce'], 'criterios': meta['criterios'],
        'saberes': meta['saberes'], 'referente': meta['referente'], 'interdisciplinar': meta['inter'],
        'temas': meta['temas'], 'rubricas': [],
    }
    navs = list(r.iter(N + 'odeNavStructure'))
    root = [p for p in navs if not p.find(N + 'odeParentPageId').text][0]
    rid = root.find(N + 'odePageId').text
    kids = [p for p in navs if p.find(N + 'odeParentPageId').text == rid]
    kids.sort(key=lambda p: int(p.find(N + 'odeNavStructureOrder').text or 0))
    deeper = [p for p in navs if p is not root and p not in kids]
    if deeper:
        log(f'- ⚠️ {carpeta}: {len(deeper)} páginas de tercer nivel no migradas.')
    ordered = [root] + kids

    outdir = os.path.join(OUT, 'contenido', carpeta)
    os.makedirs(outdir, exist_ok=True)
    # primero el bloque de rúbricas (para que la autoevaluación conozca los criterios)
    pages_md = []
    for idx, nav in enumerate(ordered):
        ptitle = nav.find(N + 'pageName').text.strip()
        ms = re.match(r'Sesi[oó]n\s+(\d+)', ptitle)
        session = int(ms.group(1)) if ms else None
        pages_md.append((idx, nav, ptitle, session))

    def render_page(nav, ptitle, session):
        parts = []
        counters = {'tf': 0}
        blocks_ = list(nav.iter(N + 'odePagStructure'))
        blocks_.sort(key=lambda b: int(b.find(N + 'odePagStructureOrder').text or 0))
        for b in blocks_:
            bname = (b.find(N + 'blockName').text or '').strip()
            bp = props(b.find(N + 'odePagStructureProperties'), 'odePagStructureProperty')
            if bp.get('visibility') == 'false':
                log(f'- {carpeta} · {ptitle}: bloque oculto «{bname}» omitido.')
                continue
            attrs = []
            if bp.get('teacherOnly') == 'true':
                attrs.append('.docente')
            if bp.get('minimized') == 'true':
                attrs.append('.plegado')
            ctx = Ctx(unit, ptitle, bname, session)
            comps = list(b.iter(N + 'odeComponent'))
            comps.sort(key=lambda c: int(c.find(N + 'odeComponentsOrder').text or 0))
            body = []
            for c in comps:
                cp = props(c.find(N + 'odeComponentsProperties'), 'odeComponentsProperty')
                if cp.get('visibility') == 'false':
                    continue
                md = component_md(unit, c, ctx, counters)
                if md.strip():
                    body.append(md)
            head = f'## {bname or "Sin título"}' + (' {' + ' '.join(attrs) + '}' if attrs else '')
            parts.append(head + '\n\n' + '\n\n'.join(body))
        return parts

    # pasada 1: páginas sin formularios de autoevaluación resueltos todavía → extraemos rúbricas
    rendered = {}
    for idx, nav, ptitle, session in pages_md:
        rendered[idx] = render_page(nav, ptitle, session)
    # si la autoevaluación se generó antes de conocer las rúbricas, volvemos a generar
    if any('criterios: []' in '\n'.join(p) for p in rendered.values()):
        for idx, nav, ptitle, session in pages_md:
            rendered[idx] = render_page(nav, ptitle, session)

    files = []
    for idx, nav, ptitle, session in pages_md:
        name = '00-presentacion.md' if idx == 0 else f'{idx:02d}-{slug(ptitle)}.md'
        fm = ydump({'titulo': ptitle})
        content = f'---\n{fm}\n---\n\n' + '\n\n'.join(rendered[idx]) + '\n'
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r'(\*\*?) ([,.;:)])', r'\1\2', content)
        open(os.path.join(outdir, name), 'w', encoding='utf-8').write(content)
        files.append(name)

    with open(os.path.join(outdir, 'unidad.yml'), 'w', encoding='utf-8') as f:
        f.write('# Datos de la unidad. Las páginas son los .md de esta carpeta, en orden alfabético.\n')
        f.write(ydump(unit) + '\n')
    log(f'- {carpeta}: {len(files)} páginas, {len(unit["rubricas"])} rúbricas.')
    return unit


def main():
    units = parse_index()
    assert len(units) == 12, len(units)
    log('## Incidencias de la migración\n')
    for meta in units:
        # sesión = número de la página; para el formulario por sesión
        convert_unit(meta)
    # materiales
    mdst = os.path.join(OUT, 'materiales')
    os.makedirs(mdst, exist_ok=True)
    for f in glob.glob(os.path.join(MIRROR, 'materiales', '*')):
        shutil.copy2(f, mdst)
    with open(os.path.join(OUT, 'INFORME-MIGRACION.md'), 'w', encoding='utf-8') as f:
        f.write('# Informe de la migración desde eXeLearning\n\n' + '\n'.join(informe) + '\n')


if __name__ == '__main__':
    main()
