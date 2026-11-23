
(() => {
  const config = window.DELTA_SUPABASE_CONFIG;

  if (!config?.url || !config?.publishableKey ||
      config.url.includes("COLE_AQUI") ||
      config.publishableKey.includes("COLE_AQUI")) {
    console.warn("Supabase ainda não configurado.");
    return;
  }

  if (!window.supabase?.createClient) {
    console.warn("Biblioteca Supabase não carregada.");
    return;
  }

 const client = window.supabase.createClient(
  config.url,
  config.publishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
);

  window.deltaAuth = {
    client,

    async signUp(email, password) {
      return client.auth.signUp({ email, password });
    },

    async signIn(email, password) {
      return client.auth.signInWithPassword({
        email,
        password
      });
    },

    async signOut() {
      return client.auth.signOut();
    },

    async getProfile() {
      const { data: sessionData, error: sessionError } =
        await client.auth.getUser();

      if (sessionError || !sessionData.user) {
        return null;
      }

      const { data, error } = await client
        .from("profiles")
        .select("id,email,status,role")
        .eq("id", sessionData.user.id)
        .single();

      if (error) throw error;
      return data;
    },

    async isApproved() {
      const profile = await this.getProfile();
      return profile?.status === "approved";
    },

    async isAdmin() {
      const profile = await this.getProfile();
      return profile?.status === "approved" &&
             profile?.role === "admin";
    }
  };
})();
