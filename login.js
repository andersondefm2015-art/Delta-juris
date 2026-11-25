
/* =====================================================
   DELTA JURIS 4.0
   CENTRAL DE AUTENTICACAO
   TACTICAL EDITION
   CARREIRAS POLICIAIS E JURIDICAS
   ===================================================== */

(function () {

    "use strict";

    /* PROTECAO CONTRA DUPLICACAO */

    if (window.DeltaLogin) return;

    const auth = window.deltaAuth;

    const root = document.querySelector(".layout");

    if (!root) return;

    const $ = id => document.getElementById(id);

    /* CONFIGURACOES */

    const INTERVALO_VERIFICACAO = 60000;

    let mode = "login";
    let busy = false;
    let aprovado = false;
    let verificacao = null;
    let versaoSessao = 0;
    let usuarioAtual = null;
    let recuperandoSenha = false;

    /* PROTECAO VISUAL */

    document.body.classList.remove("dj-approved");

    const style = document.createElement("style");

    style.id = "dj-login-style";

    style.textContent = `

        body:not(.dj-approved) .layout {
            display: none !important;
        }

        #dj-auth-screen {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background: #080808;
            color: #f0f0f0;
            font-family: system-ui, sans-serif;
        }

        #dj-auth-screen[hidden] {
            display: none !important;
        }

        .dj-auth-card {
            width: 100%;
            max-width: 460px;
            background: #171717;
            border: 1px solid #92713b;
            border-radius: 18px;
            padding: 28px;
        }

        .dj-auth-logo {
            display: block;
            width: 110px;
            height: 110px;
            object-fit: contain;
            margin: 0 auto 12px;
        }

        .dj-auth-brand {
            font-size: 30px;
            font-weight: 850;
            text-align: center;
            letter-spacing: 2px;
        }

        .dj-auth-brand span {
            color: #d5ad59;
        }

        .dj-auth-edition {
            text-align: center;
            color: #d5ad59;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
            margin: 8px 0;
        }

        .dj-auth-careers {
            text-align: center;
            font-size: 10px;
            letter-spacing: 1px;
            color: #bcbcbc;
        }

        .dj-auth-divider {
            border: 0;
            border-top: 1px solid #38332a;
            margin: 22px 0;
        }

        #dj-auth-title {
            text-align: center;
            color: #f0f0f0;
            font-size: 24px;
        }

        #dj-auth-subtitle {
            text-align: center;
            color: #bcbcbc;
            line-height: 1.6;
        }

        .dj-auth-card label {
            display: block;
            margin: 16px 0 7px;
            color: #f4db9b;
            font-size: 13px;
            font-weight: 650;
        }

        .dj-auth-card input {
            display: block;
            width: 100%;
            min-width: 0;
            min-height: 46px;
            padding: 12px;
            border-radius: 9px;
            border: 1px solid #49433a;
            background: #101010;
            color: #f0f0f0;
            font-size: 16px;
        }

        .dj-password-wrap {
            position: relative;
        }

        .dj-password-wrap input {
            padding-right: 85px;
        }

        #dj-toggle-password {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            background: #202020;
            color: #f4db9b;
            border: 0;
            border-radius: 6px;
            padding: 8px;
            font-size: 12px;
            cursor: pointer;
        }

        .dj-auth-card button {
            font-family: inherit;
            cursor: pointer;
        }

        #dj-auth-submit {
            width: 100%;
            margin-top: 20px;
            padding: 15px;
            border: 1px solid #d5ad59;
            border-radius: 9px;
            background: linear-gradient(
                135deg,
                #f4db9b,
                #b58a3d
            );
            color: #101010;
            font-weight: 850;
            letter-spacing: .6px;
        }

        #dj-auth-submit:disabled {
            opacity: .5;
            cursor: not-allowed;
        }

        #dj-auth-switch,
        #dj-auth-recover,
        #dj-auth-signout {
            background: transparent;
            border: 0;
            color: #f4db9b;
            padding: 10px 0;
        }

        #dj-auth-switch,
        #dj-auth-signout {
            display: block;
            width: 100%;
            text-align: center;
        }

        #dj-auth-recover {
            display: block;
            margin-left: auto;
            font-size: 12px;
        }

        #dj-auth-message {
            margin-top: 14px;
            line-height: 1.6;
            font-size: 13px;
            color: #bcbcbc;
            overflow-wrap: anywhere;
        }

        #dj-auth-message:not(:empty) {
            padding: 12px;
            background: #111111;
            border: 1px solid #38332a;
            border-radius: 8px;
        }

        #dj-auth-message[data-type="success"] {
            color: #79e0ce !important;
        }

        #dj-auth-message[data-type="error"] {
            color: #ffadad !important;
        }

        #dj-auth-message[data-type="warning"] {
            color: #f4db9b !important;
        }

        .dj-auth-footer {
            text-align: center;
            font-size: 11px;
            color: #a5a5a5;
            line-height: 1.6;
        }

        #dj-logout {
            display: none;
            width: 100%;
            margin-top: 14px;
            padding: 12px;
            background: #202020;
            color: #f0f0f0;
            border: 1px solid #49433a;
            border-radius: 9px;
            font: inherit;
            font-weight: 700;
            cursor: pointer;
        }

        body.dj-approved #dj-logout {
            display: block;
        }

        #dj-auth-screen [hidden] {
            display: none !important;
        }

        @media (max-width:480px) {

            #dj-auth-screen {
                padding: 14px;
            }

            .dj-auth-card {
                padding: 22px;
            }

            .dj-auth-brand {
                font-size: 27px;
            }

        }

    `;

    document.head.appendChild(style);

    /* TELA DE AUTENTICACAO */

    const screen = document.createElement("div");

    screen.id = "dj-auth-screen";

    screen.innerHTML = `

        <div class="dj-auth-card">

            <img
                class="dj-auth-logo"
                src="./assets/logo.png"
                alt="Delta Juris">

            <div class="dj-auth-brand">

                DELTA<span>JURIS</span>

            </div>

            <div class="dj-auth-edition">

                TACTICAL EDITION • 4.0

            </div>

            <div class="dj-auth-careers">

                CARREIRAS POLICIAIS E JURÍDICAS

            </div>

            <hr class="dj-auth-divider">

            <h2 id="dj-auth-title">

                Central de acesso

            </h2>

            <p id="dj-auth-subtitle">

                Disciplina • Estratégia • Constância

            </p>

            <form id="dj-auth-form">

                <div id="dj-email-field">

                    <label for="dj-auth-email">

                        E-mail

                    </label>

                    <input

                        id="dj-auth-email"

                        type="email"

                        autocomplete="email"

                        placeholder="Digite seu e-mail"

                        required>

                </div>

                <div id="dj-password-field">

                    <label for="dj-auth-password">

                        Senha

                    </label>

                    <div class="dj-password-wrap">

                        <input

                            id="dj-auth-password"

                            type="password"

                            autocomplete="current-password"

                            placeholder="Digite sua senha"

                            minlength="6"

                            required>

                        <button

                            id="dj-toggle-password"

                            type="button"

                            aria-pressed="false">

                            Mostrar

                        </button>

                    </div>

                </div>

                <button

                    id="dj-auth-recover"

                    type="button">

                    Esqueci minha senha

                </button>

                <button

                    id="dj-auth-submit"

                    type="submit">

                    ACESSAR PLATAFORMA

                </button>

            </form>

            <button

                id="dj-auth-switch"

                type="button">

                Criar uma conta

            </button>

            <button

                id="dj-auth-signout"

                type="button"

                hidden>

                Sair e utilizar outra conta

            </button>

            <div

                id="dj-auth-message"

                role="status"

                aria-live="polite">

            </div>

            <hr class="dj-auth-divider">

            <div class="dj-auth-footer">

                Acesso restrito a usuários autorizados.

                <br>

                Delta Juris • Sua missão é a aprovação.

            </div>

        </div>

    `;

    document.body.insertBefore(screen, root);

    /* BOTAO DE SAIDA */

    let logout = $("dj-logout");

    if (!logout) {

        logout = document.createElement("button");

        logout.id = "dj-logout";

        logout.type = "button";

        logout.textContent = "Sair da conta";

        document.querySelector("aside")

            ?.appendChild(logout);

    }

    /* MENSAGENS */

    function message(text, type = "info") {

        const elemento = $("dj-auth-message");

        elemento.textContent = text;

        elemento.dataset.type = type;

    }

    function traduzirErro(error) {

        const msg = String(

            error?.message || ""

        );

        const code = error?.code || "";

        if (

            code === "invalid_credentials" ||

            /invalid login credentials/i.test(msg)

        ) {

            return "E-mail ou senha incorretos.";

        }

        if (

            code === "email_not_confirmed" ||

            /email not confirmed/i.test(msg)

        ) {

            return "Confirme seu e-mail antes de entrar.";

        }

        if (

            code === "over_email_send_rate_limit" ||

            /rate limit/i.test(msg)

        ) {

            return "Muitas tentativas. Aguarde alguns minutos.";

        }

        if (

            code === "weak_password" ||

            /password should be/i.test(msg)

        ) {

            return "Escolha uma senha mais forte.";

        }

        if (

            /failed to fetch/i.test(msg)

        ) {

            return "Falha de conexão. Verifique sua internet.";

        }

        return msg || "Não foi possível concluir a operação.";

    }

    /* CONTROLE DE ACESSO */

    function lock() {

        const estavaAprovado = aprovado;

        aprovado = false;

        document.body.classList.remove(

            "dj-approved"

        );

        screen.hidden = false;

        const adminPanel = $("dj-admin-panel");

        if (adminPanel) {

            adminPanel.hidden = true;

        }

        $("dj-admin-open")?.classList.remove(

            "dj-admin-authorized"

        );

        if (estavaAprovado) {

            window.DeltaSimulados

                ?.encerrarSessao();

            document.dispatchEvent(

                new CustomEvent(

                    "delta:access-revoked"

                )

            );

        }

    }

    function unlock(profile) {

        if (recuperandoSenha) return;

        const estavaAprovado = aprovado;

        aprovado = true;

        usuarioAtual = profile.id;

        document.body.classList.add(

            "dj-approved"

        );

        screen.hidden = true;

        message("");

        if (!estavaAprovado) {

            document.dispatchEvent(

                new CustomEvent(

                    "delta:access-approved",

                    {

                        detail: {

                            id: profile.id,

                            role: profile.role

                        }

                    }

                )

            );

        }

    }

    /* MODOS DE AUTENTICACAO */

    function setMode(next) {

        mode = next;

        const signup = next === "signup";

        const recovery = next === "recover";

        const newPassword = next === "new-password";

        $("dj-email-field").hidden = newPassword;

        $("dj-auth-email").required = !newPassword;

        $("dj-password-field").hidden = recovery;

        $("dj-auth-password").required = !recovery;

        $("dj-auth-password").type = "password";

        $("dj-auth-password").value = "";

        $("dj-toggle-password").textContent = "Mostrar";

        $("dj-toggle-password").setAttribute(

            "aria-pressed",

            "false"

        );

        $("dj-auth-password").autocomplete =

            signup || newPassword

                ? "new-password"

                : "current-password";

        $("dj-auth-recover").hidden =

            signup || recovery || newPassword;

        $("dj-auth-switch").hidden = newPassword;

        $("dj-auth-signout").hidden =

            !usuarioAtual && !newPassword;

        if (signup) {

            $("dj-auth-title").textContent =

                "Criar conta";

            $("dj-auth-subtitle").textContent =

                "Seu cadastro dependerá de aprovação administrativa.";

            $("dj-auth-submit").textContent =

                "SOLICITAR ACESSO";

            $("dj-auth-switch").textContent =

                "Já tenho uma conta";

        } else if (recovery) {

            $("dj-auth-title").textContent =

                "Recuperar senha";

            $("dj-auth-subtitle").textContent =

                "Informe seu e-mail para receber as instruções.";

            $("dj-auth-submit").textContent =

                "ENVIAR LINK DE RECUPERAÇÃO";

            $("dj-auth-switch").textContent =

                "Voltar ao login";

        } else if (newPassword) {

            $("dj-auth-title").textContent =

                "Cadastrar nova senha";

            $("dj-auth-subtitle").textContent =

                "Escolha uma nova senha para sua conta.";

            $("dj-auth-submit").textContent =

                "SALVAR NOVA SENHA";

        } else {

            $("dj-auth-title").textContent =

                "Central de acesso";

            $("dj-auth-subtitle").textContent =

                "Disciplina • Estratégia • Constância";

            $("dj-auth-submit").textContent =

                "ACESSAR PLATAFORMA";

            $("dj-auth-switch").textContent =

                "Criar uma conta";

        }

        message("");

    }

    /* VISUALIZAR SENHA */

    $("dj-toggle-password").addEventListener(

        "click",

        () => {

            const campo = $("dj-auth-password");

            const mostrar = campo.type === "password";

            campo.type = mostrar

                ? "text"

                : "password";

            $("dj-toggle-password").textContent =

                mostrar ? "Ocultar" : "Mostrar";

            $("dj-toggle-password").setAttribute(

                "aria-pressed",

                String(mostrar)

            );

        }

    );

    $("dj-auth-switch").addEventListener(

        "click",

        () => {

            if (busy || recuperandoSenha) return;

            setMode(

                mode === "login"

                    ? "signup"

                    : "login"

            );

        }

    );

    $("dj-auth-recover").addEventListener(

        "click",

        () => {

            if (!busy) setMode("recover");

        }

    );

    /* VERIFICACAO DO PERFIL */

    async function executarVerificacao() {

        const versao = versaoSessao;

        if (recuperandoSenha) {

            lock();

            return false;

        }

        if (

            !auth?.client ||

            typeof auth.getProfile !== "function"

        ) {

            lock();

            message(

                "Supabase não configurado corretamente.",

                "error"

            );

            return false;

        }

        try {

            const {

                data: sessionData,

                error: sessionError

            } = await auth.client.auth.getSession();

            if (versao !== versaoSessao) return false;

            if (sessionError) throw sessionError;

            if (!sessionData?.session) {

                usuarioAtual = null;

                lock();

                $("dj-auth-signout").hidden = true;

                if (mode === "login") {

                    message(

                        "Entre para acessar o Delta Juris."

                    );

                }

                return false;

            }

            const profile = await auth.getProfile();

            if (

                versao !== versaoSessao ||

                recuperandoSenha

            ) return false;

            usuarioAtual =

                sessionData.session.user.id;

            if (

                profile?.id === usuarioAtual &&

                profile?.status === "approved"

            ) {

                unlock(profile);

                return true;

            }

            lock();

            $("dj-auth-signout").hidden = false;

            if (profile?.status === "blocked") {

                message(

                    "Seu acesso foi bloqueado. " +

                    "Contate o administrador.",

                    "error"

                );

            } else if (

                profile?.status === "rejected"

            ) {

                message(

                    "Seu cadastro foi rejeitado. " +

                    "Contate o administrador.",

                    "error"

                );

            } else {

                message(

                    "Seu cadastro aguarda aprovação administrativa.",

                    "warning"

                );

            }

            return false;

        } catch (error) {

            if (versao !== versaoSessao) return false;

            lock();

            message(

                "Não foi possível verificar seu acesso. " +

                traduzirErro(error),

                "error"

            );

            return false;

        }

    }

    async function checkAccess() {

        if (verificacao) return verificacao;

        verificacao = executarVerificacao();

        try {

            return await verificacao;

        } finally {

            verificacao = null;

        }

    }

    /* RECUPERACAO DE SENHA */

    function urlRecuperacao() {

        const url = new URL(

            window.location.href

        );

        url.search = "";

        url.hash = "";

        return url.href;

    }

    async function recuperarSenha(email) {

        const { error } = await auth.client.auth

            .resetPasswordForEmail(

                email,

                {

                    redirectTo: urlRecuperacao()

                }

            );

        if (error) throw error;

        setMode("login");

        message(

            "Se o e-mail estiver cadastrado, " +

            "você receberá um link de recuperação. " +

            "Confira também a caixa de spam.",

            "success"

        );

    }

    async function atualizarSenha(password) {

        if (!recuperandoSenha) {

            throw new Error(

                "Sessão de recuperação inválida."

            );

        }

        const { error } = await auth.client.auth

            .updateUser({

                password

            });

        if (error) throw error;

        recuperandoSenha = false;

        versaoSessao++;

        const resultado = await auth.signOut();

        if (resultado?.error) {

            lock();

            setMode("login");

            message(

                "Senha alterada. Encerre a sessão " +

                "para entrar novamente.",

                "warning"

            );

            return;

        }

        usuarioAtual = null;

        lock();

        setMode("login");

        message(

            "Senha alterada com sucesso. " +

            "Entre com sua nova senha.",

            "success"

        );

    }

    /* FORMULARIO PRINCIPAL */

    $("dj-auth-form").addEventListener(

        "submit",

        async event => {

            event.preventDefault();

            if (busy) return;

            if (!auth?.client) {

                message(

                    "Supabase indisponível.",

                    "error"

                );

                return;

            }

            busy = true;

            $("dj-auth-submit").disabled = true;

            $("dj-auth-switch").disabled = true;

            $("dj-auth-recover").disabled = true;

            const email = $("dj-auth-email")

                .value.trim();

            const password = $("dj-auth-password")

                .value;

            const operacao = mode;

            try {

                if (operacao === "recover") {

                    await recuperarSenha(email);

                    return;

                }

                if (operacao === "new-password") {

                    await atualizarSenha(password);

                    return;

                }

                if (operacao === "signup") {

                    const result = await auth.signUp(

                        email,

                        password

                    );

                    if (result?.error) {

                        throw result.error;

                    }

                    setMode("login");

                    message(

                        "Solicitação de acesso enviada. " +

                        "Confirme seu e-mail, se solicitado, " +

                        "e aguarde aprovação administrativa.",

                        "success"

                    );

                    return;

                }

                const result = await auth.signIn(

                    email,

                    password

                );

                if (result?.error) {

                    throw result.error;

                }

                $("dj-auth-password").value = "";

                if (verificacao) {

                    await verificacao;

                }

                await checkAccess();

            } catch (error) {

                message(

                    traduzirErro(error),

                    "error"

                );

            } finally {

                busy = false;

                $("dj-auth-submit").disabled = false;

                $("dj-auth-switch").disabled = false;

                $("dj-auth-recover").disabled = false;

            }

        }

    );

    /* ENCERRAMENTO DE SESSAO */

    async function sair() {

        if (busy) return;

        busy = true;

        versaoSessao++;

        lock();

        try {

            const result = await auth.signOut();

            if (result?.error) throw result.error;

            usuarioAtual = null;

            recuperandoSenha = false;

            $("dj-auth-email").value = "";

            setMode("login");

            message(

                "Sessão encerrada com sucesso.",

                "success"

            );

        } catch (error) {

            message(

                "Não foi possível encerrar a sessão: " +

                traduzirErro(error),

                "error"

            );

        } finally {

            busy = false;

        }

    }

    logout.addEventListener("click", sair);

    $("dj-auth-signout").addEventListener(

        "click",

        sair

    );

    /* EVENTOS DO SUPABASE */

    if (auth?.client?.auth?.onAuthStateChange) {

        auth.client.auth.onAuthStateChange(

            (event, session) => {

                if (event === "PASSWORD_RECOVERY") {

                    versaoSessao++;

                    recuperandoSenha = true;

                    usuarioAtual =

                        session?.user?.id || null;

                    lock();

                    setMode("new-password");

                    message(

                        "Informe sua nova senha.",

                        "warning"

                    );

                    return;

                }

                if (!session) {

                    versaoSessao++;

                    usuarioAtual = null;

                    recuperandoSenha = false;

                    lock();

                    setMode("login");

                    return;

                }

                if (

                    event === "SIGNED_IN" ||

                    event === "TOKEN_REFRESHED"

                ) {

                    if (

                        usuarioAtual &&

                        usuarioAtual !== session.user.id

                    ) {

                        versaoSessao++;

                        lock();

                    }

                    setTimeout(async () => {

                        if (

                            busy ||

                            recuperandoSenha

                        ) return;

                        if (verificacao) {

                            await verificacao;

                        }

                        await checkAccess();

                    }, 0);

                }

            }

        );

    }

    /* REVALIDACAO PERIODICA */

    setInterval(() => {

        if (

            busy ||

            recuperandoSenha ||

            !usuarioAtual

        ) return;

        checkAccess();

    }, INTERVALO_VERIFICACAO);

    /* REVALIDACAO AO RETORNAR AO SITE */

    document.addEventListener(

        "visibilitychange",

        () => {

            if (

                document.visibilityState === "visible" &&

                !busy &&

                !recuperandoSenha &&

                usuarioAtual

            ) {

                checkAccess();

            }

        }

    );

    /* API PUBLICA */

    window.DeltaLogin = Object.freeze({

        versao: "4.0.0",

        verificarAcesso: checkAccess,

        aprovado: () => aprovado,

        usuario: () => usuarioAtual,

        sair

    });

    /* INICIALIZACAO */

    message("Verificando acesso...");

    checkAccess();

    console.info(

        "Delta Juris 4.0 — Central de acesso disponível."

    );

})();

/* FIM — DELTA JURIS 4.0 */
