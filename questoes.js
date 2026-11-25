
/* =====================================================
   DELTA JURIS 4.0
   MOTOR DE QUESTOES AUTORAIS
   TACTICAL EDITION
   CARREIRAS POLICIAIS E JURIDICAS
   ===================================================== */

(function () {

    "use strict";

    /* PROTECAO CONTRA DUPLICACAO */

    if (window.DeltaQuestoes) return;

    /* CONFIGURACOES */

    const BASE = "./data/questoes/";

    const DISCIPLINAS = {

        "penal.json": "Direito Penal",
        "processo-penal.json": "Direito Processual Penal",
        "constitucional.json": "Direito Constitucional",
        "administrativo.json": "Direito Administrativo",
        "civil.json": "Direito Civil",
        "processo-civil.json": "Direito Processual Civil",
        "legislacao-especial.json": "Legislação Penal Especial",
        "criminologia.json": "Criminologia",
        "direitos-humanos.json": "Direitos Humanos",
        "ambiental.json": "Direito Ambiental",
        "medicina-legal.json": "Medicina Legal"

    };

    const BANCAS = [

        "CEBRASPE",
        "FGV",
        "FUNDATEC",
        "FCC"

    ];

    const NIVEIS = [

        "Básico",
        "Intermediário",
        "Difícil",
        "Muito difícil",
        "Especialista"

    ];

    const CARREIRAS = [

        "Juiz de Direito",
        "Juiz Federal",
        "Promotor de Justiça",
        "Procurador da República",
        "Defensor Público",
        "Delegado PC",
        "Delegado PF",
        "Policial Rodoviário Federal",
        "Agente PC",
        "Escrivão PC",
        "Investigador PC",
        "Agente PF",
        "Escrivão PF"

    ];

    const TIPOS = [

        "legislacao",
        "jurisprudencia",
        "sumula",
        "sumula_vinculante",
        "repercussao_geral",
        "repetitivo",
        "informativo",
        "doutrina",
        "misto"

    ];

    const STATUS = [

        "pendente_verificacao",
        "validada",
        "desatualizada",
        "arquivada"

    ];

    /* ESTADO DO SISTEMA */

    let manifesto = null;
    let banco = [];
    let erros = [];
    let carregado = false;
    let carregando = null;

    /* FUNCOES AUXILIARES */

    function texto(value) {

        return String(value ?? "").trim();

    }

    function esc(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            c => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[c])
        );

    }

    function normalizar(value) {

        return texto(value)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    }

    function ativo(value) {

        return Boolean(
            value &&
            normalizar(value) !== "all" &&
            normalizar(value) !== "todos" &&
            normalizar(value) !== "todas"
        );

    }

    function lista(value) {

        if (Array.isArray(value)) {

            return value;

        }

        return value ? [value] : [];

    }

    function listaTexto(value) {

        return [...new Set(
            lista(value)
                .map(texto)
                .filter(Boolean)
        )];

    }

    /* EMBARALHAMENTO */

    function embaralhar(lista) {

        const copia = [...lista];

        for (let i = copia.length - 1; i > 0; i--) {

            const j = Math.floor(
                Math.random() * (i + 1)
            );

            [copia[i], copia[j]] =
                [copia[j], copia[i]];

        }

        return copia;

    }

    /* LINKS E FONTES */

    function linkValido(url) {

        try {

            const u = new URL(url);

            return (
                u.protocol === "https:" &&
                !u.username &&
                !u.password
            );

        } catch {

            return false;

        }

    }

    function fonteOficial(url) {

        if (!linkValido(url)) return false;

        try {

            const host =
                new URL(url).hostname.toLowerCase();

            const dominios = [

                "gov.br",
                "jus.br",
                "leg.br",
                "mp.br",
                "def.br"

            ];

            return dominios.some(d =>

                host === d ||
                host.endsWith("." + d)

            );

        } catch {

            return false;

        }

    }

    /* LEITURA DOS ARQUIVOS */

    async function lerJSON(arquivo) {

        if (
            !/^[a-z0-9_-]+\.json$/i.test(arquivo)
        ) {

            throw new Error(
                "Nome de arquivo inválido"
            );

        }

        const resposta = await fetch(

            BASE + arquivo + "?v=" + Date.now(),

            { cache: "no-store" }

        );

        if (!resposta.ok) {

            throw new Error(
                "HTTP " + resposta.status
            );

        }

        return await resposta.json();

    }

    /* MANIFESTO */

    async function carregarManifesto() {

        const dados = await lerJSON(
            "manifest.json"
        );

        if (
            !dados ||
            !Array.isArray(dados.disciplines) ||
            !Array.isArray(dados.contentTypes)
        ) {

            throw new Error(
                "Manifesto inválido"
            );

        }

        const arquivos = new Set();

        for (const d of dados.disciplines) {

            if (
                !d ||
                !texto(d.name) ||
                !/^[a-z0-9_-]+\.json$/i.test(
                    texto(d.file)
                ) ||
                d.file === "manifest.json" ||
                arquivos.has(d.file)
            ) {

                throw new Error(
                    "Disciplina inválida ou duplicada no manifesto"
                );

            }

            arquivos.add(d.file);

        }

        if (
            dados.contentTypes.some(
                tipo => !tipo || !texto(tipo.id)
            )
        ) {

            throw new Error(
                "Tipos de conteúdo inválidos"
            );

        }

        manifesto = dados;

        return manifesto;

    }

    /* PADRONIZACAO DAS QUESTOES */

    function prepararQuestao(q, disciplina) {

        return {

            id: texto(q.id),

            title: texto(
                q.title || q.topic || q.assunto
            ),

            disc: texto(
                q.disc || disciplina
            ),

            topic: texto(
                q.topic || q.assunto
            ),

            subtopic: texto(q.subtopic),

            contentType: texto(
                q.contentType || "misto"
            ),

            court: texto(
                q.court
            ).toUpperCase(),

            sumula: texto(q.sumula),

            tema: texto(q.tema),

            informativo: texto(q.informativo),

            precedent: texto(q.precedent),

            bank: texto(
                q.bank
            ).toUpperCase(),

            careers: listaTexto(
                q.careers || q.carreiras
            ),

            difficulty: texto(
                q.difficulty
            ),

            prompt: texto(q.prompt),

            opts: Array.isArray(q.opts)

                ? q.opts.map(texto)

                : [],

            right: q.right,

            comment: texto(q.comment),

            optionComments:
                Array.isArray(q.optionComments)

                    ? q.optionComments.map(texto)

                    : [],

            legalBasis: texto(
                q.legalBasis || q.fundamento
            ),

            jurisprudence: texto(
                q.jurisprudence ||
                q.jurisprudencia
            ),

            doctrine: texto(
                q.doctrine || q.doutrina
            ),

            reference: texto(q.reference),

            exceptions: texto(
                q.exceptions || q.excecoes
            ),

            example: texto(
                q.example || q.exemplo
            ),

            trap: texto(q.trap),

            sources: lista(
                q.sources || q.fontes
            ).map(f => {

                if (typeof f === "string") {

                    return {

                        title: "Consultar fonte jurídica",

                        url: texto(f)

                    };

                }

                return {

                    title: texto(
                        f?.title ||
                        "Consultar fonte jurídica"
                    ),

                    url: texto(f?.url)

                };

            }).filter(f => linkValido(f.url)),

            status: texto(
                q.status || "pendente_verificacao"
            ),

            reviewedAt: q.reviewedAt

                ? texto(q.reviewedAt)

                : null

        };

    }

    /* VALIDACAO ESTRUTURAL */

    function validarQuestao(q, disciplina) {

        const falhas = [];

        if (!q.id) {

            falhas.push("ID ausente");

        }

        if (!q.disc) {

            falhas.push("Disciplina ausente");

        }

        if (
            disciplina &&
            q.disc !== disciplina
        ) {

            falhas.push(
                "Disciplina incompatível com o arquivo"
            );

        }

        if (!q.topic) {

            falhas.push("Assunto ausente");

        }

        if (!BANCAS.includes(q.bank)) {

            falhas.push("Banca inválida");

        }

        if (!NIVEIS.includes(q.difficulty)) {

            falhas.push("Dificuldade inválida");

        }

        if (
            !q.careers.length ||
            q.careers.some(
                c => !CARREIRAS.includes(c)
            )
        ) {

            falhas.push(
                "Classificação de carreira inválida"
            );

        }

        if (!STATUS.includes(q.status)) {

            falhas.push("Status inválido");

        }

        if (!q.prompt) {

            falhas.push("Enunciado ausente");

        }

        const quantidade =

            q.bank === "CEBRASPE" ? 2 : 5;

        if (q.opts.length !== quantidade) {

            falhas.push(
                "Quantidade de alternativas inválida"
            );

        }

        if (q.opts.some(x => !x)) {

            falhas.push("Alternativa vazia");

        }

        if (

            new Set(
                q.opts.map(normalizar)
            ).size !== q.opts.length

        ) {

            falhas.push(
                "Alternativas duplicadas"
            );

        }

        if (

            q.bank === "CEBRASPE" &&

            (

                normalizar(q.opts[0]) !== "certo" ||

                normalizar(q.opts[1]) !== "errado"

            )

        ) {

            falhas.push(
                "Formato Certo/Errado inválido"
            );

        }

        if (

            !Number.isInteger(q.right) ||

            q.right < 0 ||

            q.right >= q.opts.length

        ) {

            falhas.push("Gabarito inválido");

        }

        if (!q.comment) {

            falhas.push("Comentário ausente");

        }

        if (

            !q.legalBasis &&
            !q.jurisprudence &&
            !q.reference &&
            !q.sumula &&
            !q.tema &&
            !q.precedent &&
            !q.informativo &&
            !q.doctrine

        ) {

            falhas.push(
                "Fundamentação jurídica ausente"
            );

        }

        const tiposPermitidos = manifesto

            ? manifesto.contentTypes.map(
                t => t.id
            )

            : TIPOS;

        if (
            !tiposPermitidos.includes(
                q.contentType
            )
        ) {

            falhas.push(
                "Tipo de conteúdo inválido"
            );

        }

        if (

            q.court &&

            !["STF", "STJ"].includes(q.court)

        ) {

            falhas.push("Tribunal inválido");

        }

        if (

            q.optionComments.length !==
            q.opts.length

        ) {

            falhas.push(
                "Comentários das alternativas incompletos"
            );

        }

        if (
            q.optionComments.some(x => !x)
        ) {

            falhas.push(
                "Comentário de alternativa vazio"
            );

        }

        if (

            !q.sources.some(
                f => fonteOficial(f.url)
            )

        ) {

            falhas.push(
                "Fonte jurídica oficial ausente"
            );

        }

        if (q.status === "validada") {

            if (
                !q.reviewedAt ||
                !Number.isFinite(
                    Date.parse(q.reviewedAt)
                )
            ) {

                falhas.push(
                    "Data de revisão jurídica inválida"
                );

            }

        }

        return falhas;

    }

    /* CARREGAMENTO DO BANCO */

    async function executarCarregamento() {

        carregado = false;
        banco = [];
        erros = [];

        try {

            await carregarManifesto();

        } catch (error) {

            erros.push({

                arquivo: "manifest.json",

                erro: texto(error.message)

            });

            throw error;

        }

        const arquivosAtivos = manifesto.disciplines

            .filter(d => d.enabled === true)

            .map(d => [d.file, d.name]);

        const registros = [];

        const resultados = await Promise.allSettled(

            arquivosAtivos.map(

                async ([arquivo, disciplina]) => ({

                    arquivo,

                    disciplina,

                    dados: await lerJSON(arquivo)

                })

            )

        );

        resultados.forEach((resultado, indice) => {

            const arquivo =
                arquivosAtivos[indice][0];

            if (
                resultado.status === "rejected"
            ) {

                erros.push({

                    arquivo,

                    erro: String(resultado.reason)

                });

                return;

            }

            const { dados, disciplina } =
                resultado.value;

            const questoes = Array.isArray(dados)

                ? dados

                : dados?.questions;

            if (!Array.isArray(questoes)) {

                erros.push({

                    arquivo,

                    erro: "Formato JSON inválido"

                });

                return;

            }

            questoes.forEach(item => {

                if (
                    !item ||
                    typeof item !== "object" ||
                    Array.isArray(item)
                ) {

                    erros.push({

                        arquivo,

                        erro: "Registro inválido"

                    });

                    return;

                }

                try {

                    const q = prepararQuestao(

                        item,

                        disciplina

                    );

                    const falhas = validarQuestao(

                        q,

                        disciplina

                    );

                    registros.push({

                        arquivo,

                        q,

                        falhas

                    });

                } catch (error) {

                    erros.push({

                        arquivo,

                        erro: texto(error.message)

                    });

                }

            });

        });

        /* IDENTIFICACAO DE IDS DUPLICADOS */

        const contagem = new Map();

        registros.forEach(({ q }) => {

            if (!q.id) return;

            contagem.set(

                q.id,

                (contagem.get(q.id) || 0) + 1

            );

        });

        registros.forEach((registro) => {

            const { arquivo, q, falhas } =
                registro;

            if (
                q.id &&
                contagem.get(q.id) > 1
            ) {

                falhas.push("ID duplicado");

            }

            if (falhas.length) {

                erros.push({

                    arquivo,

                    id: q.id,

                    erro: falhas.join("; ")

                });

                return;

            }

            banco.push(q);

        });

        carregado = true;

        console.info(

            "Delta Juris 4.0:",

            banco.length,

            "questões carregadas."

        );

        if (erros.length) {

            console.warn(

                "Delta Juris — Avisos:",

                erros

            );

        }

        return resumo();

    }

    async function carregarBanco(forcar = false) {

        if (carregando) {

            return carregando;

        }

        if (carregado && !forcar) {

            return resumo();

        }

        carregando = executarCarregamento();

        try {

            return await carregando;

        } finally {

            carregando = null;

        }

    }

    /* RESUMO DO BANCO */

    function resumo() {

        const validadas = banco.filter(

            q => q.status === "validada"

        );

        const porDisciplina = {};

        const porBanca = {};

        const porDificuldade = {};

        const porConteudo = {};

        validadas.forEach(q => {

            porDisciplina[q.disc] =

                (porDisciplina[q.disc] || 0) + 1;

            porBanca[q.bank] =

                (porBanca[q.bank] || 0) + 1;

            porDificuldade[q.difficulty] =

                (porDificuldade[q.difficulty] || 0) + 1;

            porConteudo[q.contentType] =

                (porConteudo[q.contentType] || 0) + 1;

        });

        return {

            carregado,

            total: banco.length,

            validadas: validadas.length,

            pendentes: banco.filter(

                q => q.status ===
                    "pendente_verificacao"

            ).length,

            desatualizadas: banco.filter(

                q => q.status ===
                    "desatualizada"

            ).length,

            arquivadas: banco.filter(

                q => q.status ===
                    "arquivada"

            ).length,

            erros: erros.map(e => ({ ...e })),

            porDisciplina,

            porBanca,

            porDificuldade,

            porConteudo,

            disciplinas: manifesto

                ? manifesto.disciplines
                    .filter(d => d.enabled === true)
                    .map(d => d.name)

                : Object.values(DISCIPLINAS),

            bancas: [...BANCAS],

            niveis: [...NIVEIS],

            carreiras: [...CARREIRAS]

        };

    }

    /* FILTROS DE QUESTOES */

    function filtrar(filtros = {}) {

        if (!carregado) return [];

        const pesquisa = normalizar(

            filtros.pesquisa ||
            filtros.search ||
            ""

        );

        const ids = Array.isArray(filtros.ids)

            ? new Set(filtros.ids.map(String))

            : null;

        const resultado = banco.filter(q => {

            /* SOMENTE QUESTOES VALIDADAS */

            if (
                q.status !== "validada"
            ) {

                return false;

            }

            if (ids && !ids.has(q.id)) {

                return false;

            }

            if (

                ativo(filtros.disc) &&

                q.disc !== filtros.disc

            ) {

                return false;

            }

            if (

                ativo(filtros.bank) &&

                q.bank !== filtros.bank

            ) {

                return false;

            }

            if (

                ativo(filtros.difficulty) &&

                q.difficulty !== filtros.difficulty

            ) {

                return false;

            }

            if (

                ativo(filtros.career) &&

                !q.careers.includes(filtros.career)

            ) {

                return false;

            }

            if (

                ativo(filtros.topic) &&

                q.topic !== filtros.topic

            ) {

                return false;

            }

            if (

                ativo(filtros.contentType) &&

                q.contentType !== filtros.contentType

            ) {

                return false;

            }

            if (

                ativo(filtros.court) &&

                q.court !== filtros.court

            ) {

                return false;

            }

            if (

                ativo(filtros.sumula) &&

                !normalizar(q.sumula).includes(

                    normalizar(filtros.sumula)

                )

            ) {

                return false;

            }

            if (

                ativo(filtros.tema) &&

                !normalizar(q.tema).includes(

                    normalizar(filtros.tema)

                )

            ) {

                return false;

            }

            if (pesquisa) {

                const conteudo = normalizar([

                    q.id,
                    q.title,
                    q.disc,
                    q.topic,
                    q.subtopic,
                    q.prompt,
                    q.reference,
                    q.contentType,
                    q.court,
                    q.sumula,
                    q.tema,
                    q.informativo,
                    q.precedent,
                    q.legalBasis,
                    q.jurisprudence,
                    q.doctrine,
                    q.comment,
                    q.exceptions,
                    q.example,
                    q.trap

                ].join(" "));

                const termos = pesquisa

                    .split(/\s+/)

                    .filter(Boolean);

                if (

                    !termos.every(

                        termo => conteudo.includes(termo)

                    )

                ) {

                    return false;

                }

            }

            return true;

        });

        return resultado.map(q => ({

            ...q,

            careers: [...q.careers],

            opts: [...q.opts],

            optionComments: [...q.optionComments],

            sources: q.sources.map(f => ({ ...f }))

        }));

    }

    /* CONSULTA INDIVIDUAL */

    function buscarQuestao(id) {

        return filtrar({

            ids: [String(id)]

        })[0] || null;

    }

    /* MONTAGEM DOS SIMULADOS */

    function criarSimulado(filtros = {}) {

        const quantidade = Math.min(

            100,

            Math.max(

                1,

                Math.floor(
                    Number(filtros.count) || 10
                )

            )

        );

        const disponiveis = filtrar(filtros);

        const ordenadas = filtros.shuffle === false

            ? disponiveis

            : embaralhar(disponiveis);

        return ordenadas.slice(

            0,

            quantidade

        );

    }

    /* GABARITO */

    function gabarito(q) {

        if (q.bank === "CEBRASPE") {

            return q.opts[q.right];

        }

        return String.fromCharCode(

            65 + q.right

        );

    }

    /* CALCULO DE DESEMPENHO */

    function corrigir(

        questoes,

        respostas,

        config = {}

    ) {

        let acertos = 0;
        let erros = 0;
        let brancos = 0;
        let penalidades = 0;

        const porDisciplina = {};

        const porBanca = {};

        const detalhes = [];

        function registrar(grupo, chave, estado) {

            if (!grupo[chave]) {

                grupo[chave] = {

                    total: 0,

                    acertos: 0,

                    erros: 0,

                    brancos: 0

                };

            }

            grupo[chave].total++;

            grupo[chave][estado]++;

        }

        questoes.forEach((q, i) => {

            const resposta = respostas[i];

            let estado;

            if (

                resposta === undefined ||

                resposta === null ||

                !Number.isInteger(resposta) ||

                resposta < 0 ||

                resposta >= q.opts.length

            ) {

                brancos++;

                estado = "brancos";

            } else if (

                resposta === q.right

            ) {

                acertos++;

                estado = "acertos";

            } else {

                erros++;

                estado = "erros";

                if (

                    config.penalty === true &&

                    q.bank === "CEBRASPE"

                ) {

                    penalidades++;

                }

            }

            registrar(

                porDisciplina,

                q.disc,

                estado

            );

            registrar(

                porBanca,

                q.bank,

                estado

            );

            detalhes.push({

                id: q.id,

                disciplina: q.disc,

                banca: q.bank,

                resposta: resposta ?? null,

                gabarito: q.right,

                estado

            });

        });

        const total = questoes.length;

        const percentual = total

            ? Math.round(

                acertos / total * 100

            )

            : 0;

        return {

            total,

            acertos,

            erros,

            brancos,

            percentual,

            penalidades,

            pontuacao: acertos - penalidades,

            porDisciplina,

            porBanca,

            detalhes

        };

    }

    /* FONTES JURIDICAS */

    function renderFontes(q) {

        const links = q.sources.map(f => {

            if (!linkValido(f.url)) {

                return "";

            }

            return `

                <p class="links small">

                    <a href="${esc(f.url)}"
                       target="_blank"
                       rel="noopener noreferrer">

                        ${esc(f.title)} ↗

                    </a>

                </p>

            `;

        }).join("");

        return links

            ? `<h4>Fontes jurídicas</h4>${links}`

            : "";

    }

    /* BLOCO DE FUNDAMENTACAO */

    function bloco(titulo, conteudo) {

        if (!conteudo) return "";

        return `

            <h4>${esc(titulo)}</h4>

            <p>${esc(conteudo)}</p>

        `;

    }

    /* ABA COMENTARIO */

    function renderComentario(q) {

        return `

            <div class="dj-resolution">

                <h3>

                    Gabarito: ${esc(gabarito(q))}

                </h3>

                ${bloco(

                    "Gabarito comentado",

                    q.comment

                )}

                ${bloco(

                    "Fundamentação legal",

                    q.legalBasis

                )}

                ${bloco(

                    "Tribunal",

                    q.court

                )}

                ${bloco(

                    "Jurisprudência",

                    q.jurisprudence

                )}

                ${bloco(

                    "Súmula / Súmula vinculante",

                    q.sumula

                )}

                ${bloco(

                    "Tema jurisprudencial",

                    q.tema

                )}

                ${bloco(

                    "Informativo de jurisprudência",

                    q.informativo

                )}

                ${bloco(

                    "Precedente judicial",

                    q.precedent

                )}

                ${bloco(

                    "Fundamentação doutrinária",

                    q.doctrine

                )}

                ${bloco(

                    "Exceções e ressalvas",

                    q.exceptions

                )}

                ${bloco(

                    "Exemplo prático",

                    q.example

                )}

                ${bloco(

                    "Referência jurídica",

                    q.reference

                )}

                ${q.trap ? `

                    <div class="dj-trap">

                        <strong>

                            Atenção à pegadinha

                        </strong>

                        <p>${esc(q.trap)}</p>

                    </div>

                ` : ""}

                ${renderFontes(q)}

                ${q.reviewedAt ? `

                    <p class="small muted">

                        Revisão jurídica:

                        ${esc(q.reviewedAt)}

                    </p>

                ` : ""}

            </div>

        `;

    }

    /* ABA ALTERNATIVAS */

    function renderAlternativas(q) {

        return q.opts.map((opcao, i) => {

            const correta = i === q.right;

            const letra = q.bank === "CEBRASPE"

                ? opcao

                : String.fromCharCode(65 + i);

            return `

                <div class="dj-option-analysis
                    ${correta

                        ? "dj-option-correct"

                        : "dj-option-wrong"

                    }">

                    <strong class="${correta

                        ? "good"

                        : "bad"

                    }">

                        ${correta ? "✓" : "✕"}

                        ${esc(letra)} —

                        ${correta

                            ? "Correta"

                            : "Incorreta"

                        }

                    </strong>

                    ${q.bank !== "CEBRASPE" ? `

                        <p>${esc(opcao)}</p>

                    ` : ""}

                    <p>

                        ${esc(q.optionComments[i])}

                    </p>

                </div>

            `;

        }).join("");

    }

    /* PAINEL DE RESOLUCAO */

    function montarResolucao(

        elemento,

        questao,

        resposta,

        liberado = false

    ) {

        const container =

            typeof elemento === "string"

                ? document.getElementById(elemento)

                : elemento;

        if (!container || !questao) return;

        container.replaceChildren();

        if (!liberado) {

            container.innerHTML = `

                <p class="small muted">

                    A resolução será disponibilizada

                    após a correção da questão.

                </p>

            `;

            return;

        }

        const emBranco =

            !Number.isInteger(resposta) ||

            resposta < 0 ||

            resposta >= questao.opts.length;

        const correta =

            !emBranco &&

            resposta === questao.right;

        const status = emBranco

            ? "Não respondida"

            : correta

                ? "Resposta correta"

                : "Resposta incorreta";

        container.innerHTML = `

            <div class="dj-answer-box">

                <div class="dj-answer-status">

                    <strong class="${emBranco

                        ? "muted"

                        : correta

                            ? "good"

                            : "bad"

                    }">

                        ${esc(status)}

                    </strong>

                    <span>

                        Gabarito:

                        ${esc(gabarito(questao))}

                    </span>

                </div>

                <div class="dj-answer-tabs">

                    <button

                        type="button"

                        data-tab="comment"

                        aria-expanded="false">

                        Comentário

                    </button>

                    <button

                        type="button"

                        data-tab="options"

                        aria-expanded="false">

                        Alternativas

                    </button>

                </div>

                <div class="dj-answer-content"
                     hidden>

                </div>

            </div>

        `;

        const conteudo = container.querySelector(

            ".dj-answer-content"

        );

        const botoes = container.querySelectorAll(

            "[data-tab]"

        );

        let abaAtual = null;

        botoes.forEach(botao => {

            botao.addEventListener("click", () => {

                const aba = botao.dataset.tab;

                if (abaAtual === aba) {

                    abaAtual = null;

                    conteudo.hidden = true;

                    conteudo.replaceChildren();

                    botoes.forEach(b => {

                        b.classList.remove("active");

                        b.setAttribute(

                            "aria-expanded",

                            "false"

                        );

                    });

                    return;

                }

                abaAtual = aba;

                botoes.forEach(b => {

                    const ativa =

                        b.dataset.tab === aba;

                    b.classList.toggle(

                        "active",

                        ativa

                    );

                    b.setAttribute(

                        "aria-expanded",

                        String(ativa)

                    );

                });

                conteudo.innerHTML =

                    aba === "comment"

                        ? renderComentario(questao)

                        : renderAlternativas(questao);

                conteudo.hidden = false;

            });

        });

    }

    /* API DO DELTA JURIS */

    window.DeltaQuestoes = Object.freeze({

        versao: "4.0.0",

        carregarBanco,

        carregarManifesto,

        getManifesto: () => manifesto

            ? JSON.parse(
                JSON.stringify(manifesto)
            )

            : null,

        resumo,

        filtrar,

        buscarQuestao,

        criarSimulado,

        corrigir,

        gabarito,

        montarResolucao,

        renderComentario,

        renderAlternativas,

        disciplinas: Object.freeze(

            Object.values(DISCIPLINAS)

        ),

        bancas: Object.freeze([...BANCAS]),

        niveis: Object.freeze([...NIVEIS]),

        carreiras: Object.freeze([...CARREIRAS]),

        tipos: Object.freeze([...TIPOS]),

        tribunais: Object.freeze(["STF", "STJ"])

    });

    console.info(

        "Delta Juris 4.0 — Motor de questões disponível."

    );

})();

/* FIM — DELTA JURIS 4.0 */
