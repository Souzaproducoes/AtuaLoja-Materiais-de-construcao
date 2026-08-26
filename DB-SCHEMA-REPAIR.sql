-- Atua Loja OS: reparação segura do schema local
-- Faça backup da base antes de executar.
-- Esta alteração não apaga linhas; apenas actualiza os valores permitidos da coluna role.

ALTER TABLE `users`
  MODIFY COLUMN `role`
  ENUM('user','admin','manager','sales','stock','logistics')
  NOT NULL DEFAULT 'user';
