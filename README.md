<div align="center">

<img src="./src-tauri/icons/app-icon.png" alt="Anato Mapping — Rod of Asclepius Logo" width="96" height="96" />

# Anato Mapping

**Marcação anatômica offline e exportação JSON com coordenadas em porcentagem — Atlas Anatômico Digital (UFPel)**

<p>
  <a href="https://github.com/eduardorwll/anato-mapping/releases/latest">
    <img src="https://img.shields.io/github/v/release/eduardorwll/anato-mapping?style=for-the-badge&color=34B383&labelColor=16181A&label=Release" alt="Latest Release" />
  </a>
  <a href="https://github.com/eduardorwll/anato-mapping/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/eduardorwll/anato-mapping/ci.yml?style=for-the-badge&labelColor=16181A&label=CI" alt="CI Status" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/github/license/eduardorwll/anato-mapping?style=for-the-badge&color=34B383&labelColor=16181A&label=License" alt="MIT License" />
  </a>
  <img src="https://img.shields.io/badge/Plataformas-Linux%20%7C%20Windows-1F7A5A?style=for-the-badge&labelColor=16181A" alt="Linux and Windows" />
</p>

<p>
  <img src="https://img.shields.io/badge/Rust-16181A?style=for-the-badge&logo=rust&logoColor=F1F3F2" alt="Rust" />
  <img src="https://img.shields.io/badge/Tauri_v2-16181A?style=for-the-badge&logo=tauri&logoColor=24C8DB" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/React_19-16181A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-16181A?style=for-the-badge&logo=typescript&logoColor=3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_v4-16181A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Vite-16181A?style=for-the-badge&logo=vite&logoColor=A78BFA" alt="Vite" />
</p>

<p>
  <img src="https://img.shields.io/badge/Vitest-16181A?style=for-the-badge&logo=vitest&logoColor=6E9F18" alt="Vitest" />
  <img src="https://img.shields.io/badge/Testing_Library-16181A?style=for-the-badge&logo=testinglibrary&logoColor=E33332" alt="Testing Library" />
  <img src="https://img.shields.io/badge/Dependency_Cruiser-16181A?style=for-the-badge&color=34B383&labelColor=16181A" alt="dependency-cruiser" />
  <img src="https://img.shields.io/badge/GitHub_Actions-16181A?style=for-the-badge&logo=githubactions&logoColor=2088FF" alt="GitHub Actions" />
</p>

</div>

---

## Download Direto (`v0.1.0`)

