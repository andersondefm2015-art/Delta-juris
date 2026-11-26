import json
import re
import hashlib
import unicodedata
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "data" / "questoes"
SAIDA = ROOT / "data" / "auditoria" / "relatorio.json"

BANCAS = {
    "CEBRASPE": 2,
    "FGV": 5,
    "FCC": 5,
    "FUNDATEC": 5
}

NIVEIS = [
    "Básico",
    "Intermediário",
    "Difícil",
    "Muito difícil",
    "Especialista"
]

STATUS = [
    "pendente_verificacao",
    "validada",
    "desatualizada",
    "arquivada"
]

TIPOS = [
    "legislacao",
    "jurisprudencia",
    "sumula",
    "sumula_vinculante",
    "repercussao_geral",
    "repetitivo",
    "informativo",
    "doutrina",
    "misto"
]

CAMPOS = [
    "id", "title", "disc", "topic",
    "subtopic", "contentType", "bank",
    "careers", "difficulty", "prompt",
    "opts", "right", "comment",
    "optionComments", "legalBasis",
    "reference", "sources", "status",
    "reviewedAt"
]

erros = []
avisos = []
registros = []
arquivos = []
ids = Counter()
enunciados = {}


def texto(v):
    return isinstance(v, str) and bool(v.strip())


def normalizar(v):
    v = unicodedata.normalize("NFKD", str(v))
    v = "".join(
        c for c in v
        if not unicodedata.combining(c)
    )
    return re.sub(r"\W+", " ", v.lower()).strip()


def carregar(p):
    return json.loads(
        p.read_text(encoding="utf-8-sig")
    )


def registrar(lista, codigo, arquivo, qid, msg):
    lista.append({
        "codigo": codigo,
        "arquivo": arquivo,
        "questao": qid,
        "mensagem": msg
    })


def oficial(url):
    try:
        p = urlparse(url)
        host = p.hostname or ""
        dominios = [
            "gov.br", "jus.br", "leg.br",
            "mp.br", "def.br"
        ]
        return (
            p.scheme == "https"
            and not p.username
            and not p.password
            and any(
                host == d or host.endswith("." + d)
                for d in dominios
            )
        )
    except Exception:
        return False


def data_valida(v):
    try:
        d = datetime.fromisoformat(
            v.replace("Z", "+00:00")
        )
        return d.date() <= datetime.now(
            timezone.utc
        ).date()
    except Exception:
        return False


