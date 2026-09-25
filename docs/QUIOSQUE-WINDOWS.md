# Quiosque no Windows Enterprise

Este documento descreve a implantação existente em termos gerais. **Não aplique a configuração em outro notebook sem confirmar a edição do Windows, o caminho do executável, uma conta administrativa de recuperação e as políticas da organização.**

## Como o notebook abre direto no aplicativo

O Shell Launcher do Windows foi habilitado e recebeu uma configuração com:

- `AutoLogonAccount`: o Windows cria/gerencia uma conta local padrão chamada `Kiosk` e entra nela automaticamente.
- Um perfil que substitui o Explorer pelo executável instalado em `C:\Program Files\ControleEquipamentos\ControleEquipamentos.exe --school-kiosk-shell`.
- Um perfil padrão com `explorer.exe`, de modo que a conta de administrador continue com a área de trabalho normal.
- `RestartShell` caso o aplicativo termine inesperadamente.

O aplicativo detecta o argumento `--school-kiosk-shell`, abre em tela cheia e habilita a saída **Administração → Configurações → Sair para o login do Windows**. Essa saída encerra a sessão `Kiosk` e permite selecionar a conta administrativa. O PIN deve ser alterado na primeira utilização.

O Shell Launcher precisa de Windows Enterprise/Education e a aplicação da configuração pelo MDM Bridge exige execução como `SYSTEM`. A configuração do dispositivo da escola foi feita separadamente do instalador do aplicativo. Consulte a [documentação oficial da Microsoft](https://learn.microsoft.com/en-us/windows/configuration/shell-launcher/quickstart-kiosk) antes de repetir esse processo.

## Desligamento diário

Na versão 1.0.1, **somente no modo quiosque gerenciado**, o aplicativo mostra um aviso das 18h25 às 18h30. Se ele estava aberto antes das 18h30, solicita ao Windows o desligamento às 18h30. A chamada usa `shutdown.exe /s /f /t 0`: o Windows fecha os programas, inclusive formulários ainda não salvos. O computador deve manter relógio e fuso horário corretos.

O desligamento é uma função do aplicativo, não uma tarefa agendada do Windows. Se o aplicativo não estiver rodando ou o Windows não aceitar a solicitação, ele pode não acontecer. A lógica foi testada automaticamente; a operação real no notebook deve ser observada. Um desligamento único de contingência no Windows é uma medida separada e ainda não faz parte deste projeto.

## Manutenção e reversão

Antes de atualizar, exporte um backup no Admin sempre que possível. Depois, saia da conta `Kiosk`, entre na conta administrativa e execute o instalador novo **no mesmo caminho**, sem desinstalar manualmente a versão anterior. O banco da conta `Kiosk` fica no perfil desse usuário, fora da pasta do programa.

Para desativar o quiosque, entre na conta administrativa e remova a configuração `ShellLauncher` do provedor `MDM_AssignedAccess` como `SYSTEM`; depois reinicie. A Microsoft documenta a remoção definindo `ShellLauncher = $null` no [guia do Shell Launcher](https://learn.microsoft.com/en-us/windows/configuration/shell-launcher/quickstart-kiosk#remove-shell-launcher). Os scripts específicos do dispositivo, o PsExec e o instalador não são publicados neste repositório.

**Atenção:** o Shell Launcher não é uma solução completa de bloqueio. Políticas da escola devem controlar atalhos, acesso a outros aplicativos, atualizações e manutenção física conforme a necessidade.
