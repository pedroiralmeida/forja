# Forja

App de treino para o muscle-up e para o supino (80 kg × 6 e 100 kg × 1): plano com pesos calculados automaticamente, registo de séries com temporizador de descanso, progresso, peso corporal, hábitos e corrida. Funciona no telemóvel e no PC, instala-se como app e funciona sem internet.

É uma página estática (HTML, CSS e JavaScript sem dependências), por isso aloja-se em qualquer lado. Abaixo está o caminho para o GitHub Pages, que é grátis.

## Publicar no GitHub Pages

### Pelo site do GitHub (sem terminal)

1. Em github.com carrega em **New repository**. Nome: `forja`. Visibilidade: **Public** (o GitHub Pages grátis precisa de repositório público; os teus dados de treino não ficam aqui). Cria o repositório.
2. Na página do repositório vazio, carrega em **uploading an existing file** e arrasta para lá **o conteúdo** desta pasta (o `index.html`, o `sw.js`, as pastas `css`, `js`, `fonts`, `icons`, etc.), não a pasta em si. Carrega em **Commit changes**.
3. Vai a **Settings → Pages**. Em "Build and deployment" escolhe **Deploy from a branch**, branch **main**, pasta **/ (root)** e carrega em **Save**.
4. Passado um ou dois minutos a app fica em `https://pedroiralmeida.github.io/forja/`.

### Pelo terminal (git + GitHub CLI)

```bash
cd forja
git init -b main
git add .
git commit -m "Forja: primeira versão"
gh repo create forja --public --source=. --push
gh api -X POST repos/pedroiralmeida/forja/pages -f "source[branch]=main" -f "source[path]=/"
```

## Instalar no telemóvel

- **Android (Chrome):** abre o link, menu ⋮ e depois **Instalar app** (ou "Adicionar ao ecrã principal").
- **iPhone (Safari):** abre o link, botão Partilhar e depois **Adicionar ao ecrã principal**. Usa sempre a app instalada: o Safari pode apagar os dados de sites não instalados ao fim de algumas semanas sem uso.

No PC, o Chrome e o Edge mostram um ícone de instalar na barra de endereço.

## Sincronizar PC e telemóvel

Na app: **Mais → Sincronização**. Há um link que abre o GitHub já com a permissão certa (só `gist`). Gera o token, cola-o na app e repete no outro dispositivo com o mesmo token. A app guarda os dados num gist secreto chamado `forja-dados.json` e junta as alterações dos vários dispositivos automaticamente.

Faz também um backup de vez em quando em **Mais → Backup e dados**.

## Atualizar a app

Depois de mudares ficheiros, sobe a `VERSION` no topo do `sw.js` (por exemplo `forja-v1.0.1`) e faz push. Na próxima vez que abrires a app aparece "Há uma versão nova da app" com um botão para atualizar.

## Testar localmente

Os módulos JavaScript não funcionam a partir de `file://`, por isso serve a pasta:

```bash
python -m http.server 8000
```

e abre `http://localhost:8000`.

## Estrutura

- `js/data.js`: exercícios, programa (dias A, B, C e D), fases e marcos do muscle-up, texto do guia.
- `js/engine.js`: 1RM estimado (tabela de RPE), progressão automática, deload, objetivos, previsão, peso corporal.
- `js/store.js`: dados locais, junção entre dispositivos e sincronização com o gist.
- `js/view-*.js`: ecrãs. `js/ui.js`: componentes partilhados e temporizador.
- `sw.js`: cache para funcionar sem internet.

## Dados enviados pelo Claude

O ficheiro `claude/inbox.json` tem registos (compras, stock e outros) que o Claude escreve no repositório. A app vai buscá-lo sempre que abre e junta-o aos teus dados com a mesma regra da sincronização: ganha a versão mais recente de cada registo. Por isso, o que alterares ou apagares na app não volta atrás.

Como o repositório é público, este ficheiro também é. Não tem moradas, números de encomenda nem dados de pagamento.
