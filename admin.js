
/* =====================================================
   DELTA JURIS 4.0
   CENTRAL DE ADMINISTRACAO
   TACTICAL EDITION
   CARREIRAS POLICIAIS E JURIDICAS
   ===================================================== */

(function () {

    "use strict";

    /* PROTECAO CONTRA DUPLICACAO */

    if (window.DeltaAdmin) return;

    const auth = window.deltaAuth;

    const aside = document.querySelector("aside");

    if (!auth?.client || !aside) return;

    const client = auth.client;

    const $ = id => document.getElementById(id);

    /* CONFIGURACOES */

    const INTERVALO_VERIFICACAO = 60000;

    const TAMANHO_PAGINA = 500;

    const STATUS = {

        pending: "Aguardando aprovação",

        approved: "Aprovado",

        rejected: "Rejeitado",

        blocked: "Bloqueado"

    };

    const ROLES = {

        admin: "Administrador",

        student: "Aluno",

        user: "Usuário"

    };

    /* ESTADO DO SISTEMA */

    let adminId = null;

    let autorizado = false;

    let usuarios = [];

    let carregando = false;

    let alterando = false;

    let verificacao = null;

    let versaoAcesso = 0;

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

    function normalizar(value) {

        return String(value ?? "")

            .normalize("NFD")

            .replace(/[\u0300-\u036f]/g, "")

            .toLowerCase()

            .trim();

    }

    function statusLabel(status) {

        return STATUS[status] ||

            status ||

            "Não informado";

    }

    function roleLabel(role) {

        return ROLES[role] ||

            role ||

            "Usuário";

    }

    /* ESTILOS ADMINISTRATIVOS */

    const style = document.createElement("style");

    style.id = "dj-admin-style";

    style.textContent = `

        #dj-admin-open {

            display: none;

            width: 100%;

            margin-top: 14px;

            padding: 12px;

            background: #30291d;

            border: 1px solid #92713b;

            color: #f4db9b;

            border-radius: 9px;

            font: inherit;

            font-weight: 800;

            cursor: pointer;

        }

        body.dj-approved
        #dj-admin-open.dj-admin-authorized {

            display: block;

        }

        #dj-admin-panel {

            position: fixed;

            inset: 0;

            z-index: 99999;

            overflow-y: auto;

            overscroll-behavior: contain;

            background: #080808;

            color: #f0f0f0;

            padding: 24px;

            font-family: system-ui, sans-serif;

        }

        #dj-admin-panel[hidden] {

            display: none !important;

        }

        .dj-admin-inner {

            width: 100%;

            max-width: 1100px;

            margin: 0 auto;

        }

        .dj-admin-top {

            display: flex;

            justify-content: space-between;

            align-items: flex-start;

            gap: 15px;

            flex-wrap: wrap;

            margin-bottom: 20px;

        }

        .dj-admin-title {

            color: #f0f0f0;

            margin: 8px 0;

            font-size: 28px;

        }

        .dj-admin-kicker {

            color: #d5ad59;

            font-size: 11px;

            letter-spacing: 2px;

            font-weight: 850;

        }

        .dj-admin-muted {

            color: #a5a5a5;

            font-size: 13px;

            line-height: 1.6;

        }

        .dj-admin-buttons {

            display: flex;

            flex-wrap: wrap;

            gap: 8px;

        }

        .dj-admin-buttons button,

        .dj-admin-actions button {

            padding: 11px 15px;

            border: 1px solid transparent;

            border-radius: 8px;

            font: inherit;

            font-size: 13px;

            font-weight: 750;

            cursor: pointer;

        }

        .dj-admin-close {

            background: #252525;

            color: #f0f0f0;

            border-color: #49433a !important;

        }

        .dj-admin-refresh {

            background: #d5ad59;

            color: #101010;

        }

        .dj-admin-metrics {

            display: grid;

            grid-template-columns:

                repeat(auto-fit,minmax(145px,1fr));

            gap: 12px;

            margin-bottom: 20px;

        }

        .dj-admin-metric {

            background: #171717;

            border: 1px solid #38332a;

            border-radius: 12px;

            padding: 16px;

        }

        .dj-admin-metric strong {

            display: block;

            color: #f4db9b;

            font-size: 30px;

            margin-bottom: 5px;

        }

        .dj-admin-metric small {

            color: #bcbcbc;

        }

        .dj-admin-filters {

            display: grid;

            grid-template-columns:

                2fr 1fr 1fr;

            gap: 10px;

            margin: 18px 0;

        }

        .dj-admin-filters input,

        .dj-admin-filters select {

            width: 100%;

            min-width: 0;

            padding: 12px;

            background: #101010;

            color: #f0f0f0;

            border: 1px solid #49433a;

            border-radius: 8px;

            font: inherit;

        }

        #dj-admin-message:not(:empty) {

            background: #171717;

            border: 1px solid #38332a;

            border-radius: 9px;

            padding: 13px;

            margin: 14px 0;

            line-height: 1.6;

            overflow-wrap: anywhere;

        }

        #dj-admin-message[data-type="success"] {

            color: #79e0ce;

        }

        #dj-admin-message[data-type="error"] {

            color: #ffadad;

        }

        #dj-admin-message[data-type="warning"] {

            color: #f4db9b;

        }

        #dj-admin-users {

            display: grid;

            gap: 12px;

        }

        .dj-admin-user {

            background: #171717;

            border: 1px solid #38332a;

            border-radius: 12px;

            padding: 18px;

            overflow-wrap: anywhere;

        }

        .dj-admin-email {

            font-size: 16px;

            font-weight: 750;

            margin-bottom: 10px;

        }

        .dj-admin-tags {

            display: flex;

            flex-wrap: wrap;

            gap: 8px;

            margin-bottom: 14px;

        }

        .dj-admin-tag {

            display: inline-block;

            padding: 5px 9px;

            border: 1px solid #49433a;

            border-radius: 6px;

            font-size: 11px;

            background: #202020;

            color: #dedede;

        }

        .dj-admin-status-approved {

            background: #17382f;

            color: #79e0ce;

            border-color: #285b4e;

        }

        .dj-admin-status-pending {

            background: #30291d;

            color: #f4db9b;

        }

        .dj-admin-status-blocked,

        .dj-admin-status-rejected {

            background: #382222;

            color: #ffadad;

            border-color: #855252;

        }

        .dj-admin-role-admin {

            background: #30291d;

            color: #f4db9b;

        }

        .dj-admin-actions {

            display: flex;

            flex-wrap: wrap;

            gap: 8px;

            margin-top: 12px;

        }

        .dj-admin-approve {

            background: #79e0ce;

            color: #102820;

        }

        .dj-admin-reject {

            background: #f2a0a0;

            color: #321018;

        }

        .dj-admin-block {

            background: #d5ad59;

            color: #332000;

        }

        .dj-admin-pending {

            background: #252525;

            color: #f0f0f0;

            border-color: #49433a !important;

        }

        #dj-admin-panel button:disabled {

            opacity: .45;

            cursor: not-allowed;

        }

        @media(max-width:800px) {

            #dj-admin-panel {

                padding: 14px;

            }

            .dj-admin-title {

                font-size: 24px;

            }

            .dj-admin-filters {

                grid-template-columns: 1fr;

            }

            .dj-admin-metrics {

                grid-template-columns:

                    repeat(2,minmax(0,1fr));

            }

        }

        @media(max-width:480px) {

            .dj-admin-user {

                padding: 14px;

            }

            .dj-admin-actions button {

                flex: 1 1 110px;

            }

            .dj-admin-buttons {

                width: 100%;

            }

            .dj-admin-buttons button {

                flex: 1;

            }

        }

    `;

    document.head.appendChild(style);

    /* BOTAO ADMINISTRATIVO */

    let botao = $("dj-admin-open");

    if (!botao) {

        botao = document.createElement("button");

        botao.id = "dj-admin-open";

        botao.type = "button";

        botao.textContent = "⚙ Administração";

        aside.appendChild(botao);

    }

    /* PAINEL ADMINISTRATIVO */

    const painel = document.createElement("div");

    painel.id = "dj-admin-panel";

    painel.hidden = true;

    painel.setAttribute("role", "dialog");

    painel.setAttribute("aria-modal", "true");

    painel.setAttribute(

        "aria-labelledby",

        "dj-admin-title"

    );

    painel.innerHTML = `

        <div class="dj-admin-inner">

            <div class="dj-admin-top">

                <div>

                    <div class="dj-admin-kicker">

                        DELTA JURIS 4.0
                        • TACTICAL EDITION

                    </div>

                    <h1

                        id="dj-admin-title"

                        class="dj-admin-title">

                        CENTRAL DE COMANDO

                    </h1>

                    <p class="dj-admin-muted">

                        Gerenciamento de usuários
                        e autorizações de acesso.

                    </p>

                </div>

                <div class="dj-admin-buttons">

                    <button

                        id="dj-admin-refresh"

                        class="dj-admin-refresh"

                        type="button">

                        Atualizar

                    </button>

                    <button

                        id="dj-admin-close"

                        class="dj-admin-close"

                        type="button">

                        Fechar painel

                    </button>

                </div>

            </div>

            <div

                id="dj-admin-metrics"

                class="dj-admin-metrics">

            </div>

            <div class="dj-admin-filters">

                <input

                    id="dj-admin-search"

                    type="search"

                    aria-label="Pesquisar usuário"

                    placeholder="Pesquisar por e-mail">

                <select

                    id="dj-admin-status-filter"

                    aria-label="Filtrar por status">

                    <option value="all">

                        Todos os status

                    </option>

                    <option value="pending">

                        Aguardando aprovação

                    </option>

                    <option value="approved">

                        Aprovados

                    </option>

                    <option value="rejected">

                        Rejeitados

                    </option>

                    <option value="blocked">

                        Bloqueados

                    </option>

                </select>

                <select

                    id="dj-admin-role-filter"

                    aria-label="Filtrar por perfil">

                    <option value="all">

                        Todos os perfis

                    </option>

                    <option value="admin">

                        Administradores

                    </option>

                    <option value="nonadmin">

                        Alunos e usuários

                    </option>

                </select>

            </div>

            <div

                id="dj-admin-message"

                role="status"

                aria-live="polite">

            </div>

            <p

                id="dj-admin-count"

                class="dj-admin-muted">

            </p>

            <div id="dj-admin-users"></div>

            <p

                id="dj-admin-last-update"

                class="dj-admin-muted">

            </p>

        </div>

    `;

    document.body.appendChild(painel);

    /* MENSAGENS */

    function mensagem(texto, tipo = "info") {

        const elemento = $("dj-admin-message");

        elemento.textContent = texto;

        elemento.dataset.type = tipo;

    }

    /* FECHAMENTO DO PAINEL */

    function fecharPainel() {

        painel.hidden = true;

        if (

            autorizado &&

            document.body.classList.contains(

                "dj-approved"

            )

        ) {

            botao.focus();

        }

    }

    /* REVOGACAO DA AUTORIZACAO */

    function revogarAcesso() {

        versaoAcesso++;

        autorizado = false;

        adminId = null;

        usuarios = [];

        botao.classList.remove(

            "dj-admin-authorized"

        );

        painel.hidden = true;

        $("dj-admin-users").replaceChildren();

        $("dj-admin-metrics").replaceChildren();

        $("dj-admin-count").textContent = "";

        $("dj-admin-last-update").textContent = "";

        $("dj-admin-search").value = "";

        mensagem("");

    }

    /* VERIFICACAO ADMINISTRATIVA */

    async function executarVerificacao() {

        const versao = versaoAcesso;

        try {

            const {

                data,

                error

            } = await client.auth.getUser();

            if (versao !== versaoAcesso) {

                return false;

            }

            if (error || !data?.user) {

                revogarAcesso();

                return false;

            }

            const profile = await auth.getProfile();

            if (versao !== versaoAcesso) {

                return false;

            }

            const permitido = Boolean(

                profile &&

                profile.id === data.user.id &&

                profile.status === "approved" &&

                profile.role === "admin"

            );

            if (!permitido) {

                revogarAcesso();

                return false;

            }

            adminId = profile.id;

            autorizado = true;

            botao.classList.add(

                "dj-admin-authorized"

            );

            return true;

        } catch (error) {

            if (versao === versaoAcesso) {

                revogarAcesso();

            }

            console.warn(

                "Falha na autorização administrativa:",

                error

            );

            return false;

        }

    }

    async function verificarAdmin() {

        if (verificacao) return verificacao;

        verificacao = executarVerificacao();

        try {

            return await verificacao;

        } finally {

            verificacao = null;

        }

    }

    /* INDICADORES */

    function renderIndicadores() {

        const total = usuarios.length;

        const aprovados = usuarios.filter(

            u => u.status === "approved"

        ).length;

        const pendentes = usuarios.filter(

            u => u.status === "pending"

        ).length;

        const rejeitados = usuarios.filter(

            u => u.status === "rejected"

        ).length;

        const bloqueados = usuarios.filter(

            u => u.status === "blocked"

        ).length;

        const administradores = usuarios.filter(

            u => u.role === "admin"

        ).length;

        const indicadores = [

            ["Total de usuários", total, "#f4db9b"],

            ["Aprovados", aprovados, "#79e0ce"],

            ["Pendentes", pendentes, "#d5ad59"],

            ["Bloqueados", bloqueados, "#ffadad"],

            ["Rejeitados", rejeitados, "#ffadad"],

            ["Administradores", administradores, "#f4db9b"]

        ];

        $("dj-admin-metrics").innerHTML =

            indicadores.map(([nome, valor, cor]) => `

                <div class="dj-admin-metric">

                    <strong style="color:${cor}">

                        ${valor}

                    </strong>

                    <small>${esc(nome)}</small>

                </div>

            `).join("");

    }

    /* FILTROS */

    function filtrarUsuarios() {

        const pesquisa = normalizar(

            $("dj-admin-search").value

        );

        const status =

            $("dj-admin-status-filter").value;

        const role =

            $("dj-admin-role-filter").value;

        return usuarios.filter(user => {

            if (

                pesquisa &&

                !normalizar(user.email)

                    .includes(pesquisa)

            ) {

                return false;

            }

            if (

                status !== "all" &&

                user.status !== status

            ) {

                return false;

            }

            if (

                role === "admin" &&

                user.role !== "admin"

            ) {

                return false;

            }

            if (

                role === "nonadmin" &&

                user.role === "admin"

            ) {

                return false;

            }

            return true;

        });

    }

    /* CRIACAO DOS BOTOES */

    function criarAcao(

        texto,

        classe,

        user,

        status

    ) {

        const button = document.createElement(

            "button"

        );

        button.type = "button";

        button.className = classe;

        button.textContent = texto;

        button.disabled = alterando || carregando;

        button.addEventListener("click", () => {

            alterarStatus(user, status);

        });

        return button;

    }

    /* LISTAGEM DOS USUARIOS */

    function renderUsuarios() {

        const container = $("dj-admin-users");

        container.replaceChildren();

        const lista = filtrarUsuarios();

        $("dj-admin-count").textContent =

            `${lista.length} de ${usuarios.length} ` +

            "usuário(s) encontrado(s).";

        if (!lista.length) {

            const vazio = document.createElement("p");

            vazio.className = "dj-admin-muted";

            vazio.textContent =

                "Nenhum usuário corresponde aos filtros.";

            container.appendChild(vazio);

            return;

        }

        lista.forEach(user => {

            const card = document.createElement(

                "article"

            );

            card.className = "dj-admin-user";

            const email = document.createElement(

                "div"

            );

            email.className = "dj-admin-email";

            email.textContent =

                user.email || "E-mail não informado";

            card.appendChild(email);

            const tags = document.createElement(

                "div"

            );

            tags.className = "dj-admin-tags";

            const tagStatus = document.createElement(

                "span"

            );

            tagStatus.className = "dj-admin-tag";

            if (

                Object.prototype.hasOwnProperty.call(

                    STATUS,

                    user.status

                )

            ) {

                tagStatus.classList.add(

                    "dj-admin-status-" + user.status

                );

            }

            tagStatus.textContent =

                statusLabel(user.status);

            tags.appendChild(tagStatus);

            const tagRole = document.createElement(

                "span"

            );

            tagRole.className = "dj-admin-tag";

            tagRole.textContent =

                roleLabel(user.role);

            if (user.role === "admin") {

                tagRole.classList.add(

                    "dj-admin-role-admin"

                );

            }

            tags.appendChild(tagRole);

            if (user.id === adminId) {

                const tagAtual = document.createElement(

                    "span"

                );

                tagAtual.className = "dj-admin-tag";

                tagAtual.textContent = "Sua conta";

                tags.appendChild(tagAtual);

            }

            card.appendChild(tags);

            /* PROTECAO DAS CONTAS ADMINISTRATIVAS */

            if (

                user.id === adminId ||

                user.role === "admin"

            ) {

                const aviso = document.createElement(

                    "p"

                );

                aviso.className = "dj-admin-muted";

                aviso.textContent =

                    "Conta administrativa protegida neste painel.";

                card.appendChild(aviso);

                container.appendChild(card);

                return;

            }

            const acoes = document.createElement(

                "div"

            );

            acoes.className = "dj-admin-actions";

            /* APROVAR OU REATIVAR */

            if (user.status !== "approved") {

                acoes.appendChild(

                    criarAcao(

                        user.status === "blocked" ||

                        user.status === "rejected"

                            ? "Reativar acesso"

                            : "Aprovar",

                        "dj-admin-approve",

                        user,

                        "approved"

                    )

                );

            }

            /* REJEITAR */

            if (user.status !== "rejected") {

                acoes.appendChild(

                    criarAcao(

                        "Rejeitar",

                        "dj-admin-reject",

                        user,

                        "rejected"

                    )

                );

            }

            /* BLOQUEAR */

            if (user.status !== "blocked") {

                acoes.appendChild(

                    criarAcao(

                        "Bloquear",

                        "dj-admin-block",

                        user,

                        "blocked"

                    )

                );

            }

            card.appendChild(acoes);

            container.appendChild(card);

        });

    }

    /* CONTROLE DE OPERACOES */

    function atualizarBotoes() {

        const ocupado = carregando || alterando;

        $("dj-admin-refresh").disabled = ocupado;

        $("dj-admin-users")

            .querySelectorAll("button")

            .forEach(button => {

                button.disabled = ocupado;

            });

    }

    /* CARREGAMENTO DOS USUARIOS */

    async function carregarUsuarios() {

        if (carregando) return false;

        carregando = true;

        atualizarBotoes();

        const versao = versaoAcesso;

        try {

            if (!(await verificarAdmin())) {

                return false;

            }

            if (versao !== versaoAcesso) {

                return false;

            }

            mensagem("Carregando usuários...");

            const lista = [];

            let inicio = 0;

            /* CONSULTA PAGINADA */

            while (true) {

                const {

                    data,

                    error

                } = await client

                    .from("profiles")

                    .select("id,email,status,role")

                    .order("email", {

                        ascending: true

                    })

                    .order("id", {

                        ascending: true

                    })

                    .range(

                        inicio,

                        inicio + TAMANHO_PAGINA - 1

                    );

                if (versao !== versaoAcesso) {

                    return false;

                }

                if (error) throw error;

                const pagina = data || [];

                lista.push(...pagina);

                if (pagina.length < TAMANHO_PAGINA) {

                    break;

                }

                inicio += TAMANHO_PAGINA;

            }

            if (

                versao !== versaoAcesso ||

                !autorizado

            ) {

                return false;

            }

            usuarios = lista;

            renderIndicadores();

            renderUsuarios();

            $("dj-admin-last-update").textContent =

                "Última atualização: " +

                new Date().toLocaleString("pt-BR");

            mensagem("");

            return true;

        } catch (error) {

            if (versao !== versaoAcesso) {

                return false;

            }

            usuarios = [];

            renderIndicadores();

            renderUsuarios();

            mensagem(

                "Não foi possível carregar os usuários. " +

                (error.message || "Erro desconhecido."),

                "error"

            );

            console.error(error);

            return false;

        } finally {

            carregando = false;

            atualizarBotoes();

        }

    }

    /* ALTERACAO DE STATUS */

    async function alterarStatus(user, status) {

        if (alterando || carregando) return;

        if (

            !["approved", "rejected", "blocked"]

                .includes(status)

        ) {

            mensagem("Status inválido.", "error");

            return;

        }

        if (

            !user?.id ||

            user.id === adminId ||

            user.role === "admin"

        ) {

            mensagem(

                "Não é permitido alterar esta conta.",

                "warning"

            );

            return;

        }

        const labels = {

            approved: "aprovar ou reativar",

            rejected: "rejeitar",

            blocked: "bloquear"

        };

        const confirmar = confirm(

            `Deseja ${labels[status]} o acesso de ` +

            `${user.email || "este usuário"}?`

        );

        if (!confirmar) return;

        alterando = true;

        atualizarBotoes();

        const versao = versaoAcesso;

        try {

            /* REVALIDACAO DO ADMINISTRADOR */

            if (!(await verificarAdmin())) {

                return;

            }

            if (versao !== versaoAcesso) {

                return;

            }

            /* CONFERENCIA DO PERFIL ALVO */

            const {

                data: alvo,

                error: erroAlvo

            } = await client

                .from("profiles")

                .select("id,email,status,role")

                .eq("id", user.id)

                .single();

            if (versao !== versaoAcesso) {

                return;

            }

            if (erroAlvo) throw erroAlvo;

            if (

                !alvo ||

                alvo.id === adminId ||

                alvo.role === "admin"

            ) {

                throw new Error(

                    "Conta protegida ou indisponível."

                );

            }

            if (alvo.status === status) {

                await carregarUsuarios();

                mensagem(

                    "O usuário já possui este status.",

                    "warning"

                );

                return;

            }

            mensagem("Atualizando autorização...");

            /* ATUALIZACAO NO SUPABASE */

            const {

                data,

                error

            } = await client

                .from("profiles")

                .update({

                    status: status

                })

                .eq("id", alvo.id)

                .neq("id", adminId)

                .neq("role", "admin")

                .eq("status", alvo.status)

                .select("id,status");

            if (versao !== versaoAcesso) {

                return;

            }

            if (error) throw error;

            if (

                !Array.isArray(data) ||

                data.length !== 1 ||

                data[0].id !== alvo.id ||

                data[0].status !== status

            ) {

                throw new Error(

                    "A alteração não foi confirmada. " +

                    "Verifique as permissões ou atualize a lista."

                );

            }

            const atualizado = await carregarUsuarios();

            if (

                versao !== versaoAcesso ||

                !autorizado

            ) {

                return;

            }

            if (atualizado) {

                mensagem(

                    "Autorização atualizada com sucesso: " +

                    statusLabel(status) + ".",

                    "success"

                );

            } else {

                mensagem(

                    "Status alterado, mas não foi possível " +

                    "atualizar a listagem.",

                    "warning"

                );

            }

        } catch (error) {

            if (versao !== versaoAcesso) {

                return;

            }

            mensagem(

                "Não foi possível alterar a autorização. " +

                (error.message || "Erro desconhecido."),

                "error"

            );

            console.error(error);

        } finally {

            alterando = false;

            atualizarBotoes();

        }

    }

    /* ABERTURA DO PAINEL */

    async function abrirPainel() {

        if (

            !document.body.classList.contains(

                "dj-approved"

            )

        ) {

            return;

        }

        if (!(await verificarAdmin())) {

            return;

        }

        if (

            !document.body.classList.contains(

                "dj-approved"

            )

        ) {

            return;

        }

        painel.hidden = false;

        $("dj-admin-close").focus();

        await carregarUsuarios();

    }

    /* EVENTOS DO PAINEL */

    botao.addEventListener(

        "click",

        abrirPainel

    );

    $("dj-admin-close").addEventListener(

        "click",

        fecharPainel

    );

    $("dj-admin-refresh").addEventListener(

        "click",

        carregarUsuarios

    );

    $("dj-admin-search").addEventListener(

        "input",

        renderUsuarios

    );

    $("dj-admin-status-filter").addEventListener(

        "change",

        renderUsuarios

    );

    $("dj-admin-role-filter").addEventListener(

        "change",

        renderUsuarios

    );

    document.addEventListener(

        "keydown",

        event => {

            if (

                event.key === "Escape" &&

                !painel.hidden

            ) {

                fecharPainel();

            }

        }

    );

    /* INTEGRACAO COM LOGIN.JS */

    document.addEventListener(

        "delta:access-approved",

        async () => {

            if (verificacao) {

                await verificacao;

            }

            await verificarAdmin();

        }

    );

    document.addEventListener(

        "delta:access-revoked",

        revogarAcesso

    );

    /* EVENTOS DO SUPABASE */

    client.auth.onAuthStateChange(

        (event, session) => {

            if (!session) {

                revogarAcesso();

                return;

            }

            if (

                event === "PASSWORD_RECOVERY"

            ) {

                revogarAcesso();

                return;

            }

            if (

                adminId &&

                session.user.id !== adminId

            ) {

                revogarAcesso();

            }

            if (

                event === "SIGNED_IN" ||

                event === "TOKEN_REFRESHED" ||

                event === "INITIAL_SESSION"

            ) {

                setTimeout(async () => {

                    if (verificacao) {

                        await verificacao;

                    }

                    await verificarAdmin();

                }, 0);

            }

        }

    );

    /* REVALIDACAO PERIODICA */

    setInterval(() => {

        if (

            document.body.classList.contains(

                "dj-approved"

            )

        ) {

            verificarAdmin();

        }

    }, INTERVALO_VERIFICACAO);

    /* REVALIDACAO AO RETORNAR AO SITE */

    document.addEventListener(

        "visibilitychange",

        () => {

            if (

                document.visibilityState === "visible" &&

                document.body.classList.contains(

                    "dj-approved"

                )

            ) {

                verificarAdmin();

            }

        }

    );

    /* API PUBLICA */

    window.DeltaAdmin = Object.freeze({

        versao: "4.0.0",

        verificarAdmin,

        abrirPainel,

        fecharPainel,

        carregarUsuarios,

        autorizado: () => autorizado

    });

    /* INICIALIZACAO */

    verificarAdmin();

    console.info(

        "Delta Juris 4.0 — Central administrativa disponível."

    );

})();

/* FIM — DELTA JURIS 4.0 */