def auditar(q, arquivo, disc, pos, carreiras):
    if not isinstance(q, dict):
        registrar(
            erros, "QUESTAO_INVALIDA",
            arquivo, str(pos),
            "Questao deve ser objeto JSON."
        )
        return

    qid = q.get("id")
    if not texto(qid):
        qid = f"{arquivo}-{pos}"

    inicio = len(erros)
    inicio_avisos = len(avisos)

    def erro(codigo, msg):
        registrar(erros, codigo, arquivo, qid, msg)

    def aviso(codigo, msg):
        registrar(avisos, codigo, arquivo, qid, msg)

    for campo in CAMPOS:
        if campo not in q:
            erro("CAMPO_AUSENTE", campo)

    for campo in [
        "id", "title", "disc", "topic",
        "subtopic", "prompt", "comment",
        "legalBasis", "reference"
    ]:
        if not texto(q.get(campo)):
            erro("TEXTO_INVALIDO", campo)

    ids[qid] += 1

    if ids[qid] > 1:
        erro("ID_DUPLICADO", qid)

    if q.get("disc") != disc:
        erro(
            "DISCIPLINA_INCORRETA",
            f"Esperada: {disc}"
        )

    banca = str(q.get("bank", ""))
    nivel = str(q.get("difficulty", ""))
    tipo = str(q.get("contentType", ""))
    status = str(q.get("status", ""))

    if banca not in BANCAS:
        erro("BANCA_INVALIDA", banca)

    if nivel not in NIVEIS:
        erro("NIVEL_INVALIDO", nivel)

    if tipo not in TIPOS:
        erro("CONTEUDO_INVALIDO", tipo)

    if status not in STATUS:
        erro("STATUS_INVALIDO", status)

    cs = q.get("careers")

    if not isinstance(cs, list) or not cs:
        erro(
            "CARREIRAS_INVALIDAS",
            "Informar carreiras."
        )
    else:
        for c in cs:
            if not texto(c) or (
                carreiras and c not in carreiras
            ):
                erro("CARREIRA_INVALIDA", str(c))

    opts = q.get("opts")

    if not isinstance(opts, list):
        erro(
            "ALTERNATIVAS_INVALIDAS",
            "Alternativas devem ser lista."
        )
        opts = []

    if len(opts) != BANCAS.get(banca, -1):
        erro(
            "QUANTIDADE_ALTERNATIVAS",
            "Quantidade incorreta para a banca."
        )

    if any(not texto(o) for o in opts):
        erro(
            "ALTERNATIVA_VAZIA",
            "Alternativa invalida."
        )

    if len(set(map(normalizar, opts))) != len(opts):
        erro(
            "ALTERNATIVAS_DUPLICADAS",
            "Alternativas repetidas."
        )

    if banca == "CEBRASPE":
        if opts != ["Certo", "Errado"]:
            erro(
                "FORMATO_CEBRASPE",
                "Usar Certo e Errado."
            )

    right = q.get("right")

    if type(right) is not int or not (
        0 <= right < len(opts)
    ):
        erro(
            "GABARITO_INVALIDO",
            "Indice fora das alternativas."
        )

    comentarios = q.get("optionComments")

    if (
        not isinstance(comentarios, list)
        or len(comentarios) != len(opts)
        or any(not texto(c) for c in comentarios)
    ):
        erro(
            "COMENTARIOS_INVALIDOS",
            "Conferir comentarios das alternativas."
        )

    fontes = q.get("sources")

    if not isinstance(fontes, list) or not fontes:
        erro(
            "FONTES_AUSENTES",
            "Informar fontes oficiais."
        )
    else:
        for f in fontes:
            if (
                not isinstance(f, dict)
                or not texto(f.get("title"))
                or not oficial(f.get("url"))
            ):
                erro(
                    "FONTE_INVALIDA",
                    "Conferir titulo e URL oficial."
                )

    tribunal = q.get("court", "")

    if tribunal not in ("", "STF", "STJ"):
        erro(
            "TRIBUNAL_INVALIDO",
            str(tribunal)
        )

    if tipo in ["sumula", "sumula_vinculante"]:
        if (
            not str(q.get("sumula", "")).isdigit()
            or tribunal not in ("STF", "STJ")
        ):
            erro(
                "SUMULA_INCOMPLETA",
                "Conferir numero e tribunal."
            )

        if tipo == "sumula_vinculante" and tribunal != "STF":
            erro(
                "SUMULA_VINCULANTE_INVALIDA",
                "Tribunal deve ser STF."
            )

    if tipo in [
        "jurisprudencia", "repetitivo",
        "repercussao_geral", "informativo"
    ]:
        if not any(
            texto(q.get(c))
            for c in [
                "precedent", "tema", "informativo"
            ]
        ):
            aviso(
                "PRECEDENTE_GENERICO",
                "Individualizar precedente."
            )

    if status == "validada":
        if not data_valida(q.get("reviewedAt")):
            erro(
                "DATA_INVALIDA",
                "Validacao sem data correta."
            )

    if status == "pendente_verificacao":
        if q.get("reviewedAt") is not None:
            aviso(
                "DATA_EM_PENDENTE",
                "Conferir data de revisao."
            )

    chave = normalizar(q.get("prompt", ""))

    if chave:
        if chave in enunciados:
            aviso(
                "ENUNCIADO_REPETIDO",
                enunciados[chave]
            )
        else:
            enunciados[chave] = qid

    if not texto(q.get("trap")):
        aviso(
            "SEM_PEGADINHA",
            "Inserir alerta de pegadinha."
        )

    registros.append({
        "id": qid,
        "arquivo": arquivo,
        "disciplina": disc,
        "banca": banca,
        "dificuldade": nivel,
        "conteudo": tipo,
        "status": status,
        "gabarito": right,
        "erros": len(erros) - inicio,
        "avisos": len(avisos) - inicio_avisos
    })


