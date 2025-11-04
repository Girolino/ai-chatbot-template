# Memory - Sistema de Memoria Persistente

Memoria persistente para agentes AI com suporte a multiplos backends.

## Indice

- [Visao Geral](#visao-geral)
- [Instalacao](#instalacao)
- [Memory Providers](#memory-providers)
- [Working Memory](#working-memory)
- [Conversation History](#conversation-history)
- [Memory Scopes](#memory-scopes)
- [Integracao com Agents](#integracao-com-agents)
- [Exemplos Completos](#exemplos-completos)
- [Best Practices](#best-practices)

---

## Visao Geral

O \`@ai-sdk-tools/memory\` fornece memoria persistente para agentes AI, permitindo:

- 🧠 **Working Memory**: Contexto que persiste entre conversas
- 💬 **Conversation History**: Historico de mensagens
- 📊 **Multiplos Providers**: InMemory, Drizzle (SQL), Upstash (Redis)
- 🔒 **Type-safe**: Totalmente tipado com TypeScript
- 🎯 **Scopes flexiveis**: Chat-level ou User-level
- 🤖 **Integracao automatica**: Funciona automaticamente com Agents

### Por que Memory?

Sem memoria:
\`\`\`
User: "My name is John"
Agent: "Hi! How can I help?"

[Proxima conversa]
User: "What's my name?"
Agent: "I don't know"  ❌
\`\`\`

Com memoria:
\`\`\`
User: "My name is John"
Agent: "Nice to meet you, John!"

[Proxima conversa]
User: "What's my name?"
Agent: "Your name is John!"  ✅
\`\`\`

---

## Instalacao

\`\`\`bash
npm install @ai-sdk-tools/memory
\`\`\`

Para Drizzle (SQL):
\`\`\`bash
npm install drizzle-orm @ai-sdk-tools/memory
\`\`\`

Para Upstash (Redis):
\`\`\`bash
npm install @upstash/redis @ai-sdk-tools/memory
\`\`\`

---

## Memory Providers

### 1. InMemory Provider (Desenvolvimento)

Cache em memoria - ideal para testes e desenvolvimento:

\`\`\`typescript
import { InMemoryProvider } from '@ai-sdk-tools/memory';

const memoryProvider = new InMemoryProvider();
\`\`\`

**Pros**:
- Zero configuracao
- Instantaneo
- Perfeito para desenvolvimento

**Cons**:
- Perdido ao reiniciar
- Nao escala para producao

### 2. Drizzle Provider (SQL Databases)

Suporta PostgreSQL, MySQL e SQLite:

\`\`\`typescript
import { DrizzleProvider } from '@ai-sdk-tools/memory';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import postgres from 'postgres';

// 1. Definir schema
export const workingMemory = pgTable('working_memory', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  chatId: text('chat_id'),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Inicializar database
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// 3. Criar provider
const memoryProvider = new DrizzleProvider(db, {
  workingMemoryTable: workingMemory,
  messagesTable: messages,
});
\`\`\`

**Pros**:
- Persistente
- Queries SQL poderosas
- Backups e replicacao
- Suporta multiplos DBs

**Cons**:
- Requer database
- Setup mais complexo

### 3. Upstash Provider (Redis Serverless)

Redis serverless para edge:

\`\`\`typescript
import { UpstashProvider } from '@ai-sdk-tools/memory';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const memoryProvider = new UpstashProvider(redis, {
  keyPrefix: 'memory:', // prefixo para keys
  ttl: 30 * 24 * 60 * 60, // 30 dias (opcional)
});
\`\`\`

**Pros**:
- Serverless / Edge-ready
- Latencia baixa
- Zero manutencao
- Pay-per-use

**Cons**:
- Custo baseado em requests
- TTL obrigatorio (ou fica caro)

---

## Working Memory

### O que e?

Working memory e um objeto JSON que persiste contexto:

\`\`\`json
{
  "name": "John",
  "preferences": {
    "language": "TypeScript",
    "framework": "Next.js"
  },
  "lastTopic": "API design",
  "goals": ["learn React", "build app"]
}
\`\`\`

### Como Funciona

1. **Agent le memory** no inicio da conversa
2. **Injeta no system prompt** automaticamente
3. **Agent pode atualizar** via tools
4. **Persiste** para proxima conversa

### Exemplo Manual

\`\`\`typescript
import { InMemoryProvider } from '@ai-sdk-tools/memory';

const memory = new InMemoryProvider();

// Salvar working memory
await memory.updateWorkingMemory(
  'user-123', 
  {
    name: 'John',
    preferences: { language: 'TypeScript' },
  },
  'chat-456' // opcional, para chat-level scope
);

// Recuperar working memory
const context = await memory.getWorkingMemory('user-123', 'chat-456');
console.log(context);
// { name: 'John', preferences: { language: 'TypeScript' } }
\`\`\`

---

## Conversation History

### O que e?

Historico de mensagens anteriores da conversa:

\`\`\`typescript
[
  { role: 'user', content: 'Hello!' },
  { role: 'assistant', content: 'Hi! How can I help?' },
  { role: 'user', content: 'What is React?' },
  { role: 'assistant', content: 'React is a library...' }
]
\`\`\`

### Salvar Mensagens

\`\`\`typescript
import { InMemoryProvider } from '@ai-sdk-tools/memory';

const memory = new InMemoryProvider();

// Salvar mensagem
await memory.saveMessage?.('chat-456', {
  id: 'msg-1',
  role: 'user',
  content: 'Hello!',
  createdAt: new Date(),
});

await memory.saveMessage?.('chat-456', {
  id: 'msg-2',
  role: 'assistant',
  content: 'Hi there!',
  createdAt: new Date(),
});

// Recuperar historico
const history = await memory.getMessages?.('chat-456', 10);
console.log(history);
\`\`\`

---

## Memory Scopes

### Chat-Level Scope

Memoria isolada por conversa:

\`\`\`typescript
memory: {
  provider: memoryProvider,
  workingMemory: {
    enabled: true,
    scope: 'chat', // ⬅️ Isolado por chat
  },
}

// Chat 1: { topic: 'React' }
// Chat 2: { topic: 'Vue' }
// Nao interferem entre si
\`\`\`

**Use quando**:
- Cada conversa e independente
- Topicos diferentes por chat
- Privacidade entre conversas

### User-Level Scope

Memoria compartilhada em todas conversas do usuario:

\`\`\`typescript
memory: {
  provider: memoryProvider,
  workingMemory: {
    enabled: true,
    scope: 'user', // ⬅️ Compartilhado
  },
}

// Chat 1: { name: 'John', preferences: {...} }
// Chat 2: Usa mesma memoria
// Chat 3: Usa mesma memoria
\`\`\`

**Use quando**:
- Personalizacao cross-chat
- Preferencias do usuario
- Contexto de longo prazo

---

## Integracao com Agents

### Configuracao Basica

\`\`\`typescript
import { Agent } from '@ai-sdk-tools/agents';
import { DrizzleProvider } from '@ai-sdk-tools/memory';
import { anthropic } from '@ai-sdk/anthropic';

const agent = new Agent({
  name: 'Personal Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  
  memory: {
    provider: memoryProvider,
    
    workingMemory: {
      enabled: true,
      scope: 'user', // ou 'chat'
    },
    
    history: {
      enabled: true,
      limit: 10, // Ultimas 10 mensagens
    },
  },
  
  instructions: ({ workingMemory }) => {
    // Memory injetada automaticamente!
    const name = workingMemory?.name || 'User';
    const prefs = workingMemory?.preferences || {};
    
    return \`
      You are assisting \${name}.
      Their preferences: \${JSON.stringify(prefs)}
      Use this to personalize your responses.
    \`;
  },
});
\`\`\`

### O que Acontece Automaticamente

1. **Load Memory**: Agent carrega working memory no inicio
2. **Inject Context**: Memory vai para system prompt
3. **Add Tools**: Agent ganha tool \`updateWorkingMemory\`
4. **Save Messages**: Mensagens salvas automaticamente
5. **Generate Title**: Titulo do chat gerado da primeira mensagem

### Tool updateWorkingMemory

Agent pode atualizar memoria internamente:

\`\`\`typescript
// Agent detecta: "My name is John and I prefer TypeScript"

// Agent chama internamente:
await updateWorkingMemory({
  name: 'John',
  preferences: {
    language: 'TypeScript',
  },
});

// Proxima conversa: "Hi John! Want some TypeScript help?"
\`\`\`

---

## Exemplos Completos

### Exemplo 1: Personal Assistant com Drizzle

\`\`\`typescript
// lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import postgres from 'postgres';

export const workingMemory = pgTable('working_memory', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  chatId: text('chat_id'),
  data: jsonb('data').notNull().\$type<{
    name?: string;
    preferences?: Record<string, any>;
    goals?: string[];
    [key: string]: any;
  }>(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);

// lib/memory.ts
import { DrizzleProvider } from '@ai-sdk-tools/memory';
import { db, workingMemory, messages } from './db';

export const memoryProvider = new DrizzleProvider(db, {
  workingMemoryTable: workingMemory,
  messagesTable: messages,
});

// lib/agents.ts
import { Agent } from '@ai-sdk-tools/agents';
import { anthropic } from '@ai-sdk/anthropic';
import { memoryProvider } from './memory';

export const personalAssistant = new Agent({
  name: 'Personal Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  
  memory: {
    provider: memoryProvider,
    workingMemory: { enabled: true, scope: 'user' },
    history: { enabled: true, limit: 10 },
  },
  
  instructions: ({ workingMemory, userId }) => {
    const name = workingMemory?.name || 'there';
    const goals = workingMemory?.goals || [];
    const prefs = workingMemory?.preferences || {};
    
    return \`
      You are a personal assistant for \${name}.
      
      User Preferences:
      \${JSON.stringify(prefs, null, 2)}
      
      Current Goals:
      \${goals.map((g, i) => \`\${i + 1}. \${g}\`).join('\n')}
      
      Be helpful, proactive, and remember context from previous conversations.
    \`;
  },
});

// app/api/chat/route.ts
export async function POST(req: Request) {
  const { prompt, userId } = await req.json();
  
  return personalAssistant.toUIMessageStream({
    prompt,
    userId,
  });
}
\`\`\`

### Exemplo 2: Learning Companion

\`\`\`typescript
import { Agent } from '@ai-sdk-tools/agents';
import { anthropic } from '@ai-sdk/anthropic';
import { memoryProvider } from './memory';

const learningCompanion = new Agent({
  name: 'Learning Companion',
  model: anthropic('claude-3-5-haiku-latest'),
  
  memory: {
    provider: memoryProvider,
    workingMemory: { enabled: true, scope: 'user' },
    history: { enabled: true, limit: 20 },
  },
  
  instructions: ({ workingMemory }) => {
    const level = workingMemory?.skillLevel || 'beginner';
    const topics = workingMemory?.completedTopics || [];
    const struggling = workingMemory?.strugglingWith || [];
    
    return \`
      You are a learning companion.
      
      Student Level: \${level}
      Completed Topics: \${topics.join(', ') || 'none yet'}
      Struggling With: \${struggling.join(', ') || 'nothing specific'}
      
      Adjust your explanations to their level.
      Track their progress and provide encouragement.
      Remember what they've learned and build on it.
    \`;
  },
});

// Agent automaticamente atualiza:
// - skillLevel conforme usuario progride
// - completedTopics quando domina um assunto
// - strugglingWith quando identifica dificuldades
\`\`\`

### Exemplo 3: Multi-Agent com Memoria Compartilhada

\`\`\`typescript
// Todos os agentes compartilham mesma memoria

const codeAgent = new Agent({
  name: 'Code Expert',
  model: anthropic('claude-3-5-sonnet-20240620'),
  memory: {
    provider: memoryProvider,
    workingMemory: { enabled: true, scope: 'user' },
  },
  instructions: ({ workingMemory }) => \`
    Preferences: \${workingMemory?.preferences?.language || 'any'}
  \`,
});

const designAgent = new Agent({
  name: 'Design Expert',
  model: openai('gpt-4o'),
  memory: {
    provider: memoryProvider,
    workingMemory: { enabled: true, scope: 'user' },
  },
  instructions: ({ workingMemory }) => \`
    Design style: \${workingMemory?.preferences?.designStyle || 'modern'}
  \`,
});

const coordinator = new Agent({
  name: 'Coordinator',
  model: openai('gpt-4o-mini'),
  handoffs: [codeAgent, designAgent],
  memory: {
    provider: memoryProvider,
    workingMemory: { enabled: true, scope: 'user' },
  },
});

// Todos agentes veem:
// { preferences: { language: 'TypeScript', designStyle: 'minimal' } }
\`\`\`

---

## Best Practices

### 1. Schema Tipado

\`\`\`typescript
// Define tipos para working memory
interface UserMemory {
  name?: string;
  email?: string;
  preferences: {
    language?: string;
    framework?: string;
    notifications?: boolean;
  };
  goals?: string[];
  completedTasks?: string[];
}

// Usar no provider
export const workingMemory = pgTable('working_memory', {
  // ...
  data: jsonb('data').\$type<UserMemory>(),
});
\`\`\`

### 2. Indice no Database

\`\`\`sql
-- PostgreSQL
CREATE INDEX idx_working_memory_user ON working_memory(user_id);
CREATE INDEX idx_working_memory_chat ON working_memory(chat_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
\`\`\`

### 3. Limite History Size

\`\`\`typescript
memory: {
  history: {
    enabled: true,
    limit: 10, // Apenas ultimas 10 mensagens
  },
}

// Evita context overflow e reduz custos
\`\`\`

### 4. Cleanup Periodico

\`\`\`typescript
// Deletar conversas antigas
async function cleanupOldChats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await db.delete(messages)
    .where(lt(messages.createdAt, thirtyDaysAgo));
  
  console.log('Old messages deleted');
}

// Executar diariamente via cron
\`\`\`

### 5. Backup Regular

\`\`\`bash
# PostgreSQL backup
pg_dump -U user -d database > backup.sql

# Upstash backup (via script)
# Exportar keys para S3/local
\`\`\`

---

## Implementando Custom Provider

Interface necessaria:

\`\`\`typescript
interface MemoryProvider {
  // Working memory
  getWorkingMemory(
    userId: string, 
    chatId?: string
  ): Promise<Record<string, any>>;
  
  updateWorkingMemory(
    userId: string, 
    data: Record<string, any>, 
    chatId?: string
  ): Promise<void>;
  
  // Conversation history (opcional)
  saveMessage?(
    chatId: string, 
    message: Message
  ): Promise<void>;
  
  getMessages?(
    chatId: string, 
    limit?: number
  ): Promise<Message[]>;
}

// Exemplo: MongoDB Provider
class MongoProvider implements MemoryProvider {
  constructor(private db: MongoDB) {}
  
  async getWorkingMemory(userId: string, chatId?: string) {
    const key = chatId ? \`\${userId}:\${chatId}\` : userId;
    const doc = await this.db.collection('memory').findOne({ key });
    return doc?.data || {};
  }
  
  async updateWorkingMemory(userId: string, data: any, chatId?: string) {
    const key = chatId ? \`\${userId}:\${chatId}\` : userId;
    await this.db.collection('memory').updateOne(
      { key },
      { \$set: { data, updatedAt: new Date() } },
      { upsert: true }
    );
  }
  
  async saveMessage(chatId: string, message: Message) {
    await this.db.collection('messages').insertOne({
      ...message,
      chatId,
    });
  }
  
  async getMessages(chatId: string, limit = 10) {
    return this.db.collection('messages')
      .find({ chatId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }
}
\`\`\`

---

## Troubleshooting

### Memory nao persiste

\`\`\`typescript
// ❌ PROBLEMA: InMemory em producao
const memory = new InMemoryProvider();

// ✅ SOLUCAO: Use Drizzle ou Upstash
const memory = new DrizzleProvider(db);
\`\`\`

### Context muito grande

\`\`\`typescript
// ❌ PROBLEMA: History ilimitado
memory: {
  history: { enabled: true, limit: 1000 },
}

// ✅ SOLUCAO: Limite razoavel
memory: {
  history: { enabled: true, limit: 10 },
}
\`\`\`

### Queries lentas

\`\`\`sql
-- ✅ Adicionar indices
CREATE INDEX idx_user ON working_memory(user_id);
CREATE INDEX idx_chat ON messages(chat_id);
\`\`\`

---

## Recursos Adicionais

- **GitHub**: https://github.com/midday-ai/ai-sdk-tools
- **Docs**: https://ai-sdk-tools.dev/docs/memory
- **Drizzle**: https://orm.drizzle.team
- **Upstash**: https://upstash.com

---

## Conclusao

Memory e essencial para:

- 🧠 Contexto persistente
- 👤 Personalizacao
- 📚 Historico de conversas
- 🎯 Experiencia consistente

Comece com InMemory e migre para Drizzle/Upstash em producao!
