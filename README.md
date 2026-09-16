# Family Chat 👨‍👩‍👧‍👦

Chat privado da família — um "WhatsApp" próprio, sem depender de número de telefone, com
mensagens em tempo real, fotos/vídeos/áudios/documentos sem perda de qualidade, localização,
grupos, PWA instalável e notificações push.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS 4
- **Supabase**: Postgres + Auth + Realtime + Storage + Edge Functions
- **PWA**: manifest, service worker próprio, prompt de instalação, ícone SVG (família em um balão de conversa)
- **Web Push (VAPID)**: notificações em tempo real, mesmo com o app fechado
- **Vercel**: hospedagem

Tudo é client-side reativo via Supabase Realtime — não há reload de página em nenhum fluxo do chat.

## Funcionalidades

- Cadastro protegido por **código de convite** (só quem tem o código da família consegue criar conta)
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

- **Confirmação de leitura** (double-check azul) por conversa
- **"Visto por último" / status online** dos participantes
- **Indicador de "digitando..."**
- **Contador de mensagens não lidas** por conversa
- **Separadores de data** ("Hoje", "Ontem") na conversa
- Sessão persistente — o app pede login só uma vez por aparelho

### Possíveis próximos passos (não incluídos, mas fáceis de adicionar)

- Apagar/editar mensagens para todos, reações (emoji), responder a uma mensagem específica na UI
  (o schema já tem `reply_to_id` pronto), busca de mensagens, backup de mídia, chamadas de voz/vídeo.

## Estrutura do projeto

```
src/
  app/                  Rotas (App Router)
    (auth)/login, register
    chat/                 Layout com sidebar + janela de conversa
    settings/             Perfil, notificações, logout
    manifest.ts            Web App Manifest (PWA)
  components/
    chat/                 Sidebar, ChatWindow, MessageBubble, AttachmentMenu, AudioRecorder...
    pwa/                  InstallPrompt, PushSubscriber, ServiceWorkerRegister
    providers/            SupabaseProvider (sessão + client)
    ui/                    Avatar, Modal, Spinner
  hooks/                  useConversations, useMessages, usePresence, useTypingIndicator...
  lib/                    supabase (client/server/middleware), messages.ts, format.ts, push.ts
public/
  sw.js                   Service worker (push + cache do shell)
  icons/                  Ícone SVG + PNGs gerados (família no balão de conversa)
supabase/
  migrations/             Schema SQL (tabelas, RLS, RPCs, triggers)
  functions/signup/       Edge Function: cadastro com código de convite
  functions/send-push/    Edge Function: dispara Web Push a cada mensagem nova
scripts/generate-icons.mjs  Gera os PNGs do ícone a partir do SVG
```

## Como o convite funciona

Não existe cadastro aberto: o formulário de registro exige um **código de convite** (tabela
`invite_codes`), validado pela Edge Function `signup` usando a service role key — a chave anônima
do navegador nunca cria usuários diretamente. A migration `0004_seed_invite.sql` já cria o código
inicial `FAMILIA2026` com 5 usos (um por membro da família). Troque/rotacione quando quiser:

```sql
insert into public.invite_codes (code, note, max_uses) values ('NOVOCODIGO', 'motivo', 5);
```

## Configuração do zero

### 1. Supabase

1. Crie um projeto em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Aplique as migrations em `supabase/migrations/*.sql`, na ordem, via SQL Editor (ou `supabase db push`
   se estiver usando a CLI local).
3. Em **Project Settings → API**, copie a `Project URL` e a `anon public key`.
4. Configure os segredos do Vault (usados pelo trigger que dispara o push):

   ```sql
   select vault.create_secret('https://SEU_PROJETO.supabase.co', 'project_url');
   select vault.create_secret('SUA_SERVICE_ROLE_KEY', 'service_role_key');
   ```

5. Faça o deploy das Edge Functions (`supabase/functions/signup` e `supabase/functions/send-push`):

   ```bash
   supabase functions deploy signup --no-verify-jwt
   supabase functions deploy send-push
   ```

6. Configure os segredos das functions:

   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:voce@exemplo.com
   ```

7. Em **Storage**, confirme que os buckets `avatars` (público) e `attachments` (privado) foram
   criados pela migration `0003_storage.sql`.

### 2. Variáveis de ambiente (Next.js / Vercel)

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

Gere as chaves VAPID com `npm run generate-vapid` (a pública vai também no `.env.local`; a privada
só é usada dentro da Edge Function `send-push`, nunca no Next.js).

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
- Depois de instalado e com a conta logada, vá em **Configurações → Ativar notificações** para
  conceder permissão. A partir daí, toda nova mensagem dispara um push em tempo real, mesmo com o
  app fechado.
- O ícone (família dentro de um balão de conversa) fica em `public/icons/icon.svg`; para regenerar
  os PNGs após editar o SVG, rode `npm run generate-icons`.

## Segurança

- Row Level Security habilitado em todas as tabelas: cada usuário só enxerga conversas das quais
  participa.
- Criação de conta só acontece via Edge Function com código de convite — a chave anônima pública
  não tem permissão de leitura na tabela `invite_codes`.
- Anexos ficam em um bucket privado; a URL de download é assinada e expira em 1 hora.
