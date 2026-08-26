# Configuração local — Atua Loja OS

O servidor pode arrancar sem algumas integrações, mas os fluxos correspondentes ficam indisponíveis. Nunca coloque passwords ou chaves reais neste ficheiro.

## Variáveis obrigatórias


Exemplo de estrutura, com valores fictícios:

```env
DATABASE_URL=mysql://UTILIZADOR:PASSWORD@localhost:3306/atua_loja_dev
JWT_SECRET=substitua-por-uma-chave-aleatoria-longa
LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD=escolha-uma-password-forte
LOCAL_ADMIN_NAME=Administrador Atua Loja
LOCAL_ADMIN_EMAIL=admin@atua-loja.local
LOCAL_ADMIN_OPEN_ID=local_admin
ALLOW_LOCAL_ADMIN_LOGIN=false

```

## Variáveis opcionais


```env
NVIDIA_API_KEY=cole-a-chave-NVIDIA-aqui
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nome-do-modelo-NVIDIA
GROQ_API_KEY=cole-a-chave-Groq-aqui
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=nome-do-modelo-Groq
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
PORT=3000
```

## Diagnóstico no arranque

Ao executar `npm run dev`, o terminal apresenta um bloco `[Config]` com as variáveis em falta, separado entre **OBRIGATÓRIAS** e **OPCIONAIS**. Os valores nunca são impressos. Sem OAuth, utilize o formulário de login local em `/gestao`; as credenciais são verificadas apenas no servidor. O ASK tenta NVIDIA primeiro e Groq quando NVIDIA falha.

Depois de alterar `.env`, pare e reinicie o servidor:

```powershell
Ctrl+C
npm run dev
```

Para evitar alterações acidentais, mantenha `.env` fora do Git e utilize uma base de dados exclusiva de desenvolvimento ou staging.

## Instalação das dependências no Windows

Na pasta que contém `package.json`, execute `npm install`. O pacote actualizado removeu o plugin Vite incompatível com a árvore de dependências do npm e foi validado com uma instalação limpa. Não é necessário utilizar `--force` nem `--legacy-peer-deps`.

Depois da instalação, execute `npm run dev`. Se o PowerShell mostrar que `cross-env` não foi encontrado, a instalação não terminou correctamente; execute novamente `npm install` e confirme com `npm ls cross-env`.

## Login administrativo local ou staging


```env
LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD=troque-por-uma-password-forte
LOCAL_ADMIN_NAME=Administrador Atua Loja
LOCAL_ADMIN_EMAIL=admin@atua-loja.local
LOCAL_ADMIN_OPEN_ID=local_admin
```

Depois reinicie o servidor e abra `/gestao`. O formulário de acesso local usa essas variáveis apenas no backend, cria/actualiza o utilizador administrador na base de dados e emite uma sessão com validade de oito horas. Não coloque estas variáveis no frontend, não as publique no Git e não use uma password de produção para desenvolvimento.

Por segurança, o login local fica activo automaticamente apenas fora de produção. Em produção, continua desactivado mesmo que as variáveis existam, salvo se configurar explicitamente `ALLOW_LOCAL_ADMIN_LOGIN=true` e tiver uma política adicional de rotação e controlo de acesso.



## Reparação de schema antigo da tabela users

Se o login local devolver `Failed query: insert into users` ao gravar `role = admin`, a base foi criada com uma versão antiga do schema. Faça um backup, abra o ficheiro `DB-SCHEMA-REPAIR.sql` no phpMyAdmin, seleccione a base indicada por `DATABASE_URL` e execute o `ALTER TABLE` desse ficheiro. A operação apenas actualiza os valores permitidos de `users.role`; não elimina dados. Depois reinicie o servidor e tente o login novamente.
