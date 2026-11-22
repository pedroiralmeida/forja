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

## Plano e histórico

- Semana base com 4 treinos obrigatórios (Supera à segunda e quarta, Estádio à terça e quinta). O sábado é obrigatório se faltou algum, senão é opcional. Muda-se em Mais → Definições.
- Trocas automáticas entre dias do Supera e do Estádio, mantendo quantos treinos há em cada sítio: para não treinar no mesmo sítio dois dias seguidos (por exemplo, Supera no domingo e na segunda), para fugir à chuva no Estádio entre as 17h e as 21h (previsão da Open-Meteo, vista no máximo de 3 em 3 horas) e para não marcar o Supera num dia em que está fechado. O ecrã Hoje explica a troca e deixa escolher o sítio à mão.
- Treinos falhados ficam registados com o motivo. A rotação retoma onde ficou.
- A app guarda o máximo de histórico: contexto de cada treino (o que foi sugerido, reposição ou extra, peso corporal, 1RM estimado), o que foi receitado, as séries por fazer, o esforço, a energia, as dores, as condições no parque, todas as pesagens do dia, as versões do plano e as versões anteriores de treinos editados ou apagados. Tudo vai no backup JSON e na sincronização.


## Créditos

Os emojis da imagem do dia (pasta `icons/emoji/`) são do [Twemoji](https://github.com/jdecked/twemoji), © Twitter, Inc. e contribuidores, com a licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
