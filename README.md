# Anato Mapping — Atlas Anatômico Digital (UFPel)

Aplicação desktop multiplataforma (**Linux** e **Windows**) construída com **Tauri v2 (Rust)** + **React / TypeScript / Tailwind CSS** para curadores catalogarem imagens anatômicas offline e exportarem arquivos `.json` portáveis com coordenadas em porcentagem (`0.00%`–`100.00%`).

## Funcionalidades

- **100% offline / local:** nenhuma imagem sai da máquina do curador.
- **Múltiplos formatos:** `PNG`, `JPEG`, `WebP`, `AVIF`, `BMP`, `GIF` e `SVG`.
- **Modo Pasta e Imagem Única:** abra uma pasta inteira (pareando automaticamente `<imagem>.json` ao lado de cada arquivo) ou abra/arraste uma imagem avulsa.
- **Árvore Modular de Categorias:** inicia com os 12 sistemas do corpo humano em português sob a raiz `Sistemas` (`Esquelético`, `Articular`, `Muscular`, `Nervoso`, `Cardiovascular`, `Respiratório`, `Digestório`, `Urinário`, `Reprodutor`, `Endócrino`, `Linfático`, `Tegumentar`) e permite criar categorias pai/filho customizadas que viajam no `.json`.
- **Modo Mapeamento & Modo Visualização:** zoom ancorado no cursor, pan (`Espaço + arrastar`), arraste fino de pins, `Camadas` (`Rótulos`, `Números`, `Legenda`, fundo `Tema / Escuro / Xadrez / Claro`), pré-visualização com recorte ampliado 2.5×, metadados, bibliografia e filtros hierárquicos.
- **Tema Dual Modular:** alternância via botão deslizante entre **Escuro (Grafite)** e **Claro (Off-White)** com acentos verdes para áreas de interesse.

## Desenvolvimento

```bash
npm install
npm run check          # dependency-cruiser + tsc + Vitest
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri:dev      # executa app desktop nativo
npm run tauri:build    # gera pacote local
```

## Compatibilidade Linux (Wayland / Hyprland) e Windows

- **Linux Wayland:** em `src-tauri/src/wayland.rs`, `WEBKIT_DISABLE_DMABUF_RENDERER=1` é aplicado por padrão apenas se não estiver definido no ambiente, evitando tela branca ou erros de protocolo Wayland em compositores estritos (Hyprland/Sway) e drivers NVIDIA. Para testar DMA-BUF nativo: `WEBKIT_DISABLE_DMABUF_RENDERER=0 npm run tauri:dev`.
- **Windows:** o instalador NSIS instala no escopo `currentUser` (sem exigir permissão de Administrador em computadores de laboratório). Em executáveis não assinados, caso o SmartScreen exiba aviso na primeira abertura, clique em **Mais informações → Executar assim mesmo**.

## Arquitetura

- Glossário de domínio: [GLOSSARY.md](./GLOSSARY.md)
- Decisões arquiteturais: [docs/adr/](./docs/adr/)
- Deep modules & fronteiras (`dependency-cruiser`): [src/packages/README.md](./src/packages/README.md)
