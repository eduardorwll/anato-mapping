# Glossário de Domínio — `anato-mapping`

Vocabulário ubíquo do projeto **Atlas Anatômico Digital (UFPel)** para a ferramenta de marcação e visualização anatômica. Todos os módulos, specs, comandos Rust, contratos JSON e testes devem usar estes termos exatos.

| Termo | Definição | Evitar |
|---|---|---|
| **Specimen Image** | Qualquer arquivo de imagem anatômica suportado (`PNG`, `JPEG`, `WebP`, `AVIF`, `BMP`, `GIF`, `SVG`). Nunca presumir apenas PNG. | foto, png, asset |
| **Annotation Document** | Arquivo `.json` UTF-8 versionado pareado com uma Specimen Image (`<stem>.json`), contendo metadados da imagem, Anatomical Taxonomy, snapshot de categorias customizadas e Pins. | config, export file |
| **Pin** | Marcador de acidente/estrutura anatômica ancorado em coordenadas percentuais `(x, y)` em `[0.00, 100.00]`, contendo `name`, `description`, `categoryId`, `tags` e `bibliography`. | dot, ponto, tag |
| **Category Node** | Nó da Category Tree (`id`, `label`, `parentId`, `colorToken`, `builtIn`). Pode ter pai e filhos arbitrários. | tipo, grupo, cor |
| **Category Tree** | Árvore modular de categorias composta pelos sistemas corporais nativos em português sob a raiz `Sistemas` somados às categorias pai/filho criadas pelo usuário. | lista plana, enum |
| **Anatomical Taxonomy** | Hierarquia de sumário de livro de uma Specimen Image: `system → region → structure → view`. | breadcrumbs, caminho |
| **Workspace** | Contexto ativo de trabalho: **Folder Workspace** (pasta de múltiplas Specimen Images com JSONs pareados) ou **Single-Image Workspace** (uma Specimen Image com JSON irmão opcional). | projeto, sessão |
| **Canvas Viewport** | Estado de câmera pan/zoom (`scale`, `offsetX`, `offsetY`) que projeta eventos de ponteiro entre pixels da tela e coordenadas percentuais da imagem. | stage, board |
| **Authoring Mode** | Modo curador (`Mapeamento`) para criar, arrastar, editar, categorizar e remover Pins e Anatomical Taxonomy. | modo admin |
| **Visualization Mode** | Modo leitura (`Visualização`) em HUD flutuante para pré-visualização como Atlas: hover tooltip, cartão flutuante com recorte ampliado, busca, filtros hierárquicos e legenda. | visão aluno |
