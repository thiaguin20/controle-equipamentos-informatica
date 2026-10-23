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

Na versão 2.0.0, **somente no modo quiosque gerenciado**, o aplicativo mostra um aviso nos cinco minutos anteriores ao horário configurado em **Administração → Configurações** (padrão: 18h30). Se ele estava aberto antes desse horário, solicita o desligamento nesse horário. A chamada usa `shutdown.exe /s /f /t 0`: o Windows fecha os programas, inclusive formulários ainda não salvos. O computador deve manter relógio e fuso horário corretos.

O desligamento é uma função do aplicativo, não uma tarefa agendada do Windows. Se o aplicativo não estiver rodando ou o Windows não aceitar a solicitação, ele pode não acontecer. A lógica passou em testes automatizados; o usuário também confirmou o aviso e o desligamento real no notebook da escola usando temporariamente 13h07. Depois desse teste, é necessário conferir no próprio notebook se o horário da rotina foi salvo novamente como 18h30. Um desligamento de contingência independente no Windows é uma medida separada e ainda não faz parte deste projeto.

## Manutenção e reversão

Na primeira atualização da versão 1.0.1 para a 2.0.0, use o método anterior: saia da conta `Kiosk`, entre na conta administrativa e execute o instalador novo **no mesmo caminho**, sem desinstalar manualmente a versão anterior. O botão de atualização ainda não existe na versão 1.0.1. Exporte um backup antes.

Depois da instalação da versão 2, **Administração → Configurações → Atualizar pelo pendrive** permite escolher um instalador novo no próprio aplicativo. Ele salva um backup local antes de abrir o instalador. Como o programa fica em `C:\Program Files`, o Windows pode solicitar a senha da conta administradora. Não há elevação automática nem instalação silenciosa. O fluxo completo ainda precisa de teste no notebook real; se o instalador não conseguir concluir com o app aberto, use a conta administrativa pelo método anterior.

Para desativar o quiosque, entre na conta administrativa e remova a configuração `ShellLauncher` do provedor `MDM_AssignedAccess` como `SYSTEM`; depois reinicie. A Microsoft documenta a remoção definindo `ShellLauncher = $null` no [guia do Shell Launcher](https://learn.microsoft.com/en-us/windows/configuration/shell-launcher/quickstart-kiosk#remove-shell-launcher). Os scripts específicos do dispositivo, o PsExec e o instalador não são publicados neste repositório.

**Atenção:** o Shell Launcher não é uma solução completa de bloqueio. Políticas da escola devem controlar atalhos, acesso a outros aplicativos, atualizações e manutenção física conforme a necessidade.
