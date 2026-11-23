# Delta Juris — Delegado PC

Site estático responsivo para estudo de jurisprudência e simulados FGV / CESPE-CEBRASPE.

## Publicar gratuitamente no GitHub Pages

1. Crie um repositório **público** no GitHub (ex.: `delta-juris`).
2. Faça upload de **todos os arquivos e pastas** deste ZIP na raiz do repositório, inclusive `.github/workflows/weekly.yml`, `scripts/update.py`, `data/updates.json` e `index.html`.
3. Em **Settings > Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/(root)` e salve.
4. Em **Settings > Actions > General > Workflow permissions**, habilite **Read and write permissions**, se essa opção estiver disponível. O fluxo precisa de permissão de escrita para salvar `data/updates.json`.
5. Em **Actions > Atualizar fontes jurisprudenciais > Run workflow**, execute a primeira coleta manualmente. A partir daí, o agendamento roda às segundas-feiras (horário UTC), sujeito a atrasos do GitHub.
6. Acesse `https://SEU-USUARIO.github.io/delta-juris/` (substitua os nomes). Aguarde o deploy.

## Funcionamento e limites

- STJ: feeds RSS oficiais de Informativo, Jurisprudência em Teses e Pesquisa Pronta.
- STF: links de informativos da página oficial, extraídos de HTML (mudanças no portal podem exigir ajuste).
- Dizer o Direito: feed público do blog, **quando acessível**; se indisponível, o painel sinaliza a falha. Não se reproduzem comentários integrais.
- O robô **não transforma manchetes em teses** e não gera gabaritos jurídicos automaticamente sem verificação: isso evita questões erradas. Os simulados FGV (cinco alternativas) e CEBRASPE (certo/errado) continuam gerados automaticamente a partir do banco de teses revisadas já incorporadas ao HTML.
- Para adicionar novas questões automaticamente a partir de decisões recentes, é necessária uma etapa editorial de validação ou um serviço adicional de IA com revisão e chaves seguras no servidor; isso **não está ativado** nesta versão.
- Os dados de desempenho ficam no armazenamento local do navegador, não sincronizados entre dispositivos.
- Se o GitHub Pages estiver configurado como **GitHub Actions** em vez de **Deploy from a branch**, será necessário configurar um fluxo separado de deploy.