def executar():
    print("DELTA JURIS 4.0")
    print("Iniciando auditoria tecnica...")

    disciplinas = []
    carreiras = set()

    try:
        manifesto = carregar(
            BASE / "manifest.json"
        )

        disciplinas = manifesto["disciplines"]

        if not isinstance(disciplinas, list):
            raise ValueError("Disciplinas invalidas.")

        carreiras = {
            c for c in manifesto.get("careers", [])
            if isinstance(c, str)
        }

    except Exception as exc:
        registrar(
            erros, "MANIFESTO_INVALIDO",
            "manifest.json", "", str(exc)
        )
        disciplinas = []

    vistos = set()

    for d in disciplinas:
        if not isinstance(d, dict):
            registrar(
                erros, "DISCIPLINA_INVALIDA",
                "manifest.json", "", "Entrada invalida."
            )
            continue

        if d.get("enabled") is not True:
            continue

        nome = d.get("name", "")
        arquivo = d.get("file", "")

        if (
            not texto(nome)
            or not texto(arquivo)
            or not re.fullmatch(
                r"[a-z0-9_-]+\.json", arquivo
            )
            or arquivo == "manifest.json"
            or arquivo in vistos
        ):
            registrar(
                erros, "ARQUIVO_INVALIDO",
                "manifest.json", "",
                str(arquivo)
            )
            continue

        vistos.add(arquivo)
        caminho = BASE / arquivo

        info = {
            "disciplina": nome,
            "arquivo": arquivo,
            "total": 0,
            "situacao": "pendente",
            "sha256": None
        }

        arquivos.append(info)

        if not caminho.is_file():
            info["situacao"] = "ausente"
            registrar(
                avisos, "ARQUIVO_AUSENTE",
                arquivo, "",
                "Arquivo ainda nao criado."
            )
            continue

        try:
            dados = carregar(caminho)

            if not isinstance(dados, list):
                raise ValueError(
                    "Banco deve ser lista JSON."
                )

            info["total"] = len(dados)
            info["situacao"] = (
                "carregado" if dados else "vazio"
            )

            info["sha256"] = hashlib.sha256(
                caminho.read_bytes()
            ).hexdigest()

            for pos, q in enumerate(dados, 1):
                auditar(
                    q, arquivo, nome, pos, carreiras
                )

        except Exception as exc:
            info["situacao"] = "erro"
            registrar(
                erros, "ERRO_CARREGAMENTO",
                arquivo, "", str(exc)
            )

    for r in registros:
        r["aprovacao_tecnica"] = (
            r["erros"] == 0
            and ids[r["id"]] == 1
        )

    def contar(campo):
        return dict(Counter(
            r[campo] for r in registros
        ))

    total = sum(a["total"] for a in arquivos)

    aprovadas = sum(
        r["aprovacao_tecnica"]
        for r in registros
    )

    status = contar("status")

    relatorio = {
        "projeto": "Delta Juris 4.0",
        "auditor": "1.0.1",
        "executado_em": datetime.now(
            timezone.utc
        ).isoformat(),
        "resultado": (
            "erros_encontrados" if erros
            else "aprovado_com_avisos" if avisos
            else "aprovado_tecnicamente"
        ),
        "resumo": {
            "total_questoes": total,
            "aprovadas_tecnicamente": aprovadas,
            "reprovadas_tecnicamente": total - aprovadas,
            "validadas_editorialmente": status.get(
                "validada", 0
            ),
            "pendentes": status.get(
                "pendente_verificacao", 0
            ),
            "desatualizadas": status.get(
                "desatualizada", 0
            ),
            "arquivadas": status.get(
                "arquivada", 0
            ),
            "erros": len(erros),
            "avisos": len(avisos),
            "arquivos_ausentes": sum(
                a["situacao"] == "ausente"
                for a in arquivos
            ),
            "arquivos_vazios": sum(
                a["situacao"] == "vazio"
                for a in arquivos
            )
        },
        "distribuicao": {
            "disciplinas": contar("disciplina"),
            "bancas": contar("banca"),
            "dificuldades": contar("dificuldade"),
            "conteudos": contar("conteudo"),
            "status": status
        },
        "arquivos": arquivos,
        "erros": erros,
        "avisos": avisos,
        "questoes": registros,
        "observacao": (
            "Auditoria exclusivamente tecnica. "
            "Nao comprova a correcao juridica. "
            "Nenhuma questao foi alterada."
        )
    }

    SAIDA.parent.mkdir(
        parents=True, exist_ok=True
    )

    temporario = SAIDA.with_suffix(".tmp")

    temporario.write_text(
        json.dumps(
            relatorio,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8"
    )

    temporario.replace(SAIDA)

    print("=" * 45)

    for k, v in relatorio["resumo"].items():
        print(f"{k}: {v}")

    print("=" * 45)
    print(f"Relatorio gerado: {SAIDA}")
    print("Auditoria concluida.")

    return 1 if erros else 0


if __name__ == "__main__":
    raise SystemExit(executar())
