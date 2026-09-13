# Raks Noor Festival, votação

App de pontuação do concurso do Raks Noor Festival. Substitui a folha de Excel
de 2025 e as folhas de papel dos júris.

Três entradas, todas em inglês:

- **Júri** (`/judge`): entra com nome e senha, dados pela organização. Vê as
  categorias abertas, dá 1 a 10 por critério a cada participante, e cada toque
  fica gravado na hora. Uma categoria fechada fica visível mas sem edição.
- **Resultados** (`/results`): página pública com senha definida pela
  organização. Mostra as categorias que a organização tornou visíveis, com a
  classificação e as notas de cada júri por critério. Serve para a TV durante
  o festival e para as bailarinas depois.
- **Organização** (`/admin`): eventos por ano, níveis, categorias,
  participantes (à mão ou por Excel), júris, critérios e a sua ordem de
  prioridade, abrir e fechar categorias, tornar resultados públicos, decidir
  empates, campeão por nível, exportar tudo para Excel.

## A regra de classificação

Está em `src/lib/ranking.ts`, sem base de dados, e é a única coisa que se
afasta do Excel de 2025 (que tinha o desempate ao contrário):

1. Por júri, a soma dos critérios dá os pontos, e os pontos dão a posição.
2. Soma das posições de todos os júris; menor ganha.
3. Empate: mais 1.ºs lugares, depois mais 2.ºs, depois mais 3.ºs.
4. Ainda empate: os critérios pela ordem de prioridade definida pela organização.
5. Ainda empate: alerta com os nomes, e o júri decide no painel.

Campeão de um nível: só quem fez todas as categorias do nível; soma dos lugares
finais, com os mesmos desempates.

Os testes (`npm test`) usam as notas reais de 2025 (`tests/fixtures`).

## Onde vive

- Código: GitHub `raksnoorfestival/raksnoor-voting`.
- Base de dados: Neon (Postgres), projeto `raksnoor-voting` na conta do festival.
- Site: Vercel.

## Correr localmente

    npm install
    npm run db:migrate        # cria as tabelas (lê .env.local)
    npm run db:seed           # cria o primeiro admin a partir do .env.local
    npm run db:seed-2025      # opcional: carrega o festival de 2025 como evento de teste
    npm run dev

O `.env.local` (nunca vai para o GitHub) tem `DATABASE_URL`, `DIRECT_URL`,
`AUTH_SECRET` e os dados do primeiro admin. Ver `.env.example`.

## Publicar

Cada envio para o `main` publica na Vercel. As variáveis de ambiente lá são as
mesmas do `.env.local` menos as `ADMIN_*`.
