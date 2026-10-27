# Pokémon Space Explorer — CLAUDE.md

Projeto pessoal de estudo. Leia `CONTEXTO_PROJETO.md` para o contexto completo.
As decisões da seção 2 são definitivas; trate-as como requisitos fixos.

## Sobre o autor
Estudante de ML (conhece KNN, árvores, MLP, ensembles). Experiência em React.
Não quer foco em predição nem em dashboards — o mapa é a interface principal.
Quer entender decisões não-óbvias; explique em poucas linhas sem excesso de teoria.

## Regras de colaboração
- Uma fase por vez (seção 12). Não avance sem confirmação.
- Código funcional com comandos exatos para rodar.
- Estrutura de pastas da seção 11, salvo justificativa.
- TypeScript estrito no front. Funções puras e testáveis para filtros e geometria.
- Ao final de cada fase, mostrar critérios de aceite e quais foram cumpridos.
- Se um dado da PokeAPI contradizer o documento, avisar em vez de adaptar em silêncio.

## Stack
Python (pandas, scikit-learn) → pokemon.json estático → React + Vite + TypeScript +
D3 (canvas) + Zustand + Tailwind. Sem backend, sem Streamlit, sem banco de dados.

## Decisões fechadas
- Formas alternativas: fora do PCA fit; toggle de exibição na UI.
- Bebês contam como estágio em line_stages; campo is_baby separado.
- UMAP: entra na Fase 5.
- Paleta: cores próprias baseadas nas cores oficiais dos tipos, com contraste ajustado.
- Interface: EN.

## Estado atual
- Fase 1 (Dados): CONCLUÍDA.
  - 1025 Pokémon (formas padrão), pokemon.json em web/public/data/.
  - Todos os casos de teste OK (Eevee, Dratini, Dragonite, Magikarp, Mewtwo, Pikachu, Pichu).
  - Pseudo-lendários: dragonite, tyranitar, salamence, metagross, garchomp,
    hydreigon, goodra, kommo-o, dragapult, baxcalibur (BST 600 confirmado via API).
  - PCA: PC1=44.1% (poder geral), PC2=18.4% (speed vs bulky). Total=62.5%.
- Fase 2 (Mapa base): próxima.

## Pseudo-lendários detectados (bst==600 + line_stages==3)
dragonite, tyranitar, salamence, metagross, garchomp,
hydreigon, goodra, kommo-o, dragapult, baxcalibur

## PCA Loadings (referência)
PC1 (horizontal — poder geral): todos os stats positivos, pesos similares (0.31–0.44)
PC2 (vertical — especialização): speed +0.70, defense -0.58, sp_attack +0.36
Confirmam interpretação do vídeo de referência.
