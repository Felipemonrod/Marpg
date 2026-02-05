# Teste: Mapa RPG (Leaflet + Leaflet.draw) em TypeScript

Estrutura simples para usar mapas locais (imagens) como base do mapa e desenhar em cima (Leaflet.draw), com troca de mapa via UI.

## Rodar

- `npm install`
- `npm run dev`

Abra `http://localhost:5173/`.

### Pré-requisitos

- Node.js LTS (18+ recomendado)
- npm (vem junto com Node)

### Passo a passo (quem receber o ZIP)

1) Descompacte o ZIP em uma pasta (ex: `C:\projetos\teste_mapa_rpg`).
2) Abra um terminal dentro da pasta do projeto.
3) Instale as dependências (isso cria/baixa o `node_modules`):
   - `npm install`
4) Rode em desenvolvimento:
   - `npm run dev`
5) Abra `http://localhost:5173/`.

### Build/preview (opcional)

- Gerar build de produção:
  - `npm run build`
- Visualizar o build localmente:
  - `npm run preview`

## Importação de mapas (local)

Coloque os arquivos de mapa em `public/maps/`.

O app lê `public/maps/manifest.json` e monta o seletor de mapas automaticamente.

Exemplo de `public/maps/manifest.json`:

```json
{
  "maps": [
    { "id": "cidade", "name": "Cidade", "file": "cidade.png" },
    { "id": "dungeon", "name": "Dungeon", "file": "dungeon.webp" }
  ]
}
```

Depois, é só colocar `cidade.png` / `dungeon.webp` na pasta `public/maps/`.

## Troca de mapa

Use o dropdown “Mapa” no topo.

Os desenhos (polígono, linha, retângulo, marcador) são salvos no `localStorage` por `mapId` (um “save” por mapa).

## Overlays (camadas)

Você pode definir camadas extras por mapa (imagens transparentes PNG/WebP) e ligar/desligar pelo controle de camadas do Leaflet (canto superior direito).

Exemplo:

```json
{
  "maps": [
    {
      "id": "cidade",
      "name": "Cidade",
      "file": "cidade.png",
      "overlays": [
        { "id": "grid", "name": "Grade", "file": "cidade-grid.png", "opacity": 0.7, "enabled": true },
        { "id": "fog", "name": "Fog of War", "file": "cidade-fog.png", "opacity": 0.9, "enabled": false }
      ]
    }
  ]
}
```

Notas:
- Os overlays usam os mesmos bounds da imagem base, então a imagem do overlay precisa ter o mesmo tamanho (ou estar alinhada para isso).
- A camada “Desenhos” também aparece no controle e pode ser ligada/desligada.

## Overlays no frontend (cache) + tokens (monstros/players)

Além dos overlays declarados no `manifest.json`, o app agora tem um painel de **Camadas (frontend/cache)**.

- Você pode criar camadas, ajustar **opacidade** por slider e ligar/desligar.
- Você pode **importar imagens** (PNG/WebP/JPG) no browser; elas ficam salvas no **IndexedDB** (cache local do navegador).
- Você também pode **colar uma imagem** (Ctrl+V) direto no app para ela entrar na biblioteca.
- Com uma camada + imagem selecionadas, clique no mapa para colocar um token.
- Arraste para mover; botão direito remove.

Observação: como é cache do navegador, isso não grava arquivos na pasta do projeto.