| Plataforma | Formato | Tamanho | Download |
|---|---|---:|---|
| **Windows (x64 — per-user, sem Admin)** | `.exe` (NSIS) | ~2.0 MB | [![Download Windows](https://img.shields.io/badge/Baixar_.exe-34B383?style=for-the-badge&logo=windows11&logoColor=16181A)](https://github.com/eduardorwll/anato-mapping/releases/download/v0.1.0/Anato.Mapping_0.1.0_x64-setup.exe) |
| **Linux (Debian / Ubuntu / Mint)** | `.deb` | ~3.1 MB | [![Download DEB](https://img.shields.io/badge/Baixar_.deb-34B383?style=for-the-badge&logo=debian&logoColor=16181A)](https://github.com/eduardorwll/anato-mapping/releases/download/v0.1.0/Anato.Mapping_0.1.0_amd64.deb) |
| **Linux (Universal — Arch / Ryoku / Fedora)** | `.AppImage` | ~77.8 MB | [![Download AppImage](https://img.shields.io/badge/Baixar_.AppImage-34B383?style=for-the-badge&logo=linux&logoColor=16181A)](https://github.com/eduardorwll/anato-mapping/releases/download/v0.1.0/Anato.Mapping_0.1.0_amd64.AppImage) |

> **Notas rápidas de instalação:**
> - **Windows:** por ser um executável sem certificado pago, o SmartScreen pode exibir um aviso na primeira abertura — clique em **Mais informações → Executar assim mesmo**. Não exige permissão de Administrador.
> - **Linux AppImage:** torne executável antes de abrir (`chmod +x Anato.Mapping_0.1.0_amd64.AppImage`).
> - Todas as versões: **[GitHub Releases](https://github.com/eduardorwll/anato-mapping/releases/latest)**.

---

## Funcionalidades

- **100% offline / local:** nenhuma imagem sai da máquina do curador.
- **Múltiplos formatos:** `PNG`, `JPEG`, `WebP`, `AVIF`, `BMP`, `GIF` e `SVG`.
- **Modo Pasta e Imagem Única:** abra uma pasta inteira (pareando automaticamente `<imagem>.json` ao lado de cada arquivo) ou abra/arraste uma imagem avulsa.
- **Árvore Modular de Categorias:** inicia com os 12 sistemas do corpo humano em português sob a raiz `Sistemas` (`Esquelético`, `Articular`, `Muscular`, `Nervoso`, `Cardiovascular`, `Respiratório`, `Digestório`, `Urinário`, `Reprodutor`, `Endócrino`, `Linfático`, `Tegumentar`), com criação inline de categorias pai/filho, controle independente de visibilidade por ramo e portabilidade embutida no `.json`.
- **Modo Mapeamento & Modo Visualização:** canvas de alta performance (`requestAnimationFrame`), zoom ancorado no cursor, pan (`Espaço + arrastar`), arraste fino de pins sem travamentos, trilho retrátil com botão 3-barras (`[` / `]`), `Camadas` (`Rótulos`, `Números`, `Legenda`, fundo `Tema / Escuro / Xadrez / Claro`), pré-visualização com recorte ampliado exato, metadados, bibliografia e filtros hierárquicos.
- **Tema Dual Modular:** alternância via botão deslizante entre **Escuro (Grafite)** e **Claro (Off-White)** com acentos esmeralda para áreas de interesse e paleta pastel de alto destaque para os pins.

---

## Desenvolvimento e Compilação (Linux & Windows)

```bash
npm install
npm run check          # dependency-cruiser + tsc + Vitest
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri:dev      # executa app desktop nativo
```

### Compilar executáveis locais

```bash
npm run build:linux    # gera .AppImage (e .deb/.rpm se disponíveis) com NO_STRIP=true
npm run build:windows  # no Windows gera NSIS .exe (PT-BR, per-user); no Linux usa cargo-xwin
```

Para cross-compilar Windows a partir do Linux (Arch/Ryoku), instale `nsis`, `lld`, `llvm`, o target `x86_64-pc-windows-msvc` e `cargo-xwin` — ou dispare a pipeline automática no GitHub Actions (`git tag vX.Y.Z && git push origin vX.Y.Z` ou `gh workflow run release.yml`).

---

## Compatibilidade Linux (Wayland / Hyprland) e Windows

- **Linux Wayland:** em [wayland.rs](./src-tauri/src/wayland.rs), `WEBKIT_DISABLE_DMABUF_RENDERER=1` é aplicado por padrão apenas quando não definido no ambiente, evitando tela branca ou erros de protocolo Wayland em compositores estritos (Hyprland/Sway) e drivers NVIDIA. Para testar DMA-BUF nativo: `WEBKIT_DISABLE_DMABUF_RENDERER=0 npm run tauri:dev`.
- **Windows:** o instalador NSIS instala no escopo `currentUser` (sem exigir permissão de Administrador em computadores de laboratório).

---

## Arquitetura

- Glossário de domínio: [GLOSSARY.md](./GLOSSARY.md)
- Decisões arquiteturais (ADRs): [docs/adr/](./docs/adr/)
- Deep modules & fronteiras (`dependency-cruiser`): [src/packages/README.md](./src/packages/README.md)

---

## Licença

Distribuído sob a licença **[MIT](./LICENSE)**.
