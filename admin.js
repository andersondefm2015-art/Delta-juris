
(() => {
  "use strict";

  const auth = window.deltaAuth;
  const aside = document.querySelector("aside");

  if (!auth?.client || !aside) return;

  const client = auth.client;

  const style = document.createElement("style");
  style.textContent = `
    #dj-admin-open {
      display: none;
      width: 100%;
      margin: 10px 0;
      padding: 12px;
      border: 1px solid #37617a;
      border-radius: 10px;
      background: #17344e;
      color: #e8f5f6;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }

    body.dj-approved #dj-admin-open.dj-admin-authorized {
      display: block;
    }

    #dj-admin-panel[hidden] {
      display: none !important;
    }

    #dj-admin-panel {
      position: fixed;
      inset: 0;
      z-index: 99999;
      overflow: auto;
      background: #081224;
      color: #e9eef8;
      padding: 22px 14px;
      font-family: system-ui, sans-serif;
    }

    .dj-admin-inner {
      max-width: 760px;
      margin: auto;
    }

    .dj-admin-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    #dj-admin-panel button {
      border: 0;
      border-radius: 9px;
      padding: 10px 12px;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }

    .dj-admin-close {
      background: #28425f;
      color: white;
    }

    .dj-admin-refresh,
    .dj-admin-approve {
      background: #44bea9;
      color: #071e25;
    }

    .dj-admin-refresh {
      margin: 16px 0;
    }

    .dj-admin-user {
      background: #11213b;
      border: 1px solid #304664;
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
      overflow-wrap: anywhere;
    }

    .dj-admin-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .dj-admin-reject {
      background: #f2a0a0;
      color: #321018;
    }

    .dj-admin-block {
      background: #f4c36d;
      color: #332000;
    }

    .dj-admin-muted {
      color: #b7c7dd;
    }
  `;

  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "dj-admin-open";
  button.type = "button";
  button.textContent = "⚙ Administração";
  aside.appendChild(button);

  const panel = document.createElement("section");
  panel.id = "dj-admin-panel";
  panel.hidden = true;

  panel.innerHTML = `
    <div class="dj-admin-inner">
      <div class="dj-admin-top">
        <h2>Administração · Delta Juris</h2>
        <button class="dj-admin-close" type="button">
          Fechar
        </button>
      </div>

      <p class="dj-admin-muted">
        Gerencie solicitações de acesso.
      </p>

      <button class="dj-admin-refresh" type="button">
        Atualizar usuários
      </button>

      <p id="dj-admin-message"
         role="status"
         aria-live="polite"></p>

      <div id="dj-admin-users"></div>
    </div>
  `;

  document.body.appendChild(panel);

  const message = panel.querySelector("#dj-admin-message");
  const list = panel.querySelector("#dj-admin-users");

  let adminId = null;

  async function verifyAdmin() {
    try {
      const { data, error } = await client.auth.getUser();
      const user = data?.user;

      if (error || !user) {
        throw error || new Error("Sem sessão");
      }

      const profile = await auth.getProfile();

      const allowed =
        profile?.id === user.id &&
        profile?.status === "approved" &&
        profile?.role === "admin";

      adminId = allowed ? user.id : null;

      button.classList.toggle(
        "dj-admin-authorized",
        allowed
      );

      if (!allowed) panel.hidden = true;

      return allowed;
    } catch {
      adminId = null;
      button.classList.remove("dj-admin-authorized");
      panel.hidden = true;
      return false;
    }
  }

  function createAction(label, className, callback) {
    const element = document.createElement("button");

    element.type = "button";
    element.className = className;
    element.textContent = label;
    element.addEventListener("click", callback);

    return element;
  }

  async function changeStatus(user, status) {
    if (!(await verifyAdmin())) return;

    if (user.id === adminId) {
      message.textContent =
        "Você não pode alterar seu próprio acesso.";
      return;
    }

    const labels = {
      approved: "aprovar",
      rejected: "rejeitar",
      blocked: "bloquear"
    };

    const confirmed = confirm(
      `Deseja ${labels[status]} ` +
      `${user.email || "este usuário"}?`
    );

    if (!confirmed) return;

    message.textContent = "Salvando alteração...";

    try {
      const { data, error } = await client
        .from("profiles")
        .update({ status })
        .eq("id", user.id)
        .select("id,status");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Nenhum registro alterado. Verifique as políticas RLS."
        );
      }

      message.textContent = "Alteração salva.";
      await loadUsers();

    } catch (error) {
      message.textContent =
        "Não foi possível alterar: " + error.message;
    }
  }

  async function loadUsers() {
    if (!(await verifyAdmin())) {
      message.textContent =
        "Acesso administrativo não autorizado.";
      return;
    }

    message.textContent = "Carregando usuários...";
    list.replaceChildren();

    try {
      const { data, error } = await client
        .from("profiles")
        .select("id,email,status,role")
        .order("email", { ascending: true });

      if (error) throw error;

      const users = data || [];

      message.textContent =
        `${users.length} cadastro(s) encontrado(s).`;

      for (const user of users) {
        const card = document.createElement("div");
        card.className = "dj-admin-user";

        const name = document.createElement("strong");
        name.textContent = user.email || user.id;

        const meta = document.createElement("p");
        meta.className = "dj-admin-muted";
        meta.textContent =
          `Status: ${user.status || "—"} · ` +
          `Perfil: ${user.role || "—"}`;

        card.append(name, meta);

        if (
          user.id !== adminId &&
          user.role !== "admin"
        ) {
          const actions = document.createElement("div");
          actions.className = "dj-admin-actions";

          if (user.status !== "approved") {
            actions.appendChild(
              createAction(
                "Aprovar",
                "dj-admin-approve",
                () => changeStatus(user, "approved")
              )
            );
          }

          if (user.status !== "rejected") {
            actions.appendChild(
              createAction(
                "Rejeitar",
                "dj-admin-reject",
                () => changeStatus(user, "rejected")
              )
            );
          }

          if (user.status !== "blocked") {
            actions.appendChild(
              createAction(
                "Bloquear",
                "dj-admin-block",
                () => changeStatus(user, "blocked")
              )
            );
          }

          card.appendChild(actions);
        }

        list.appendChild(card);
      }

    } catch (error) {
      message.textContent =
        "Erro ao carregar: " + error.message;
    }
  }

  button.addEventListener("click", async () => {
    if (!(await verifyAdmin())) return;

    panel.hidden = false;
    await loadUsers();
  });

  panel.querySelector(".dj-admin-close")
    .addEventListener("click", () => {
      panel.hidden = true;
    });

  panel.querySelector(".dj-admin-refresh")
    .addEventListener("click", loadUsers);

  client.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      adminId = null;
      button.classList.remove("dj-admin-authorized");
      panel.hidden = true;
    } else {
      setTimeout(verifyAdmin, 0);
    }
  });

  verifyAdmin();
})();
