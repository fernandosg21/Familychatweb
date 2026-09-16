# Family Chat 👨‍👩‍👧‍👦

Chat privado em família — um "WhatsApp" próprio, sem depender de número de telefone, com
mensagens em tempo real, fotos/vídeos/áudios/documentos sem perda de qualidade, localização,
grupos, PWA instalável e notificações push. Suporta várias famílias na mesma instalação: cada
uma tem seu próprio código de acesso e administrador.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS 4
- **Supabase**: Postgres + Auth + Realtime + Storage + Edge Functions
- **PWA**: manifest, service worker próprio, prompt de instalação, ícone SVG (família em um balão de conversa)
- **Web Push (VAPID)**: notificações em tempo real, mesmo com o app fechado
- **Vercel**: hospedagem

Tudo é client-side reativo via Supabase Realtime — não há reload de página em nenhum fluxo do chat.

## Funcionalidades

- Cada família tem seu **código de acesso** próprio; quem cria a família informa a própria data de
  nascimento (precisa ter 18+ anos) e vira administrador
- Novos membros pedem para entrar com esse código e ficam **pendentes até o administrador aprovar**
  (o administrador aprova/recusa em Configurações)
- **Administrador pode criar a conta de um membro diretamente** (útil para crianças sem e-mail
  próprio): informa nome e senha em Configurações e recebe o login pronto para configurar no
  aparelho dela — a conta já nasce aprovada
- Administrador pode **promover outro adulto aprovado a administrador** (ou remover)
- **Crianças não criam famílias nem grupos**: só o administrador define quem é adulto ou criança,
  preenchendo a data de nascimento de cada membro em Configurações — até isso ser feito, a conta é
  tratada como criança
- Se uma conta de criança faz logout, os administradores da família recebem um **push avisando**
  para checar o aparelho (pode ser tentativa de criar outra conta ou dificuldade de uso)
- Login por e-mail/senha — cada pessoa/aparelho tem sua própria conta
- Conversas individuais e em grupo, com nome e participantes
- Envio de texto, imagem, vídeo, áudio (gravação pelo microfone), documentos e localização
- Anexos enviados no arquivo original, sem recompressão (sem perda de qualidade)
- Indicador de digitação, presença online/offline, "visto por último", confirmação de leitura (✓✓ azul)
- Notificações push em tempo real (funciona até com o app fechado, se instalado como PWA)
- Instalável como app (Android, desktop e iOS) com prompt de instalação no primeiro acesso
- Tema claro/escuro automático (segue o sistema)
- Perfil editável (nome, foto, recado)

### Ideias que você pode ter esquecido (já incluídas)

- **Aprovação de novos membros pelo administrador da família** (impede estranhos, mesmo que o
  código vaze)
- **Perfis infantis**: só adultos (definidos pela data de nascimento) criam famílias e grupos
- **Alerta ao administrador quando uma conta infantil sai da conta** (push de "verifique o aparelho")
- **Confirmação de leitura** (double-check azul) por conversa
- **"Visto por último" / status online** dos participantes
- **Indicador de "digitando..."**
- **Contador de mensagens não lidas** por conversa
- **Separadores de data** ("Hoje", "Ontem") na conversa
- Sessão persistente — o app pede login só uma vez por aparelho
- App pronto para várias famílias diferentes usarem a mesma instalação, isoladas entre si

### Possíveis próximos passos (não incluídos, mas fáceis de adicionar)

- Apagar/editar mensagens para todos, reações (emoji), responder a uma mensagem específica na UI
  (o schema já tem `reply_to_id` pronto), busca de mensagens, backup de mídia, chamadas de voz/vídeo,
  trocar o código de acesso da família pelo painel (hoje é via SQL).

## Estrutura do projeto

```
src/
  app/                  Rotas (App Router)
    (auth)/login, register   Login e cadastro (criar família / entrar em uma)
    chat/                     Layout com sidebar + janela de conversa (bloqueado p/ pendentes)
    settings/                 Perfil, notificações, família, aprovações, logout
    manifest.ts               Web App Manifest (PWA)
  components/
    chat/                 Sidebar, ChatWindow, MessageBubble, AttachmentMenu, AudioRecorder,
                           ApprovalGate, PendingApprovals...
    pwa/                  InstallPrompt, PushSubscriber, ServiceWorkerRegister
    providers/            SupabaseProvider (sessão + client)
    ui/                    Avatar, Modal, Spinner
  hooks/                  useConversations, useMessages, usePresence, useMyFamily...
  lib/                    supabase (client/server/middleware), messages.ts, format.ts, push.ts
public/
  sw.js                   Service worker (push + cache do shell)
  icons/                  Ícone SVG + PNGs gerados (família no balão de conversa)
supabase/
  migrations/                Schema SQL (tabelas, RLS, RPCs, triggers)
  functions/signup/               Edge Function: cria conta + cria/entra numa família
  functions/manage-member/        Edge Function: admin aprova/recusa pedido de entrada
  functions/create-family-member/ Edge Function: admin cria a conta de um membro direto
  functions/notify-child-logout/  Edge Function: avisa o admin quando uma criança sai da conta
  functions/send-push/            Edge Function: dispara Web Push a cada mensagem nova
scripts/generate-icons.mjs  Gera os PNGs do ícone a partir do SVG
```

