
/* =====================================================
   DELTA JURIS 4.0
   CENTRAL DE TREINAMENTO
   SIMULADOS PERSONALIZADOS
   TACTICAL EDITION
   ===================================================== */

(function () {

    "use strict";

    if (window.DeltaSimulados) return;

    const motor = window.DeltaQuestoes;

    const $ = id =>
        document.getElementById(id);

    const secao = $("simulados");

    if (!secao) return;

    /* ESTADO DO SIMULADO */

    let pronto = false;
    let inicializado = false;
    let carregando = null;
    let questoes = [];
    let respostas = {};
    let configuracao = {};
    let inicio = 0;
    let duracao = 0;
    let cronometro = null;
    let finalizado = false;
    let emAndamento = false;

    const CHAVE_RESULTADOS = "dj_results";
    const CHAVE_ERROS = "dj_errors";

    /* FUNCOES AUXILIARES */

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

    function lerStorage(chave) {

        try {

            const dados = JSON.parse(
                localStorage.getItem(chave) || "[]"
            );

            return Array.isArray(dados)
                ? dados
                : [];

        } catch {

            return [];

        }

    }

    function salvarStorage(chave, dados) {

        try {

            localStorage.setItem(
                chave,
                JSON.stringify(dados)
            );

            return true;

        } catch {

            return false;

        }

    }

    function valor(id) {

        return $(id)?.value || "";

    }

    function formatarTempo(segundos) {

        const total = Math.max(
            0,
            Math.floor(segundos || 0)
        );

        const h = Math.floor(total / 3600);

        const m = Math.floor(
            (total % 3600) / 60
        );

        const s = total % 60;

        return [h, m, s]

            .map(n =>
                String(n).padStart(2, "0")
            )

            .join(":");

    }

    function dataFormatada(data) {

        const d = new Date(data);

        return Number.isNaN(d.getTime())

            ? "Data indisponível"

            : d.toLocaleString("pt-BR");

    }

    /* INTERFACE DA CENTRAL */

    function montarInterface() {

        secao.innerHTML = `

            <div class="dj-mission-hero">

                <div class="dj-kicker">
                    DELTA JURIS 4.0
                    • TACTICAL EDITION
                </div>

                <h1>MISSÃO: APROVAÇÃO</h1>

                <p>
                    Treine com estratégia.
                    Execute com disciplina.
                    Conquiste sua aprovação.
                </p>

            </div>

            <div id="config" class="panel">

                <h2>Configure sua missão</h2>

                <p class="muted small">
                    Personalize seu treinamento
                    de acordo com sua carreira
                    e objetivo.
                </p>

                <div class="dj-sim-config">

                    <div class="dj-field">

                        <label for="simCareer">
                            Carreira
                        </label>

                        <select id="simCareer">
                            <option value="">
                                Todas as carreiras
                            </option>
                        </select>

                    </div>

                    <div class="dj-field">

                        <label for="simBanca">
                            Banca examinadora
                        </label>

                        <select id="simBanca">
                            <option value="">
                                Todas as bancas
                            </option>
                        </select>

                    </div>

                    <div class="dj-field">

                        <label for="simDisc">
                            Disciplina
                        </label>

                        <select id="simDisc">
                            <option value="">
                                Todas as disciplinas
                            </option>
                        </select>

                    </div>

                    <div class="dj-field">

                        <label for="simDifficulty">
                            Dificuldade
                        </label>

                        <select id="simDifficulty">
                            <option value="">
                                Todos os níveis
                            </option>
                        </select>

                    </div>

                    <div class="dj-field">

                        <label for="simContent">
                            Conteúdo jurídico
                        </label>

                        <select id="simContent">
                            <option value="">
                                Todos os conteúdos
                            </option>
                        </select>

                    </div>

                    <div class="dj-field">

                        <label for="simCourt">
                            Tribunal
                        </label>

                        <select id="simCourt">

                            <option value="">
                                Todos os tribunais
                            </option>

                            <option value="STF">
                                STF
                            </option>

                            <option value="STJ">
                                STJ
                            </option>

                        </select>

                    </div>

                    <div class="dj-field dj-full">

                        <label for="simSearch">
                            Pesquisar conteúdo
                        </label>

                        <input
                            id="simSearch"
                            type="search"
                            placeholder="Artigo, súmula, tema, informativo ou assunto">

                    </div>

                    <div class="dj-field">

                        <label for="simCount">
                            Quantidade de questões
                        </label>

                        <select id="simCount">

                            ${[5,10,15,20,30,50,60,80,100]
                                .map(n => `

                                    <option value="${n}"
                                        ${n === 10
                                            ? "selected"
                                            : ""}>

                                        ${n} questões

                                    </option>

                                `).join("")}

                        </select>

                    </div>

                    <div class="dj-field">

                        <label for="simMode">
                            Modo de correção
                        </label>

                        <select id="simMode">

                            <option value="end">
                                Ao finalizar
                            </option>

                            <option value="immediate">
                                Correção imediata
                            </option>

                        </select>

                    </div>

                    <div class="dj-field">

                        <label for="simPool">
                            Banco de questões
                        </label>

                        <select id="simPool">

                            <option value="all">
                                Todas as validadas
                            </option>

                            <option value="errors">
                                Meu caderno de erros
                            </option>

                        </select>

                    </div>

                    <div class="dj-field">

                        <label for="simPenalty">
                            Sistema de pontuação
                        </label>

                        <select id="simPenalty">

                            <option value="none">
                                Sem penalização
                            </option>

                            <option value="cebraspe">
                                CEBRASPE: +1 / -1
                            </option>

                        </select>

                    </div>

                </div>

                <div id="missionSummary">
                    Carregando banco de questões...
                </div>

                <div id="availability"
                     role="status"
                     aria-live="polite">

                    Aguarde o carregamento.

                </div>

                <button
                    id="startButton"
                    class="btn"
                    type="button"
                    disabled>

                    INICIAR MISSÃO

                </button>

            </div>

            <div id="quiz" hidden></div>

            <div id="result" hidden></div>

        `;

        if (!motor) {

            $("availability").textContent =
                "Motor de questões indisponível.";

            return;

        }

        secao.querySelectorAll(
            "#config select, #config input"
        ).forEach(campo => {

            campo.addEventListener(
                "change",
                atualizarDisponibilidade
            );

            if (campo.tagName === "INPUT") {

                campo.addEventListener(
                    "input",
                    atualizarDisponibilidade
                );

            }

        });

        $("startButton").addEventListener(
            "click",
            iniciarSimulado
        );

    }

    /* PREENCHIMENTO DOS FILTROS */

    function preencherSelect(id, itens) {

        const select = $(id);

        if (!select) return;

        const atual = select.value;

        while (select.options.length > 1) {

            select.remove(1);

        }

        itens.forEach(item => {

            const option =
                document.createElement("option");

            if (typeof item === "string") {

                option.value = item;
                option.textContent = item;

            } else {

                option.value = item.id;
                option.textContent = item.name;

            }

            select.appendChild(option);

        });

        if (
            [...select.options].some(
                o => o.value === atual
            )
        ) {

            select.value = atual;

        }

    }

    function preencherFiltros() {

        const manifesto =
            motor.getManifesto();

        const resumo = motor.resumo();

        preencherSelect(
            "simCareer",
            motor.carreiras
        );

        preencherSelect(
            "simBanca",
            motor.bancas
        );

        preencherSelect(
            "simDisc",
            resumo.disciplinas
        );

        preencherSelect(
            "simDifficulty",
            motor.niveis
        );

        preencherSelect(
            "simContent",
            manifesto?.contentTypes || []
        );

    }

    /* LEITURA DOS FILTROS */

    function obterFiltros() {

        const filtros = {

            career: valor("simCareer"),

            bank: valor("simBanca"),

            disc: valor("simDisc"),

            difficulty: valor("simDifficulty"),

            contentType: valor("simContent"),

            court: valor("simCourt"),

            pesquisa: valor("simSearch"),

            count: Number(valor("simCount")) || 10,

            shuffle: true

        };

        if (valor("simPool") === "errors") {

            filtros.ids = lerStorage(
                CHAVE_ERROS
            ).map(String);

        }

        return filtros;

    }

    /* DISPONIBILIDADE */

    function atualizarDisponibilidade() {

        const aviso = $("availability");

        const botao = $("startButton");

        const resumoEl = $("missionSummary");

        if (!aviso || !botao || !resumoEl) return;

        if (!motor || !pronto) {

            botao.disabled = true;

            return;

        }

        const filtros = obterFiltros();

        const disponiveis =
            motor.filtrar(filtros);

        const resumo = motor.resumo();

        resumoEl.innerHTML = `

            <strong>Banco de treinamento</strong>

            <p class="small">

                ${resumo.validadas}
                questão(ões) validada(s).

                ${resumo.pendentes}
                aguardando revisão jurídica.

            </p>

            ${resumo.erros.length ? `

                <p class="small muted">

                    ${resumo.erros.length}
                    aviso(s) de carregamento.

                </p>

            ` : ""}

        `;

        const quantidade = Math.min(

            filtros.count,

            disponiveis.length

        );

        if (!disponiveis.length) {

            aviso.textContent =
                "Nenhuma questão validada corresponde " +
                "aos filtros selecionados.";

            botao.disabled = true;

            return;

        }

        aviso.textContent =

            `${disponiveis.length} questão(ões) disponível(is). ` +

            `Seu simulado terá ${quantidade} questão(ões).`;

        botao.disabled = false;

    }

    /* CARREGAMENTO */

    async function inicializar() {

        if (inicializado) return true;

        if (carregando) return carregando;

        montarInterface();

        if (!motor) return false;

        carregando = (async () => {

            try {

                await motor.carregarBanco();

                preencherFiltros();

                pronto = true;

                inicializado = true;

                atualizarDisponibilidade();

                atualizarIndicadores();

                return true;

            } catch (error) {

                pronto = false;

                $("startButton").disabled = true;

                $("availability").textContent =

                    "Erro ao carregar o banco: " +

                    error.message;

                return false;

            }

        })();

        try {

            return await carregando;

        } finally {

            carregando = null;

        }

    }

    /* CRONOMETRO */

    function atualizarCronometro() {

        if (!emAndamento) return;

        duracao = Math.floor(

            (Date.now() - inicio) / 1000

        );

        const elemento = $("djQuizClock");

        if (elemento) {

            elemento.textContent =
                formatarTempo(duracao);

        }

    }

    function iniciarCronometro() {

        pararCronometro();

        inicio = Date.now();

        duracao = 0;

        cronometro = setInterval(

            atualizarCronometro,

            1000

        );

        atualizarCronometro();

    }

    function pararCronometro() {

        if (cronometro !== null) {

            clearInterval(cronometro);

            cronometro = null;

        }

    }

    /* INICIO DO SIMULADO */

    function iniciarSimulado() {

        if (!pronto || emAndamento) return;

        const filtros = obterFiltros();

        questoes = motor.criarSimulado(filtros);

        if (!questoes.length) {

            atualizarDisponibilidade();

            return;

        }

        respostas = {};

        configuracao = {

            ...filtros,

            mode: valor("simMode") || "end",

            penalty:
                valor("simPenalty") === "cebraspe",

            pool: valor("simPool")

        };

        finalizado = false;

        emAndamento = true;

        $("config").hidden = true;

        $("result").hidden = true;

        $("quiz").hidden = false;

        desenharSimulado();

        iniciarCronometro();

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }

    /* MONTAGEM DAS QUESTOES */

    function desenharSimulado() {

        $("quiz").innerHTML = `

            <div class="panel">

                <div class="dj-kicker">

                    TREINAMENTO EM ANDAMENTO

                </div>

                <h2>Simulado personalizado</h2>

                <div class="dj-clock">

                    Tempo:

                    <span id="djQuizClock">

                        00:00:00

                    </span>

                </div>

                <p id="djQuizProgress">

                    0 de ${questoes.length}
                    respondidas

                </p>

                <progress

                    id="djQuizProgressBar"

                    max="${questoes.length}"

                    value="0"

                    style="width:100%;
                           accent-color:#d5ad59">

                </progress>

                <p class="small muted">

                    ${configuracao.mode === "immediate"

                        ? "Correção imediata"

                        : "Correção ao finalizar"}

                </p>

            </div>

            ${questoes.map((q, i) => `

                <article

                    class="dj-question"

                    id="dj-question-${i}">

                    <div>

                        <span class="tag">

                            Questão ${i + 1}

                        </span>

                        <span class="tag">

                            ${esc(q.bank)}

                        </span>

                        <span class="tag">

                            ${esc(q.difficulty)}

                        </span>

                    </div>

                    <p class="small muted">

                        ${esc(q.disc)}

                        • ${esc(q.topic)}

                    </p>

                    <p style="white-space:pre-line">

                        ${esc(q.prompt)}

                    </p>

                    <div>

                        ${q.opts.map((opcao, j) => `

                            <label class="dj-option">

                                <input

                                    type="radio"

                                    name="dj-question-${i}"

                                    value="${j}"

                                    data-question="${i}"

                                    data-option="${j}">

                                <span>

                                    ${q.bank === "CEBRASPE"

                                        ? ""

                                        : `<strong>

                                            ${String.fromCharCode(65+j)})

                                           </strong>`}

                                    ${esc(opcao)}

                                </span>

                            </label>

                        `).join("")}

                    </div>

                    <div id="dj-feedback-${i}"></div>

                </article>

            `).join("")}

            <div class="panel">

                <button

                    id="djFinishQuiz"

                    class="btn"

                    type="button"

                    style="width:100%">

                    FINALIZAR MISSÃO

                </button>

                <button

                    id="djCancelQuiz"

                    class="btn secondary"

                    type="button"

                    style="width:100%;
                           margin-top:10px">

                    Cancelar simulado

                </button>

            </div>

        `;

        $("quiz").querySelectorAll(

            "input[data-question]"

        ).forEach(input => {

            input.addEventListener("change", () => {

                responder(

                    Number(input.dataset.question),

                    Number(input.dataset.option)

                );

            });

        });

        $("djFinishQuiz").addEventListener(

            "click",

            finalizarSimulado

        );

        $("djCancelQuiz").addEventListener(

            "click",

            cancelarSimulado

        );

    }

    /* REGISTRO DAS RESPOSTAS */

    function responder(indice, alternativa) {

        if (

            !emAndamento ||

            finalizado ||

            !questoes[indice] ||

            !Number.isInteger(alternativa) ||

            alternativa < 0 ||

            alternativa >= questoes[indice].opts.length

        ) return;

        if (

            configuracao.mode === "immediate" &&

            respostas[indice] !== undefined

        ) return;

        respostas[indice] = alternativa;

        if (configuracao.mode === "immediate") {

            document.querySelectorAll(

                `input[name="dj-question-${indice}"]`

            ).forEach(input => {

                input.disabled = true;

            });

            motor.montarResolucao(

                $("dj-feedback-" + indice),

                questoes[indice],

                alternativa,

                true

            );

        }

        atualizarProgresso();

    }

    function atualizarProgresso() {

        const respondidas =

            Object.keys(respostas).length;

        const texto = $("djQuizProgress");

        const barra = $("djQuizProgressBar");

        if (texto) {

            texto.textContent =

                `${respondidas} de ` +

                `${questoes.length} respondidas`;

        }

        if (barra) {

            barra.value = respondidas;

        }

    }

    /* FINALIZACAO */

    function finalizarSimulado() {

        if (!emAndamento || finalizado) return;

        const brancos =

            questoes.length -

            Object.keys(respostas).length;

        if (brancos > 0) {

            const confirmar = confirm(

                `Você deixou ${brancos} questão(ões) ` +

                "em branco. Deseja finalizar?"

            );

            if (!confirmar) return;

        }

        atualizarCronometro();

        pararCronometro();

        finalizado = true;

        emAndamento = false;

        const resultado = motor.corrigir(

            questoes,

            respostas,

            {

                penalty: configuracao.penalty

            }

        );

        const salvo = registrarResultado(resultado);

        $("quiz").hidden = true;

        $("result").hidden = false;

        desenharResultado(resultado, salvo);

        atualizarIndicadores();

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }

    /* HISTORICO E CADERNO DE ERROS */

    function registrarResultado(resultado) {

        const historico = lerStorage(

            CHAVE_RESULTADOS

        );

        const bancas = [...new Set(

            questoes.map(q => q.bank)

        )];

        const registro = {

            date: new Date().toISOString(),

            bank: bancas.length === 1

                ? bancas[0]

                : "MISTA",

            disc: configuracao.disc ||

                "Todas as disciplinas",

            career: configuracao.career ||

                "Todas as carreiras",

            correct: resultado.acertos,

            wrong: resultado.erros,

            blank: resultado.brancos,

            total: resultado.total,

            percent: resultado.percentual,

            score: resultado.pontuacao,

            penalties: resultado.penalidades,

            duration: duracao,

            mode: configuracao.mode,

            penalty: configuracao.penalty,

            porDisciplina: resultado.porDisciplina,

            porBanca: resultado.porBanca,

            version: "4.0.0"

        };

        historico.push(registro);

        const erros = new Set(

            lerStorage(CHAVE_ERROS).map(String)

        );

        resultado.detalhes.forEach(detalhe => {

            if (detalhe.estado === "acertos") {

                erros.delete(detalhe.id);

            } else {

                erros.add(detalhe.id);

            }

        });

        const salvouHistorico = salvarStorage(

            CHAVE_RESULTADOS,

            historico

        );

        const salvouErros = salvarStorage(

            CHAVE_ERROS,

            [...erros]

        );

        return salvouHistorico && salvouErros;

    }

    /* PAINEL DE RESULTADOS */

    function desenharResultado(r, salvo) {

        $("result").innerHTML = `

            <div class="panel">

                <div class="dj-kicker">

                    MISSÃO CONCLUÍDA

                </div>

                <h1>Relatório de desempenho</h1>

                <p class="muted">

                    Cada questão é uma oportunidade

                    de evolução.

                </p>

                ${!salvo ? `

                    <p class="bad">

                        Não foi possível salvar todo

                        o desempenho no navegador.

                    </p>

                ` : ""}

                <div class="cards">

                    ${[

                        ["Aproveitamento",
                         r.percentual + "%"],

                        ["Acertos", r.acertos],

                        ["Erros", r.erros],

                        ["Em branco", r.brancos],

                        ["Pontuação", r.pontuacao],

                        ["Tempo", formatarTempo(duracao)]

                    ].map(([titulo, valor]) => `

                        <div class="card">

                            <div class="muted small">

                                ${esc(titulo)}

                            </div>

                            <div class="metric">

                                ${esc(valor)}

                            </div>

                        </div>

                    `).join("")}

                </div>

                ${configuracao.penalty ? `

                    <p class="small muted">

                        Penalidades CEBRASPE:

                        ${r.penalidades}.

                        Questões de outras bancas

                        não recebem desconto.

                    </p>

                ` : ""}

            </div>

            <div class="panel">

                <h2>Desempenho por disciplina</h2>

                ${Object.entries(r.porDisciplina)

                    .map(([nome, dados]) => `

                        <p>

                            <strong>${esc(nome)}</strong>

                            <br>

                            ${dados.acertos} de

                            ${dados.total} acertos

                        </p>

                        <progress

                            max="${dados.total}"

                            value="${dados.acertos}"

                            style="width:100%;
                                   accent-color:#d5ad59">

                        </progress>

                    `).join("")}

            </div>

            <div class="panel">

                <h2>Gabarito comentado</h2>

                <p class="muted small">

                    Abra as abas de comentário e

                    alternativas para revisar

                    cada questão.

                </p>

            </div>

            ${questoes.map((q, i) => `

                <article class="dj-question">

                    <span class="tag">

                        Questão ${i + 1}

                    </span>

                    <span class="tag">

                        ${esc(q.bank)}

                    </span>

                    <p class="small muted">

                        ${esc(q.disc)}

                        • ${esc(q.topic)}

                    </p>

                    <p style="white-space:pre-line">

                        ${esc(q.prompt)}

                    </p>

                    <div id="dj-result-feedback-${i}">

                    </div>

                </article>

            `).join("")}

            <button

                id="djNewQuiz"

                class="btn"

                type="button"

                style="width:100%">

                INICIAR NOVA MISSÃO

            </button>

        `;

        questoes.forEach((q, i) => {

            motor.montarResolucao(

                $("dj-result-feedback-" + i),

                q,

                respostas[i],

                true

            );

        });

        $("djNewQuiz").addEventListener(

            "click",

            resetarSimulado

        );

    }

    /* CANCELAMENTO E REINICIO */

    function cancelarSimulado() {

        if (

            emAndamento &&

            !confirm(

                "Cancelar o simulado? " +

                "As respostas não serão salvas."

            )

        ) return false;

        resetarSimulado();

        return true;

    }

    function resetarSimulado() {

        pararCronometro();

        questoes = [];

        respostas = {};

        configuracao = {};

        inicio = 0;

        duracao = 0;

        finalizado = false;

        emAndamento = false;

        $("quiz").replaceChildren();

        $("result").replaceChildren();

        $("quiz").hidden = true;

        $("result").hidden = true;

        $("config").hidden = false;

        atualizarDisponibilidade();

    }

    /* CADERNO DE ERROS */

    function renderErros() {

        const container = $("errorList");

        if (!container || !motor) return;

        container.replaceChildren();

        if (!pronto) {

            container.textContent =

                "Carregando questões...";

            return;

        }

        const ids = lerStorage(

            CHAVE_ERROS

        ).map(String);

        const lista = motor.filtrar({

            ids

        });

        if ($("errorCount")) {

            $("errorCount").textContent =

                `${lista.length} questão(ões) ` +

                "disponível(is) para revisão.";

        }

        if (!lista.length) {

            container.textContent =

                "Nenhuma questão validada " +

                "disponível no caderno de erros.";

            return;

        }

        lista.forEach((q, i) => {

            const card =

                document.createElement("article");

            card.className = "dj-question";

            card.innerHTML = `

                <span class="tag">

                    ${esc(q.bank)}

                </span>

                <h3>${esc(q.topic)}</h3>

                <p class="small muted">

                    ${esc(q.disc)}

                </p>

                <p style="white-space:pre-line">

                    ${esc(q.prompt)}

                </p>

                <div class="dj-error-resolution"></div>

                <button

                    class="btn secondary"

                    type="button">

                    Marcar como revisada

                </button>

            `;

            container.appendChild(card);

            motor.montarResolucao(

                card.querySelector(

                    ".dj-error-resolution"

                ),

                q,

                null,

                true

            );

            card.querySelector("button.btn")

                .addEventListener("click", () => {

                    const restantes = lerStorage(

                        CHAVE_ERROS

                    ).filter(

                        id => String(id) !== q.id

                    );

                    if (!salvarStorage(

                        CHAVE_ERROS,

                        restantes

                    )) {

                        alert(

                            "Não foi possível salvar."

                        );

                        return;

                    }

                    renderErros();

                    atualizarIndicadores();

                });

        });

    }

    /* TREINAMENTO DOS ERROS */

    async function treinarErros() {

        if (!(await inicializar())) return;

        if (

            emAndamento &&

            !cancelarSimulado()

        ) return;

        resetarSimulado();

        [

            "simCareer",

            "simBanca",

            "simDisc",

            "simDifficulty",

            "simContent",

            "simCourt",

            "simSearch"

        ].forEach(id => {

            if ($(id)) $(id).value = "";

        });

        $("simPool").value = "errors";

        abrirPaginaSimulados();

        atualizarDisponibilidade();

    }

    function limparErros() {

        if (!confirm(

            "Deseja limpar todo o caderno de erros?"

        )) return;

        if (!salvarStorage(CHAVE_ERROS, [])) {

            alert("Não foi possível salvar.");

            return;

        }

        renderErros();

        atualizarIndicadores();

        atualizarDisponibilidade();

    }

    /* DESEMPENHO GERAL */

    function renderDesempenho() {

        const container = $("stats");

        if (!container) return;

        const historico = lerStorage(

            CHAVE_RESULTADOS

        );

        if (!historico.length) {

            container.innerHTML = `

                <div class="panel">

                    Nenhum simulado concluído.

                </div>

            `;

            return;

        }

        const total = historico.reduce(

            (soma, r) =>

                soma + (Number(r.total) || 0),

            0

        );

        const acertos = historico.reduce(

            (soma, r) =>

                soma + (Number(r.correct) || 0),

            0

        );

        const erros = historico.reduce(

            (soma, r) =>

                soma + (Number(r.wrong) || 0),

            0

        );

        const media = total

            ? Math.round(acertos / total * 100)

            : 0;

        const tempo = historico.reduce(

            (soma, r) =>

                soma + (Number(r.duration) || 0),

            0

        );

        container.innerHTML = `

            <div class="cards">

                ${[

                    ["Simulados", historico.length],

                    ["Questões", total],

                    ["Acertos", acertos],

                    ["Erros", erros],

                    ["Aproveitamento", media + "%"],

                    ["Tempo registrado",
                     formatarTempo(tempo)]

                ].map(([nome, valor]) => `

                    <div class="card">

                        <div class="muted small">

                            ${esc(nome)}

                        </div>

                        <div class="metric">

                            ${esc(valor)}

                        </div>

                    </div>

                `).join("")}

            </div>

            <div class="panel">

                <h2>Histórico de treinamento</h2>

                ${historico.slice().reverse()

                    .map(r => `

                        <div class="dj-question">

                            <span class="tag">

                                ${esc(r.bank || "MISTA")}

                            </span>

                            <h3>

                                ${esc(r.disc ||

                                    "Todas as disciplinas")}

                            </h3>

                            <p class="small muted">

                                ${esc(dataFormatada(r.date))}

                            </p>

                            <p>

                                Acertos:

                                ${esc(r.correct || 0)}

                                /

                                ${esc(r.total || 0)}

                            </p>

                            <p>

                                Aproveitamento:

                                ${esc(r.percent || 0)}%

                            </p>

                            ${r.score !== undefined ? `

                                <p>

                                    Pontuação:

                                    ${esc(r.score)}

                                </p>

                            ` : ""}

                            ${r.duration !== undefined ? `

                                <p>

                                    Tempo:

                                    ${formatarTempo(r.duration)}

                                </p>

                            ` : ""}

                        </div>

                    `).join("")}

            </div>

        `;

    }

    function limparHistorico() {

        if (!confirm(

            "Deseja apagar o histórico de simulados?"

        )) return;

        if (!salvarStorage(

            CHAVE_RESULTADOS,

            []

        )) {

            alert("Não foi possível salvar.");

            return;

        }

        renderDesempenho();

        atualizarIndicadores();

    }

    /* INDICADORES DA PAGINA INICIAL */

    function atualizarIndicadores() {

        if (!motor || !pronto) return;

        const resumo = motor.resumo();

        const historico = lerStorage(

            CHAVE_RESULTADOS

        );

        const total = historico.reduce(

            (s, r) => s + (Number(r.total) || 0),

            0

        );

        const acertos = historico.reduce(

            (s, r) => s + (Number(r.correct) || 0),

            0

        );

        const indicadores = {

            nQuestions: resumo.validadas,

            nSim: historico.length,

            media: total

                ? Math.round(acertos / total * 100) + "%"

                : "0%",

            nErrors: motor.filtrar({

                ids: lerStorage(CHAVE_ERROS)

            }).length

        };

        Object.entries(indicadores)

            .forEach(([id, valor]) => {

                if ($(id)) {

                    $(id).textContent = valor;

                }

            });

    }

    /* NAVEGACAO */

    function abrirPaginaSimulados() {

        if (typeof window.go === "function") {

            window.go("simulados");

            return;

        }

        document.querySelectorAll("main > section")

            .forEach(section => {

                section.hidden =

                    section.id !== "simulados";

            });

        document.querySelectorAll(".nav[data-page]")

            .forEach(nav => {

                nav.classList.toggle(

                    "active",

                    nav.dataset.page === "simulados"

                );

            });

        window.scrollTo(0, 0);

    }

    /* SELECAO RAPIDA DE BANCA */

    async function selecionarBanca(banca) {

        if (!(await inicializar())) return;

        if (

            emAndamento &&

            !cancelarSimulado()

        ) return;

        resetarSimulado();

        [

            "simCareer",

            "simDisc",

            "simDifficulty",

            "simContent",

            "simCourt",

            "simSearch"

        ].forEach(id => {

            if ($(id)) $(id).value = "";

        });

        $("simBanca").value =

            motor.bancas.includes(banca)

                ? banca

                : "";

        $("simPool").value = "all";

        abrirPaginaSimulados();

        atualizarDisponibilidade();

    }

    /* ENCERRAMENTO DE SESSAO */

    function encerrarSessao() {

        pararCronometro();

        if (inicializado) {

            resetarSimulado();

        }

        if ($("errorList")) {

            $("errorList").replaceChildren();

        }

        if ($("stats")) {

            $("stats").replaceChildren();

        }

    }

    /* API PUBLICA */

    window.DeltaSimulados = Object.freeze({

        versao: "4.0.0",

        inicializar,

        atualizarDisponibilidade,

        atualizarIndicadores,

        iniciarSimulado,

        finalizarSimulado,

        cancelarSimulado,

        resetarSimulado,

        selecionarBanca,

        renderErros,

        treinarErros,

        limparErros,

        renderDesempenho,

        limparHistorico,

        encerrarSessao,

        emAndamento: () => emAndamento,

        pronto: () => pronto

    });

    console.info(

        "Delta Juris 4.0 — Central de treinamento disponível."

    );

})();

/* FIM — DELTA JURIS 4.0 */
