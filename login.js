
(() => {
  "use strict";

  const auth = window.deltaAuth;
  const root = document.querySelector(".layout");
  if (!root) return;

  const style = document.createElement("style");
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
      background: #081224;
      color: #e9eef8;
      font-family: system-ui, sans-serif;
    }
    #dj-auth-screen[hidden] {
      display: none !important;
    }
    .dj-auth-card {
      width: 100%;
      max-width: 440px;
      background: #11213b;
      border: 1px solid #304664;
      border-radius: 18px;
      padding: 26px;
    }
    .dj-auth-brand {
      font-size: 28px;
      font-weight: 850;
    }
    .dj-auth-brand span { color: #67d6c1; }
    .dj-auth-card p {
      color: #b7c7dd;
      line-height: 1.5;
    }
    .dj-auth-card label {
      display: block;
      margin: 14px 0 6px;
    }
    .dj-auth-card input {
      display: block;
      width: 100%;
      min-width: 0;
      padding: 12px;
      border-radius: 9px;
      border: 1px solid #36506d;
      background: #0b1a30;
      color: white;
    }
    .dj-auth-card button, #dj-logout {
      border: 0;
      border-radius: 9px;
      padding: 12px;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
    }
    #dj-auth-submit {
      width: 100%;
      margin-top: 20px;
      background: #44bea9;
      color: #061d27;
    }
    #dj-auth-switch {
      background: transparent;
      color: #8be7d8;
      margin-top: 12px;
    }
    #dj-auth-message {
      margin-top: 14px;
      line-height: 1.5;
      color: #b7c7dd;
    }
    #dj-logout {
      display: none;
      width: 100%;
      margin-top: 14px;
      background: #203a59;
      color: white;
    }
    body.dj-approved #dj-logout {
      display: block;
    }
  `;
  document.head.appendChild(style);

  const screen = document.createElement("div");
  screen.id = "dj-auth-screen";
  screen.innerHTML = `
    <div class="dj-auth-card">
      <div class="dj-auth-brand">
        DELTA<span>JURIS</span>
      </div>
      <p>Plataforma de estudos • Delegado de Polícia</p>
      <h2 id="dj-auth-title">Entrar</h2>
      <p id="dj-auth-subtitle">
        Entre com sua conta aprovada.
      </p>
      <form id="dj-auth-form">
        <label for="dj-auth-email">E-mail</label>
        <input id="dj-auth-email"
               type="email"
               autocomplete="email"
               required>

        <label for="dj-auth-password">Senha</label>
        <input id="dj-auth-password"
               type="password"
               autocomplete="current-password"
               minlength="6"
               required>

        <button id="dj-auth-submit" type="submit">
          Entrar
        </button>
      </form>
      <button id="dj-auth-switch" type="button">
        Criar uma conta
      </button>
      <div id="dj-auth-message"
           role="status"
           aria-live="polite"></div>
    </div>
  `;
  document.body.insertBefore(screen, root);

  const logout = document.createElement("button");
  logout.id = "dj-logout";
  logout.type = "button";
  logout.textContent = "Sair da conta";
  document.querySelector("aside")?.appendChild(logout);

  const $ = id => document.getElementById(id);
  let mode = "login";
  let busy = false;

  function message(text) {
    $("dj-auth-message").textContent = text;
  }

  function lock() {
    document.body.classList.remove("dj-approved");
    screen.hidden = false;
  }

  function unlock() {
    document.body.classList.add("dj-approved");
    screen.hidden = true;
  }

  function setMode(next) {
    mode = next;
    const signup = next === "signup";
    $("dj-auth-title").textContent =
      signup ? "Criar conta" : "Entrar";
    $("dj-auth-subtitle").textContent =
      signup
        ? "Seu cadastro dependerá de aprovação."
        : "Entre com sua conta aprovada.";
    $("dj-auth-submit").textContent =
      signup ? "Cadastrar" : "Entrar";
    $("dj-auth-switch").textContent =
      signup ? "Já tenho uma conta" : "Criar uma conta";
    $("dj-auth-password").autocomplete =
      signup ? "new-password" : "current-password";
    message("");
  }

  $("dj-auth-switch").addEventListener("click", () => {
    setMode(mode === "login" ? "signup" : "login");
  });

  async function checkAccess() {
    lock();

    if (!auth?.client ||
        typeof auth.getProfile !== "function") {
      message("Supabase não configurado corretamente.");
      return;
    }

    try {
      const { data, error } =
        await auth.client.auth.getUser();

      if (error || !data?.user) {
        message("Entre para acessar o Delta Juris.");
        return;
      }

      const profile = await auth.getProfile();

      if (profile?.status === "approved") {
        unlock();
      } else if (profile?.status === "rejected") {
        message("Cadastro rejeitado. Contate o administrador.");
      } else {
        message("Cadastro pendente. Aguarde aprovação.");
      }
    } catch (err) {
      message("Erro ao verificar acesso: " + err.message);
    }
  }

  $("dj-auth-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (busy) return;

    if (!auth?.client) {
      message("Supabase indisponível.");
      return;
    }

    busy = true;
    $("dj-auth-submit").disabled = true;

    const email = $("dj-auth-email").value.trim();
    const password = $("dj-auth-password").value;

    try {
      const result = mode === "login"
        ? await auth.signIn(email, password)
        : await auth.signUp(email, password);

      if (result?.error) throw result.error;

      $("dj-auth-password").value = "";

      if (mode === "signup") {
        setMode("login");
        message(
          "Cadastro enviado. Confirme seu e-mail, " +
          "se solicitado, e aguarde aprovação."
        );
      } else {
        await checkAccess();
      }
    } catch (err) {
      message(err.message || "Erro de autenticação.");
    } finally {
      busy = false;
      $("dj-auth-submit").disabled = false;
    }
  });

  logout.addEventListener("click", async () => {
    try {
      const result = await auth.signOut();
      if (result?.error) throw result.error;
      await checkAccess();
    } catch (err) {
      message("Erro ao sair: " + err.message);
    }
  });

  if (auth?.client?.auth?.onAuthStateChange) {
    auth.client.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          lock();
          message("Entre para acessar o Delta Juris.");
        }
      }
    );
  }

  checkAccess();
})();
