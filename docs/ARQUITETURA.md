# Arquitetura e regras de negócio

## Visão geral

O aplicativo usa Electron para rodar como programa Windows, React para a interface e SQLite (`better-sqlite3`) para persistência local. O Vite compila a interface para os arquivos usados pelo Electron no instalador.

```text
Pessoa usa a tela React
  → src/main.jsx chama window.equipmentAPI
  → electron/preload.js envia a chamada IPC
  → electron/main.js recebe e chama electron/database.js
  → SQLite grava ou consulta o banco do usuário Windows
  → o resultado volta à interface
```

A janela usa `contextIsolation: true` e `nodeIntegration: false`; a tela recebe somente as funções expostas pelo preload. Não existe API HTTP nem dependência de internet durante o uso.

## Exemplo: registrar uma retirada

1. A pessoa seleciona professor, equipamento, quantidade e local e confirma na interface.
2. O processo principal recebe `withdrawal:create` e chama `createWithdrawal`.
3. Uma transação SQLite valida os IDs, a quantidade e o estoque disponível.
4. O banco insere uma linha em `withdrawals` com status `EM_USO`.
5. A interface atualiza a lista de equipamentos fora e retorna à tela inicial.

O estoque disponível é calculado como `total − soma das quantidades em retiradas EM_USO`. Na devolução, a linha passa para `DEVOLVIDO`, com horário de retorno. Carrinhos são tratados como unidades individuais.

## Tabelas locais

- `teachers`: professores ativos, desativados e pendentes de revisão.
- `locations`: salas e outros locais.
- `equipment_types`: tipo, ícone, total e regras de controle de quantidade.
- `withdrawals`: quem retirou, o quê, quanto, para onde e estado da devolução.
- `settings`: PIN, horário de desligamento e opções locais. A chave antiga de retenção pode continuar em bancos existentes, mas não é mais aplicada.

O SQLite usa chaves estrangeiras e modo WAL. O banco é aberto a partir de `app.getPath('userData')`, ou seja, **cada conta Windows tem seus próprios dados**.

## Administração e histórico

O Admin permite editar o total de um equipamento, mas não reduzir o total abaixo da quantidade atualmente em uso. **Desativar** oculta um item do catálogo e mantém o histórico; **Excluir** é definitivo e só é aceito quando nenhuma retirada o referencia.

Quando a pessoa escolhe **Outro**, o nome digitado é gravado como pendente de revisão. A retirada permanece registrada, mas o novo nome não entra automaticamente no catálogo público. O Admin pode revisar e cadastrar.

Não há mais exclusão automática de histórico. No Admin, uma devolução pode ser excluída individualmente ou todas as devoluções podem ser apagadas com confirmação. Retiradas `EM_USO` não podem ser apagadas, pois fazem parte do cálculo do estoque. Exporte um backup antes da limpeza de fim de ano.

## Limites atuais

- Não há sincronização entre máquinas nem backup automático externo.
- O PIN administrativo não é um mecanismo de autenticação forte do sistema operacional.
- O modo quiosque depende da configuração do Windows Enterprise; abrir o `.exe` normalmente não reproduz o login automático.
- A importação de backup deve ser testada e o aplicativo reiniciado antes de considerar os dados restaurados.
