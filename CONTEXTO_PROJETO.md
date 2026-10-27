# Pokémon Space Explorer — Contexto do Projeto

> Nome provisório. Ferramenta de exploração visual de um espaço de dados: todos os Pokémon posicionados num mapa 2D (PCA dos 6 stats), com filtros combináveis que destacam grupos diretamente no mapa.

---

## 1. Origem e motivação

Inspirado num vídeo do YouTube (https://www.youtube.com/shorts/I3Afob11ZBk) que usa **PCA** para comprimir os 6 stats de cada Pokémon (HP, Ataque, Defesa, Ataque Especial, Defesa Especial, Velocidade) num gráfico 2D.

Achados do vídeo (hipóteses que o projeto deve **verificar com os loadings**, não assumir):
- Eixo vertical ≈ poder geral (lendários no topo, Magikarp na base).
- Eixo horizontal ≈ especialização (de "tanky" à esquerda até "velocidade" à direita).
- Tipos como Dragão formam agrupamentos visíveis.

**Objetivo do autor:** reproduzir a ideia "do seu jeito", expandindo muito as formas de **agrupar e destacar** Pokémon no mapa.

## 2. Perfil do autor e decisões de escopo já tomadas

- Estudante de Machine Learning, com experiência prévia em **React**.
- Conhece: KNN, árvores de decisão, MLP, ensembles (bagging/random forest/boosting).
- **Decisões firmes:**
  - ❌ **Sem foco em predição** (nada de prever tipo/lendário/etc.). Não faz sentido para o autor.
  - ❌ **Sem foco em dashboards de gráficos.** A visualização principal é **o mapa**.
  - ❌ **Sem Streamlit.** Front-end elaborado em **React**.
  - ❌ **Sem ligação com provas/disciplina da faculdade.**
  - ✅ **K-Means é opcional**: só entra se realmente acrescentar ao projeto (ver seção 9).
  - ✅ O mapa é a interface: filtros **destacam** pontos no mapa.
  - ✅ Filtros **complexos e combináveis** (ex.: linha evolutiva com 1 estágio, 2 ou 3).
  - ✅ Deve existir **média central (centroide)** de tipos ou de qualquer filtro.

## 3. Arquitetura

```
PokeAPI → Python (pandas + sklearn + umap) → pokemon.json → React (mapa + filtros)
          limpeza, evolução, PCA, UMAP        estático       tudo roda no navegador
```

- **Sem backend.** ~1.000–1.300 pontos: filtros, centroides, vizinhos e reprojeção do subconjunto rodam no navegador.
- Site estático (Vercel / GitHub Pages).
- **O mapa é fixo:** o PCA é calculado uma única vez com todos os Pokémon. Filtrar **nunca move os pontos**, só altera destaque/opacidade. Isso permite comparação visual consistente.

## 4. Pipeline de dados (Python)

### 4.1 Fonte
PokeAPI (`/pokemon`, `/pokemon-species`, `/evolution-chain`). Fazer cache local das respostas (JSON bruto em `data/raw/`) para não bater na API repetidamente. Respeitar rate limit.

### 4.2 Campos por Pokémon
- Identificação: `id`, `species_id`, `name`, `form`, `is_default_form`, `sprite` (URL).
- `types`: lista de 1–2 tipos (`primary`, `secondary` pode ser nulo).
- `generation`.
- `stats`: hp, attack, defense, sp_attack, sp_defense, speed; `bst` = soma.
- Físicos/outros: `height`, `weight`, `capture_rate`, `base_experience`, `egg_groups`, `abilities`, `color`, `shape`, `habitat`, `growth_rate`.
- `category`: `legendary` | `mythical` | `pseudo_legendary` | `baby` | `normal`.
- `evo`: `chain_id`, `line_stages`, `stage`, `branched`, `evolves` (bool), `is_baby`, `species_in_line`.

### 4.3 Regras de linha evolutiva (DEFINIR NO INÍCIO, documentar no código)
- `line_stages` = **profundidade máxima** da cadeia (1, 2 ou 3 estágios). É o que o filtro "1 / 2 / 3 na linha" usa.
- `stage` = posição do Pokémon na cadeia (1 = básico, 2 = primeira evolução, 3 = segunda).
- `species_in_line` = nº total de espécies na cadeia (Eevee e suas evoluções = 9 espécies, mas `line_stages` = 2).
- `branched` = a cadeia tem ramificação (Eevee, Tyrogue, Wurmple…).
- `is_baby` vem de `is_baby` da species. Decidir se bebês contam como estágio (sugestão: contar, e expor `is_baby` como filtro separado).
- Pseudo-lendário: regra `bst == 600` + `line_stages == 3` + não lendário/mítico. Validar contra a lista conhecida.

### 4.4 Formas alternativas
Mega, Gigantamax e formas regionais criam pontos quase duplicados e distorcem centroides.
- **Padrão sugerido:** incluir apenas formas padrão no mapa; formas alternativas ficam no JSON com `is_default_form=false` e um **toggle** na UI para incluí-las.
- **Importante:** o PCA é calculado em cima do conjunto definido (documentar qual). Se formas alternativas forem incluídas no ajuste do PCA, o mapa muda — decidir e fixar.

### 4.5 Redução de dimensionalidade
- Features do PCA: **apenas os 6 stats**, padronizados com `StandardScaler`.
- Tipo, geração, evolução etc. **não** entram no PCA; são filtros e cores.
- Exportar no JSON: `pca.components` (loadings), `pca.explained_variance_ratio`, `pca.mean`, `pca.scale`, ordem das features, e as coordenadas `[x, y]` de cada ponto.
- **UMAP** (opcional): coordenadas pré-calculadas `umap: [x, y]` com `random_state` fixo, para a troca de projeção.
- Normalizar as coordenadas para um intervalo fixo (ex.: [-1, 1]) e **guardar a transformação**, para o front desenhar de forma consistente.
- Validar o PCA: conferir se os loadings confirmam a interpretação dos eixos do vídeo e **reportar** (inclusive se não confirmarem).

### 4.6 Saída
`public/data/pokemon.json`:
```json
{
  "meta": {
    "version": 1,
    "features": ["hp","attack","defense","sp_attack","sp_defense","speed"],
    "pca": { "components": [[...],[...]], "explained_variance_ratio": [..], "mean": [..], "scale": [..] },
    "include_alt_forms_in_fit": false
  },
  "pokemon": [
    {
      "id": 149, "species_id": 149, "name": "dragonite", "form": null, "is_default_form": true,
      "types": ["dragon","flying"], "generation": 1,
      "stats": {"hp":91,"attack":134,"defense":95,"sp_attack":100,"sp_defense":100,"speed":80},
      "bst": 600, "height": 22, "weight": 2100,
      "category": "pseudo_legendary",
      "evo": {"chain_id": 71, "line_stages": 3, "stage": 3, "branched": false, "evolves": false, "is_baby": false, "species_in_line": 3},
      "egg_groups": ["monster","dragon"], "abilities": ["inner-focus","multiscale"],
      "color": "brown", "shape": "upright", "habitat": null, "capture_rate": 45,
      "sprite": "https://...",
      "pca": [0.62, 0.81], "umap": [0.1, -0.3]
    }
  ]
}
```
(Valores acima são ilustrativos; os dados reais vêm da API.)

## 5. O mapa (visualização principal)

- Renderização em **canvas** (D3 só para escalas, zoom e utilidades), com pan/zoom suave.
- Pontos que passam no filtro: coloridos e maiores. Os demais: cinza translúcido.
- **Hover:** card com sprite e stats (usar `d3-delaunay` para achar o ponto mais próximo rapidamente).
- Zoom alto: o ponto pode virar o **sprite** do Pokémon.
- Codificações: **cor** (tipo, geração, categoria…), **tamanho** (BST ou um stat), **contorno** (ex.: lendário).
- **Seleção por laço (lasso):** desenhar uma região e listar/resumir quem está dentro.
- **Vizinhos:** ao clicar num Pokémon, desenhar linhas até os N mais próximos (distância euclidiana — sem modelo de ML).
- **Troca de projeção animada:** PCA ↔ UMAP (pré-calculado) ↔ eixos crus (ex.: Ataque × Velocidade), com transição suave dos pontos.
- **Reprojetar no subconjunto:** refaz o PCA (no navegador, matriz 6×6, autovalores) só com os Pokémon filtrados, para ver como se organizam entre si. Deve ser um modo explícito, com indicação visual clara de que o mapa mudou.
- Jitter opcional para pontos sobrepostos.

## 6. Sistema de filtros

### 6.1 Modelo
Cada filtro é um **predicado** `(pokemon) => boolean`, serializável (para URL/compartilhar). Predicados se combinam com **E / OU / NÃO** e **grupos aninhados**.
Exemplo: `(Dragão OU Fogo) E linha_com_3_estágios E NÃO lendário`.

### 6.2 Filtros a suportar
- **Tipo:** primário, secundário, qualquer um, mono vs. dual, combinação exata (ex.: Dragão/Voador).
- **Linha evolutiva:** `line_stages` (1/2/3), estágio atual, evolui ou não, ramificada, bebê, nº de espécies na linha.
- **Categoria:** lendário, mítico, pseudo-lendário, bebê, normal.
- **Geração.**
- **Stats:** sliders de faixa por stat e para BST.
- **Físicos/outros:** altura, peso, taxa de captura, grupo de ovo, habilidades, cor, formato, habitat.
- **Busca por nome.**
- **Toggle** para incluir/excluir formas alternativas.

### 6.3 Conjuntos A e B (diferencial)
Dois filtros simultâneos, cada um com sua cor. O mapa mostra **A**, **B** e **A∩B**. Permite comparar visualmente, p.ex., "linhas de 1 estágio" vs. "linhas de 3 estágios".

### 6.4 Estado
Estado global dos filtros em **Zustand**. Filtros derivados (conjuntos, contagens, centroides) calculados com memoização. Idealmente o estado dos filtros pode ser codificado na URL.

## 7. Média central (centroides)

- Centroide de qualquer conjunto filtrado (A, B, tipo, categoria…) marcado no mapa.
- **Propriedade-chave:** o PCA é linear, logo o centroide 2D é a **projeção exata** da média no espaço de 6 dimensões. Não vale para UMAP/t-SNE (ali, desabilitar ou marcar como aproximação).
- Painel lateral com os stats médios do conjunto (e comparação A vs. B).
- **Elipse de dispersão** (covariância 2D) e/ou contorno de densidade (`d3-contour`).
- **Linhas do centroide até cada membro** e **distância média** (coesão do grupo).
- **Medoide:** o membro real mais próximo do centroide ("Pokémon mais típico" do grupo).
- **Modo "todos os tipos":** os 18 centroides de uma vez (mostra quais tipos são vizinhos/opostos).
- Distância entre centroides A e B.

## 8. Painéis da interface
Interface enxuta, o mapa ocupa a maior parte da tela.
- Barra lateral: construtor de filtros, seletor de cor/tamanho, seletor de projeção.
- Painel de detalhe (Pokémon selecionado) e painel de resumo do conjunto (contagem, médias, medoide).
- Sem galeria de gráficos: no máximo mini-visualizações auxiliares (ex.: radar do Pokémon ou do centroide) dentro dos painéis.

## 9. K-Means (camada opcional)

- **Só incluir depois do mapa e dos filtros funcionando**, e só se acrescentar valor.
- Papel: contraste entre categorias **declaradas** (tipo, geração, linha) e grupos **naturais** só pelos stats.
- Rodar nas **6 dimensões padronizadas** (não no 2D), pré-calcular k de 2 a 12 (`k-means++`, `n_init` alto, `random_state` fixo), exportar `kmeans: {"k2": 0, ..., "k12": 7}` no JSON.
- UI: seletor de k que apenas colore o mapa / vira um filtro "cluster = N".
- Se os clusters não acrescentarem nada, **descartar**.

## 10. Stack

- **Python:** `requests`, `pandas`, `numpy`, `scikit-learn`, `umap-learn` (opcional).
- **Front:** React + TypeScript + Vite.
- **Mapa:** D3 (`d3-scale`, `d3-zoom`, `d3-delaunay`, `d3-contour`, `d3-polygon` para laço) + canvas.
- **Estado:** Zustand.
- **UI:** Tailwind CSS.
- **Álgebra no browser** (reprojeção do subconjunto): implementar PCA de 6 features (covariância + autovalores, ex.: `ml-pca` ou `ml-matrix`).

## 11. Estrutura de pastas sugerida

```
pokemon-space-explorer/
├─ pipeline/                # Python
│  ├─ fetch.py              # baixa e cacheia PokeAPI
│  ├─ build_dataset.py      # monta o DataFrame, regras de evolução/categoria
│  ├─ project.py            # PCA (+ UMAP, + K-Means opcional)
│  ├─ export_json.py
│  ├─ requirements.txt
│  └─ data/raw/             # cache da API (no .gitignore)
├─ web/                     # React + Vite + TS
│  ├─ public/data/pokemon.json
│  └─ src/
│     ├─ components/        # Map, FilterBuilder, Panels...
│     ├─ filters/           # predicados, combinadores E/OU/NÃO, serialização
│     ├─ geometry/          # centroide, medoide, elipse, PCA no browser
│     ├─ store/             # Zustand
│     └─ types.ts
├─ CONTEXTO_PROJETO.md
└─ README.md
```

## 12. Fases e critérios de aceite

| Fase | Entrega | Critério de aceite |
|---|---|---|
| 1. Dados | Pipeline Python + `pokemon.json` | JSON válido; campos de evolução conferidos em casos conhecidos (Eevee, Dratini, Magikarp, Mewtwo); loadings do PCA reportados |
| 2. Mapa base | Pontos, zoom/pan, hover, cor por tipo | Hover fluido com ~1.000+ pontos; cores consistentes |
| 3. Filtros | Filtros simples → construtor E/OU/NÃO → conjuntos A/B | Consultas aninhadas funcionam; A/B/interseção visíveis; contagens corretas |
| 4. Centroides | Marcador, painel de médias, elipse, medoide, modo "todos os tipos" | Centroide 2D bate com a projeção da média em 6D (teste) |
| 5. Extras | Lasso, vizinhos, troca animada de projeção, reprojeção do subconjunto, sprites | Transições suaves; modo de reprojeção claramente sinalizado |
| 6. K-Means (opcional) | Seletor de k colorindo o mapa | Só se a decisão for "vale a pena" |

## 13. Cuidados e armadilhas

- Definir e documentar a regra de **linha evolutiva** logo no início (Eevee, bebês, linhas de 2 espécies com 3 formas).
- Padronizar os stats **antes** do PCA; só os 6 stats entram.
- Decidir cedo sobre **formas alternativas** (afeta contagem, PCA e centroides).
- Pontos sobrepostos escondem Pokémon: hover com Delaunay, jitter opcional, zoom.
- Centroide exato só em projeções lineares (PCA); sinalizar na UI nas demais.
- Clusters/agrupamentos aparentes no 2D podem não existir em 6D: ao usar K-Means, rodar nas 6 dimensões e só projetar.
- Dois PCAs diferentes (global vs. do subconjunto) não são comparáveis diretamente; a UI deve deixar claro qual está ativo.
- Performance: canvas (não SVG) para os pontos; memoizar filtros e centroides.
- Atribuição: dados da PokeAPI; sprites e nomes são propriedade da Nintendo/Game Freak/The Pokémon Company — projeto educacional, sem fins comerciais.

## 14. Decisões em aberto (confirmar com o autor)

1. Formas alternativas: incluídas no ajuste do PCA ou só como toggle de exibição?
2. Bebês contam como estágio na `line_stages`?
3. UMAP entra já na primeira versão ou fica para a fase 5?
4. Paleta de cores por tipo: usar as cores oficiais do jogo ou uma paleta própria mais acessível?
5. Nome final e idioma da interface (PT-BR ou EN).
