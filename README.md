# Controle de Equipamentos — Informática

Aplicativo desktop **offline** para registrar retirada e devolução de equipamentos em uma escola. A interface foi pensada para um terminal compartilhado: botões grandes, poucos passos e retorno automático à tela inicial.

Este repositório usa **dados fictícios** (`Professor 1`, `Professor 2` etc.). Não contém o banco de dados, os nomes reais da escola nem o instalador usado no notebook de produção.

## O que o aplicativo faz

- Registra professor, equipamento, quantidade e sala/local de cada retirada.
- Mostra o que está fora e permite registrar a devolução.
- Mostra data e hora da retirada e, no Admin, da devolução.
- Controla disponibilidade a partir do estoque total menos as unidades em uso.
- Permite cadastrar, editar, desativar e, quando não há histórico vinculado, excluir professores, locais e equipamentos no Admin.
- Envia nomes digitados em **Outro** para revisão antes de incluí-los no catálogo.
- Exporta uma cópia do banco SQLite pelo painel administrativo.
- Mantém o histórico até exclusão manual: o Admin pode apagar uma devolução específica ou todas as devoluções, sem apagar retiradas em uso.
- Permite configurar o horário diário do desligamento no Admin e iniciar uma atualização a partir de um instalador no pendrive.
- Em um quiosque Windows gerenciado, abre em tela cheia e oferece saída para a tela de login no Admin.
- No quiosque gerenciado, avisa cinco minutos antes do horário configurado e solicita o desligamento nesse horário, todos os dias (padrão: 18h30).

## Como funciona

`React (tela) → preload (ponte restrita) → Electron (processo principal) → SQLite (dados locais)`

A interface não acessa o banco diretamente. Ela envia pedidos por IPC ao processo principal do Electron, que aplica as regras e grava os dados. A arquitetura e o fluxo de uma retirada estão detalhados em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Executar para desenvolver

É necessário ter Node.js e npm. No Windows, a dependência nativa `better-sqlite3` pode exigir as ferramentas C++ do Visual Studio caso não haja um binário compatível disponível.

```powershell
npm ci
npm run dev
```

Para rodar os testes e preparar a interface:

```powershell
npm test
npm run build
```

Para gerar um instalador Windows:

```powershell
npm run dist
```

O `electron-builder` grava o instalador em `release-current/ControleEquipamentos-Setup-v2.0.0.exe`. **Node.js, npm e uma IDE não são necessários no notebook que apenas executa o instalador.**

## Uso no dia a dia

1. Em **Retirar equipamento**, selecione ou procure o professor, o equipamento e a sala, informe a quantidade e confirme. O item aparece em **Fora agora**, com data e hora.
2. Em **Devolver equipamento**, escolha a retirada aberta e confirme. A disponibilidade do estoque é recalculada automaticamente.
3. Quando professor, equipamento ou local não estiver na lista, use **Outro**. O registro funciona, mas o novo nome fica pendente para conferência no Admin.
4. No **Admin**, cadastre ou ajuste estoque, revise itens pendentes, veja o histórico e exporte um backup. A limpeza do histórico só apaga registros já devolvidos e exige confirmação.

## Instalação e atualização no notebook

O programa é instalado para todos os usuários do Windows, mas **os dados pertencem à conta que usa o app**. Antes de atualizar, exporte o backup enquanto estiver na conta `Kiosk` e guarde o arquivo fora do notebook. Não desinstale manualmente a versão antiga nem apague a pasta de dados.

Para atualizar da versão 1.0.1 para a 2.0.0, saia do quiosque pelo Admin, entre na conta administradora do Windows e execute o instalador v2.0.0. Mantenha a pasta de instalação existente (`C:\Program Files\ControleEquipamentos`). Depois de reiniciar, confira em **Administração → Configurações** a versão instalada, o histórico e o horário de desligamento salvo. Para versões futuras, a v2 oferece **Atualizar pelo pendrive** no Admin: seleciona o instalador e cria um backup em `userData/backups/` antes de abri-lo. O Windows ainda pode exigir a conta administradora para concluir a instalação; esse fluxo completo de atualização futura não foi validado no notebook.

## Dados e backup

O banco SQLite é criado no diretório de dados do **usuário Windows** (`app.getPath('userData')`). Portanto, a conta `Kiosk` e a conta de administrador têm bancos separados. Uma atualização do programa no mesmo caminho não deve substituir esses dados, mas faça um backup antes de mudanças importantes.

O PIN inicial de uma instalação nova é `1234`; troque-o em **Administração → Configurações**. O PIN é uma barreira de uso da interface, **não substitui a segurança do Windows**. Não publique arquivos `.db` nem backups: eles podem conter nomes e histórico reais. A exportação de backup está disponível no Admin. A versão 2 não apaga mais automaticamente as devoluções antigas; registros que a versão anterior já apagou só podem ser recuperados de um backup anterior. A restauração deve ser validada antes de ser usada em produção.

## Quiosque Windows

O instalador **não ativa sozinho** o modo quiosque. No notebook da escola, o Windows Enterprise usa o Shell Launcher para entrar automaticamente em uma conta local padrão `Kiosk` e iniciar o executável com `--school-kiosk-shell`. A conta administrativa conserva o Explorer normal para manutenção. Veja [docs/QUIOSQUE-WINDOWS.md](docs/QUIOSQUE-WINDOWS.md) antes de configurar outro equipamento.

O desligamento é solicitado pelo próprio aplicativo **somente quando ele está aberto como quiosque gerenciado**. O horário é alterado em **Administração → Configurações**; não existe um segundo script ou tarefa do Windows nesta versão. O aviso e o desligamento físico foram testados no notebook da escola com um horário temporário, conforme relato do usuário. O horário configurado para a rotina diária deve ser conferido nesse notebook; o padrão de uma instalação nova é 18h30. Se o app estiver fechado, o desligamento não ocorrerá. Um formulário não salvo pode ser perdido no desligamento.

## Estrutura principal

- `src/`: telas React e estilos.
- `electron/main.js`: janela, IPC e integração com Windows.
- `electron/preload.js`: ponte restrita entre a tela e o processo principal.
- `electron/database.js`: SQLite, estoque, retiradas, devoluções e cadastros.
- `electron/shutdown-schedule.js`: regra de horário do desligamento.
- `tests/`: testes das regras de banco e horário.

## Escopo e cuidados

Este é um projeto local: não há servidor, nuvem, sincronização entre notebooks nem recuperação automática se o disco falhar. O Shell Launcher troca a tela inicial da conta `Kiosk`, mas **não bloqueia sozinho todos os recursos do Windows**; uma implantação pública exige políticas adicionais da organização. Este repositório não inclui instaladores, bancos, logs ou ferramentas de administração copiadas para o pendrive.
