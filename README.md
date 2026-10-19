# Seu portfólio — Vinícius Pacheco

## Abrir no VS Code

1. Extraia o ZIP com **Extrair tudo**. Não edite diretamente dentro do arquivo compactado.
2. No VS Code, selecione **Arquivo → Abrir Pasta** e escolha a pasta `portfolio-vinicius` extraída.
3. Abra **Extensões** (`Ctrl + Shift + X`), procure **Live Server**, de **Ritwick Dey**, e instale. O VS Code também recomenda essa extensão ao abrir o projeto.
4. Clique com o botão direito no `index.html` e selecione **Open with Live Server**. O site abre no navegador.
5. Faça uma alteração e salve com `Ctrl + S`. O navegador será atualizado.

Você também pode abrir `portfolio-vinicius.code-workspace` para carregar o projeto. Não precisa executar `npm install`: este portfólio usa HTML, CSS e JavaScript puros.

## Onde mudar cada coisa

| Quero alterar | Arquivo |
| --- | --- |
| Título, texto inicial e minha história | `index.html` |
| Projetos, descrições e links | `assets/data.js` |
| Cores, fontes, espaçamentos e celular | `assets/styles.css` |
| Cores e quantidade de partículas da nebulosa | `assets/nebula.js`, objeto `CONFIG` no início |
| Movimento da nebulosa e suas reações | `assets/nebula.js` |
| Filtros, carrossel, diálogos e mensagens das interações | `assets/app.js` |
| Imagens dos certificados | `assets/certificates/` |

O VS Code está configurado para formatar o código ao salvar. Para formatar um arquivo manualmente, use `Shift + Alt + F`.

## Adicionar um projeto

Em `assets/data.js`, procure a lista `projects`, copie um objeto existente e ajuste os campos. Use um `id` exclusivo, coloque a imagem em `assets/` e atualize o endereço em `image`. Preencha `url` com o site e `code` com o repositório, se houver. URLs vazias não geram links inventados. Atualize os contadores fixos no HTML caso aumente a quantidade de projetos.

## Certificados

As seis imagens originais estão incluídas. Para substituir uma, mantenha a imagem original legível e atualize o objeto correspondente em `assets/data.js`, incluindo dimensões, data, horas e chave. O carrossel é automático e pausa quando alguém interage.

## Contato e publicação

WhatsApp, e-mail e Instagram já estão configurados. Se mudar seus contatos, procure o contato antigo tanto em `index.html` quanto em `assets/data.js`. O formulário abre o aplicativo de e-mail com uma mensagem preparada; não envia mensagens sozinho.

Salvar no VS Code altera esta cópia local. Para atualizar uma hospedagem, envie a pasta para o seu repositório ou publique os arquivos na hospedagem que escolher. O arquivo principal para hospedagem estática é `index.html`, e a pasta `assets` deve permanecer ao lado dele.

## Conferência final

Teste no navegador o menu do celular, filtros de projetos, certificados ampliados, links de contato, pausa das animações e nebulosa. A animação foi inspecionada por renderização Canvas em desktop e celular; a revisão integrada no navegador fica como etapa final antes de divulgar.
