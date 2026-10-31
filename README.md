# Pokémon Space Explorer

Aplicação web de visualização interativa que posiciona todos os **1025 Pokémon** num mapa 2D baseado em similaridade estatística. A posição de cada Pokémon no espaço é determinada por algoritmos de redução de dimensionalidade aplicados aos seis stats base (HP, Ataque, Defesa, Sp. Ataque, Sp. Defesa, Velocidade). O resultado é um mapa explorável onde Pokémon com perfis de stats parecidos ficam próximos no espaço.

O projeto é **100% client-side**: sem backend, sem banco de dados e sem serviços externos em runtime. Pode ser distribuído como um único executável `.exe` autossuficiente para Windows.

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Pipeline de dados | Python · pandas · scikit-learn · umap-learn |
| Frontend | React 18 · TypeScript strict · Vite 5 |
| Renderização do mapa | D3 (zoom, Delaunay) · Canvas API |
| Estado global | Zustand |
| Estilização | Tailwind CSS · CSS custom properties (design tokens) |
| Build/distribuição | pkg v5.8.1 (Node.js bundled) · executável Windows |
| Fonte de dados | PokeAPI (REST) |

---

## Pipeline de dados (Python)

- Consome a PokeAPI para coletar dados de todos os 1025 Pokémon (formas padrão)
- Aplica **PCA** (Principal Component Analysis) sobre os 6 stats normalizados
  - **PC1** (44,1% da variância): poder geral — todos os stats contribuem
  - **PC2** (18,4% da variância): especialização — Speed positivo (+0,70) vs. Defesa negativo (−0,58)
- Aplica **UMAP** (Uniform Manifold Approximation and Projection) como visão alternativa, que preserva a estrutura local (clusters de similaridade) melhor que o PCA
- Exporta um `pokemon.json` estático (~1,4 MB) que o frontend consome diretamente, sem requisições em runtime

---

## Features do frontend

### Mapa interativo (Canvas + D3)

- Renderização em canvas de 1025 pontos com zoom de 0,3× a 40×
- Batching por grupo de cor para minimizar draw calls
- Grade de fundo dinâmica que adapta a densidade ao nível de zoom
- Sprites dos Pokémon renderizados em alta resolução a partir de k ≥ 4 (com cache e downsampling)
- Modo sprite desativado automaticamente em zoom baixo para manter a performance

### Interação

- Hover com card de informações rápidas (triangulação de Delaunay para hit-test O(log n))
- Click seleciona o Pokémon; cliques repetidos no mesmo ponto ciclam entre Pokémon sobrepostos
- Double-click no mapa dá zoom; double-click sobre um Pokémon é suprimido (não dispara zoom)
- Câmera preservada ao aplicar filtros (coordenadas PCA/UMAP usadas como âncora no resize)

### Visualização

- **Toggle PCA ↔ UMAP**: alterna o espaço de coordenadas com re-fit suave da câmera
- **Labels de eixo adaptativos**: o PCA mostra "← fraco / forte →" e "Speed ↑ / ↓ Def"; o UMAP mostra legenda de proximidade
- **Linha evolutiva destacada**: ao selecionar um Pokémon, todos os membros da mesma cadeia ganham anel dourado (nos modos quadrado e sprite)
- **5 modos de cor**: por tipo, por geração, por categoria, por cor oficial e por combinação de dois filtros
- **Modo de tamanho**: pontos proporcionais ao BST ou ao Speed

### Filtros e busca

- Sistema de filtros multi-dimensionais: tipo, geração, categoria, forma, gênero, habilidade oculta
- Chips de filtros ativos exibidos abaixo do header
- Busca por nome com autocomplete (top 8 resultados), que leva o mapa até o Pokémon selecionado

### Painel de detalhes

- Exibe sprite, stats com barras segmentadas coloridas, matchups de tipo, habilidades, breeding e linha evolutiva
- Botão para reproduzir o grito do Pokémon (via PokeAPI cries)

---

## Desafios técnicos resolvidos

- **Precisão das coordenadas PCA**: a análise mostrou que 4 casas decimais produzem erro de 1,5 px em zoom máximo (k = 40); mantidas 6 casas decimais
- **Pokémon sobrepostos**: detecção de sobreposição por raio, com ciclagem de seleção, sem deformar o layout
- **Camera drift no resize**: o `ResizeObserver` converte o centro da viewport para coordenadas PCA/UMAP e reconstrói o transform, evitando reset de câmera ao abrir/fechar filtros
- **Distribuição como `.exe`**: o pipeline `npm run build` → `pkg` empacota o servidor de arquivos estáticos num executável único de ~37 MB

---

## Números

- 1025 Pokémon (gerações 1–9, formas padrão)
- PCA: 62,5% da variância preservada em 2 dimensões
- UMAP: layout não-linear com `random_state=42` para reprodutibilidade
- Build: 204 módulos, JS bundle de 268 KB (85 KB gzip)
- JSON: 1,44 MB raw / ~101 KB gzip
