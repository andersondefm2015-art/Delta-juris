
/* =====================================================
   DELTA JURIS 4.0
   MOTOR DE QUESTÕES AUTORAIS
   Carreiras Policiais e Jurídicas
   ===================================================== */

(function () {

"use strict";

/* CONFIGURAÇÕES */

const BASE = "./data/questoes/";
let manifesto = null;

async function carregarManifesto() {

    const resposta = await fetch(
        BASE + "manifest.json",
        { cache: "no-store" }
    );

    if (!resposta.ok) {

        throw new Error(
            "Erro ao carregar manifest.json"
        );

    }

    const dados = await resposta.json();

    if (!Array.isArray(dados.disciplines)) {

        throw new Error(
            "Manifesto inválido"
        );

    }

    manifesto = dados;

    return manifesto;

}

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

/* ESTADO DO SISTEMA */

let banco = [];
let erros = [];
let carregado = false;
let carregando = null;

/* PROTEÇÃO DE TEXTO */

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

/* NORMALIZAÇÃO DE PESQUISA */

function normalizar(value) {

    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

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

/* LINKS SEGUROS */

function linkValido(url) {

    try {

        const u = new URL(url);

        return u.protocol === "https:";

    } catch {

        return false;

    }

}

/* LEITURA DOS ARQUIVOS JSON */

async function lerJSON(arquivo) {

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

/* PADRONIZAÇÃO DAS QUESTÕES */

function prepararQuestao(q, disciplina) {

    const carreiras =
        q.careers || q.carreiras || [];

    const fontes =
        q.sources || q.fontes || [];

    return {

        id: String(q.id || "").trim(),

        disc: q.disc || disciplina,

        topic: q.topic || q.assunto || "",

        subtopic: q.subtopic || "",

contentType: q.contentType || "misto",

court: String(
    q.court || ""
).toUpperCase(),

sumula: q.sumula || "",

tema: q.tema || "",

informativo: q.informativo || "",

precedent: q.precedent || "",

bank: String(
    q.bank || ""
).toUpperCase(),

        careers: Array.isArray(carreiras)
            ? carreiras
            : [carreiras],

        difficulty:
            q.difficulty || "Difícil",

        prompt: q.prompt || "",

        opts: Array.isArray(q.opts)
            ? q.opts.map(String)
            : [],

        right: q.right,

        comment: q.comment || "",

        optionComments:
            Array.isArray(q.optionComments)
                ? q.optionComments
                : [],

        legalBasis:
            q.legalBasis ||
            q.fundamento || "",

        jurisprudence:
            q.jurisprudence ||
            q.jurisprudencia || "",

        doctrine:
            q.doctrine ||
            q.doutrina || "",

        reference:
            q.reference || "",

        trap:
            q.trap || "",

        sources:
            Array.isArray(fontes)
                ? fontes
                : [fontes],

        status:
            q.status ||
            "pendente_verificacao",

        reviewedAt:
            q.reviewedAt || null

    };

}

/* VALIDAÇÃO ESTRUTURAL */

function validarQuestao(q) {

    const falhas = [];

    if (!q.id) {
        falhas.push("ID ausente");
    }

    if (!q.disc) {
        falhas.push("Disciplina ausente");
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

    if (!q.careers.length) {
        falhas.push("Carreira ausente");
    }

    if (!q.prompt.trim()) {
        falhas.push("Enunciado ausente");
    }

    const quantidade =
        q.bank === "CEBRASPE" ? 2 : 5;

    if (q.opts.length !== quantidade) {
        falhas.push("Quantidade de alternativas inválida");
    }

    if (q.opts.some(x => !x.trim())) {
        falhas.push("Alternativa vazia");
    }

    if (
        new Set(
            q.opts.map(normalizar)
        ).size !== q.opts.length
    ) {
        falhas.push("Alternativas duplicadas");
    }

    if (
        q.bank === "CEBRASPE" &&
        (
            normalizar(q.opts[0]) !== "certo" ||
            normalizar(q.opts[1]) !== "errado"
        )
    ) {
        falhas.push("Formato Certo/Errado inválido");
    }

    if (
        !Number.isInteger(q.right) ||
        q.right < 0 ||
        q.right >= q.opts.length
    ) {
        falhas.push("Gabarito inválido");
    }

    if (!q.comment.trim()) {
        falhas.push("Comentário ausente");
    }

    if (
        !q.legalBasis &&
        !q.jurisprudence &&
        !q.reference
    ) {
        falhas.push("Fundamentação jurídica ausente");
    }

    if (
        q.optionComments.length !==
        q.opts.length
    ) {
        falhas.push("Comentários das alternativas incompletos");
    }

    if (
        q.optionComments.some(
            x => !String(x || "").trim()
        )
    ) {
        falhas.push("Comentário de alternativa vazio");
    }

    if (
        !q.sources.some(f =>
            linkValido(
                typeof f === "string"
                    ? f
                    : f?.url
            )
        )
    ) {
        falhas.push("Fonte jurídica ausente");
    }

    return falhas;

}

/* CARREGAMENTO DO BANCO */

async function executarCarregamento() {

    carregado = false;
    banco = [];
    erros = [];

    await carregarManifesto();

    const arquivosAtivos = manifesto.disciplines
        .filter(d => d.enabled)
        .map(d => [d.file, d.name]);

    const ids = new Set();

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

        if (resultado.status === "rejected") {

            erros.push({

                arquivo,

                erro: String(resultado.reason)

            });

            return;

        }

        const { dados, disciplina } =
            resultado.value;

        const lista = Array.isArray(dados)

            ? dados

            : dados?.questions;

        if (!Array.isArray(lista)) {

            erros.push({

                arquivo,

                erro: "Formato JSON inválido"

            });

            return;

        }

        lista.forEach(item => {

            if (!item || typeof item !== "object") {

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

                const falhas = validarQuestao(q);

                if (falhas.length) {

                    erros.push({

                        arquivo,

                        id: q.id,

                        erro: falhas.join("; ")

                    });

                    return;

                }

                if (ids.has(q.id)) {

                    erros.push({

                        arquivo,

                        id: q.id,

                        erro: "ID duplicado"

                    });

                    return;

                }

                ids.add(q.id);

                banco.push(q);

            } catch (e) {

                erros.push({

                    arquivo,

                    erro: String(e.message)

                });

            }

        });

    });

    carregado = true;

    console.info(

        "Delta Juris: " +
        banco.length +
        " questões carregadas."

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

    if (carregando) return carregando;

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

    return {

        carregado,

        total: banco.length,

        validadas: validadas.length,

        pendentes: banco.filter(
            q => q.status === "pendente_verificacao"
        ).length,

        erros: [...erros],

        disciplinas: Object.values(DISCIPLINAS),

        bancas: [...BANCAS],

        niveis: [...NIVEIS],

        carreiras: [...CARREIRAS]

    };

}

/* FILTROS DE QUESTÕES */

function filtrar(filtros = {}) {

    const pesquisa = normalizar(
        filtros.pesquisa || ""
    );

    return banco.filter(q => {

        if (q.status !== "validada") {
            return false;
        }

        if (
            filtros.disc &&
            q.disc !== filtros.disc
        ) {
            return false;
        }

        if (
            filtros.bank &&
            q.bank !== filtros.bank
        ) {
            return false;
        }

        if (
            filtros.difficulty &&
            q.difficulty !== filtros.difficulty
        ) {
            return false;
        }

        if (
            filtros.career &&
            !q.careers.includes(filtros.career)
        ) {
            return false;
        }

        if (
            filtros.topic &&
            q.topic !== filtros.topic
        ) {
            return false;
        }

        if (pesquisa) {

            const texto = normalizar([

                q.disc,
                q.topic,
                q.subtopic,
                q.prompt,
                q.reference

            ].join(" "));

            if (!texto.includes(pesquisa)) {
                return false;
            }

        }

        return true;

    });

}

/* MONTAGEM DO SIMULADO */

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

    return embaralhar(disponiveis)
        .slice(0, quantidade);

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

/* FONTES JURÍDICAS */

function renderFontes(q) {

    const links = q.sources.map(f => {

        const url =
            typeof f === "string"
                ? f
                : f?.url;

        const titulo =
            typeof f === "string"
                ? "Consultar fonte jurídica"
                : f?.title || "Consultar fonte jurídica";

        if (!linkValido(url)) return "";

        return `

            <p class="links small">

                <a href="${esc(url)}"
                   target="_blank"
                   rel="noopener noreferrer">

                    ${esc(titulo)} ↗

                </a>

            </p>

        `;

    }).join("");

    return links

        ? `<h4>Fontes jurídicas</h4>${links}`

        : "";

}

/* ABA COMENTÁRIO */

function renderComentario(q) {

    return `

        <div class="dj-resolution">

            <h3>Gabarito: ${esc(gabarito(q))}</h3>

            <h4>Gabarito comentado</h4>

            <p>${esc(q.comment)}</p>

            ${q.legalBasis ? `

                <h4>Fundamentação legal</h4>

                <p>${esc(q.legalBasis)}</p>

            ` : ""}

            ${q.jurisprudence ? `

                <h4>Jurisprudência</h4>

                <p>${esc(q.jurisprudence)}</p>

            ` : ""}

            ${q.doctrine ? `

                <h4>Fundamentação doutrinária</h4>

                <p>${esc(q.doctrine)}</p>

            ` : ""}

            ${q.reference ? `

                <h4>Referência jurídica</h4>

                <p>${esc(q.reference)}</p>

            ` : ""}

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
                    : "dj-option-wrong"}">

                <strong class="${correta
                    ? "good"
                    : "bad"}">

                    ${correta ? "✓" : "✕"}

                    ${esc(letra)} —

                    ${correta
                        ? "Correta"
                        : "Incorreta"}

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

/* PAINEL DE RESOLUÇÃO */

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

    if (!container) return;

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

    const correta =
        resposta === questao.right;

    const status =
        resposta === undefined ||
        resposta === null

            ? "Não respondida"

            : correta

                ? "Resposta correta"

                : "Resposta incorreta";

    container.innerHTML = `

        <div class="dj-answer-box">

            <div class="dj-answer-status">

                <strong class="${correta
                    ? "good"
                    : "bad"}">

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

                const ativa = b.dataset.tab === aba;

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

/* CÁLCULO DE DESEMPENHO */

function corrigir(questoes, respostas, config = {}) {

    let acertos = 0;
    let erros = 0;
    let brancos = 0;

    questoes.forEach((q, i) => {

        const resposta = respostas[i];

        if (
            resposta === undefined ||
            resposta === null
        ) {

            brancos++;

        } else if (resposta === q.right) {

            acertos++;

        } else {

            erros++;

        }

    });

    const total = questoes.length;

    const percentual = total

        ? Math.round(
            acertos / total * 100
        )

        : 0;

    const penalidade = config.penalty === true

        ? erros

        : 0;

    return {

        total,

        acertos,

        erros,

        brancos,

        percentual,

        pontuacao: acertos - penalidade

    };

}

/* IDENTIDADE VISUAL TÁTICA */

function instalarEstilos() {

    if (
        document.getElementById(
            "dj-questoes-style"
        )
    ) return;

    const style = document.createElement("style");

    style.id = "dj-questoes-style";

    style.textContent = `

        .dj-answer-box {

            margin-top: 16px;

            border: 1px solid #354653;

            border-radius: 12px;

            background: #101e29;

            overflow: hidden;

        }

        .dj-answer-status {

            display: flex;

            justify-content: space-between;

            flex-wrap: wrap;

            gap: 10px;

            padding: 16px;

            font-size: 14px;

        }

        .dj-answer-tabs {

            display: grid;

            grid-template-columns: 1fr 1fr;

            border-top: 1px solid #354653;

        }

        .dj-answer-tabs button {

            background: #14232e;

            color: #d4dce4;

            border: 0;

            border-bottom: 3px solid transparent;

            padding: 14px 8px;

            font-size: 14px;

            font-weight: 750;

            cursor: pointer;

        }

        .dj-answer-tabs button.active {

            color: #f4db9b;

            border-bottom-color: #d5ad59;

            background: #252c30;

        }

        .dj-answer-content {

            padding: 18px;

            line-height: 1.7;

            overflow-wrap: anywhere;

        }

        .dj-answer-content[hidden] {

            display: none !important;

        }

        .dj-resolution h3 {

            color: #79e0ce;

            margin: 0 0 18px;

        }

        .dj-resolution h4 {

            color: #e2c17d;

            margin: 18px 0 8px;

        }

        .dj-resolution p {

            white-space: pre-line;

            margin: 8px 0;

        }

        .dj-trap {

            padding: 14px;

            margin: 18px 0;

            border-left: 3px solid #d5ad59;

            background: #30291d;

            border-radius: 7px;

        }

        .dj-trap strong {

            color: #f4db9b;

        }

        .dj-option-analysis {

            padding: 14px;

            margin-bottom: 12px;

            border: 1px solid #354653;

            border-radius: 9px;

        }

        .dj-option-analysis p {

            margin: 9px 0 0;

            white-space: pre-line;

        }

        .dj-option-correct {

            border-left: 3px solid #79e0ce;

            background: #122c2c;

        }

        .dj-option-wrong {

            border-left: 3px solid #c66b6b;

            background: #251e25;

        }

        @media(max-width: 600px) {

            .dj-answer-content {

                padding: 13px;

            }

            .dj-answer-tabs button {

                font-size: 13px;

            }

        }

    `;

    document.head.appendChild(style);

}

/* API DO DELTA JURIS */

window.DeltaQuestoes = Object.freeze({

    carregarBanco,

    resumo,

    filtrar,

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

    carreiras: Object.freeze([...CARREIRAS])

});

/* INICIALIZAÇÃO VISUAL */

instalarEstilos();

console.info(
    "Delta Juris 4.0 — Motor de questões disponível."
);

})();