## Como funciona o acesso por família

Não existe cadastro público solto: no registro, a pessoa escolhe **"Criar uma família"** (define
nome + um código de acesso) ou **"Entrar numa família"** (informa o código que já existe). Em
ambos os casos a conta é criada pela Edge Function `signup` usando a service role key — a chave
anônima do navegador nunca cria usuários nem lê a tabela `families` diretamente.

- Quem **cria** a família vira administrador e já entra aprovado.
- Quem **entra** com o código fica com `approval_status = 'pending'` e só enxerga as demais
  conversas depois que um administrador aprova em **Configurações → Pedidos de entrada na
  família** (isso chama a Edge Function `manage-member`, que confere se quem está aprovando é
  realmente admin da mesma família antes de agir).

Troque o código de acesso de uma família quando quiser via SQL:

```sql
update public.families set join_code = 'NOVOCODIGO' where name = 'Nome da família';
```

## Configuração do zero

### 1. Supabase

1. Crie um projeto em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Aplique as migrations em `supabase/migrations/*.sql`, **na ordem**, via SQL Editor (ou
   `supabase db push` se estiver usando a CLI local).
3. Em **Project Settings → API**, copie a `Project URL` e a `anon public key`.
4. Configure os segredos usados pelas Edge Functions/triggers — tudo fica no **Vault do Supabase**
   (SQL Editor), então não é preciso `supabase secrets set` nem CLI:

   ```sql
   select vault.create_secret('https://SEU_PROJETO.supabase.co', 'project_url');
   select vault.create_secret('SUA_CHAVE_VAPID_PUBLICA', 'vapid_public_key');
   select vault.create_secret('SUA_CHAVE_VAPID_PRIVADA', 'vapid_private_key');
   select vault.create_secret('mailto:voce@exemplo.com', 'vapid_subject');
   ```

   Gere o par de chaves VAPID com `npm run generate-vapid`.

5. Faça o deploy das três Edge Functions (`signup` e `send-push` sem verificação de JWT — são
   chamadas antes do login/pelo trigger do banco —, `manage-member` com verificação, já que exige
   o token de quem está aprovando):

   ```bash
   supabase functions deploy signup --no-verify-jwt
   supabase functions deploy send-push --no-verify-jwt
   supabase functions deploy manage-member
   supabase functions deploy create-family-member
   supabase functions deploy notify-child-logout
   ```

6. Em **Storage**, confirme que os buckets `avatars` (público) e `attachments` (privado) foram
   criados pela migration `0003_storage.sql`.

### 2. Variáveis de ambiente (Next.js / Vercel)

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

Use a mesma chave pública VAPID gerada no passo anterior.

### 3. Rodar localmente

```bash
npm install
npm run dev
```

### 4. Deploy no Vercel

1. Importe o repositório no [Vercel](https://vercel.com/new).
2. Adicione as três variáveis de ambiente acima no projeto Vercel.
3. Deploy — pronto, cada `git push` na branch principal gera um novo deploy automaticamente.

## PWA e notificações

- Ao abrir o app pelo navegador, um banner convida a instalar (Android/desktop usam o prompt nativo
  via `beforeinstallprompt`; iOS mostra o passo a passo de "Compartilhar → Adicionar à Tela de Início",
  já que a Apple não oferece prompt automático).
- Depois de instalado e com a conta logada (e já aprovada), vá em **Configurações → Ativar
  notificações** para conceder permissão. A partir daí, toda nova mensagem dispara um push em
  tempo real, mesmo com o app fechado.
- O ícone (família dentro de um balão de conversa) fica em `public/icons/icon.svg`; para regenerar
  os PNGs após editar o SVG, rode `npm run generate-icons`.

## Segurança

- Row Level Security habilitado em todas as tabelas: cada usuário só enxerga conversas das quais
  participa e perfis da própria família já aprovados.
- Criação de conta e aprovação de membros só acontecem via Edge Functions com service role — a
  chave anônima pública não tem permissão de leitura na tabela `families`.
- Novo membro fica invisível para o resto da família (bloqueado pela RLS) até um administrador
  aprovar explicitamente.
- Anexos ficam em um bucket privado; a URL de download é assinada e expira em 1 hora.
