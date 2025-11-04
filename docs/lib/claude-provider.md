# Claude Provider - Anthropic AI SDK

Documentacao completa para uso do Anthropic Provider com foco em Claude Haiku no AI SDK.

## Indice

- [Visao Geral](#visao-geral)
- [Instalacao](#instalacao)
- [Configuracao e Autenticacao](#configuracao-e-autenticacao)
- [Modelos Disponiveis](#modelos-disponiveis)
- [Geracao de Texto](#geracao-de-texto)
- [Streaming](#streaming)
- [Tools e Function Calling](#tools-e-function-calling)
- [Capacidades Multimodais](#capacidades-multimodais)
- [Prompt Caching](#prompt-caching)
- [Reasoning (Pensamento)](#reasoning-pensamento)
- [Parametros e Configuracoes](#parametros-e-configuracoes)
- [Integracao com Next.js](#integracao-com-nextjs)
- [Best Practices](#best-practices)
- [Exemplos Praticos](#exemplos-praticos)
- [Troubleshooting](#troubleshooting)

---

## Visao Geral

O Anthropic Provider para AI SDK permite integracao completa com os modelos Claude da Anthropic, oferecendo recursos avancados como:

- **Streaming em tempo real** de respostas
- **Function calling** para execucao de ferramentas
- **Capacidades multimodais** (imagens, PDFs)
- **Prompt caching** para otimizacao de custos
- **Reasoning/Thinking** para raciocinio explicito
- **Provider-defined tools** (bash, web search, etc)

### Por que Claude Haiku?

Claude Haiku e o modelo mais rapido e economico da linha Claude, ideal para:

- **Alta velocidade de resposta** (~3x mais rapido que Sonnet)
- **Custo reduzido** (~90% mais barato que Opus)
- **Casos de uso leves** como chat, analise de texto, classificacao
- **Prototipagem rapida** e desenvolvimento iterativo

---

## Instalacao

### 1. Instalar o Anthropic Provider

\```bash
npm install @ai-sdk/anthropic
# ou
pnpm add @ai-sdk/anthropic
# ou
yarn add @ai-sdk/anthropic
\```

### 2. Instalar o AI SDK Core (se ainda nao instalado)

\```bash
npm install ai
\```

### Versoes Recomendadas

\```json
{
  "dependencies": {
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/react": "^2.0.0",
    "ai": "^5.0.0"
  }
}
\```

---

## Configuracao e Autenticacao

### 1. Obter API Key

1. Acesse [console.anthropic.com](https://console.anthropic.com)
2. Navegue ate **API Keys**
3. Crie uma nova chave de API
4. Copie a chave (comeca com `sk-ant-`)

### 2. Configurar Variaveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

\```env
# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
\```

**Importante**: Adicione `.env.local` ao seu `.gitignore`:

\```gitignore
# Environment variables
.env.local
.env
\```

### 3. Importacao Basica

\```typescript
// Importacao simples (usa ANTHROPIC_API_KEY por padrao)
import { anthropic } from '@ai-sdk/anthropic';

// Ou com configuracao customizada
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // opcional
  baseURL: 'https://api.anthropic.com/v1', // opcional
  headers: {
    // headers customizados
  },
  fetch: customFetchImplementation, // opcional
});
\```

---

## Modelos Disponiveis

### Linha de Modelos Claude

| Modelo | ID | Velocidade | Custo | Casos de Uso |
|--------|------------|-----------|-------|--------------|
| **Claude Haiku 3** | `claude-3-haiku-20240307` | ⚡⚡⚡ | $ | Chat, analise, classificacao |
| **Claude Haiku 3.5** | `claude-3-5-haiku-latest` | ⚡⚡⚡ | $ | Versao melhorada do Haiku |
| **Claude Haiku 4.5** | `claude-haiku-4-5` | ⚡⚡⚡ | $ | Ultima versao, mais capaz |
| **Claude Sonnet 3.5** | `claude-3-5-sonnet-20240620` | ⚡⚡ | $$ | Uso geral, balanceado |
| **Claude Sonnet 4** | `claude-sonnet-4-20250514` | ⚡⚡ | $$ | Mais avancado |
| **Claude Opus 3** | `claude-3-opus-20240229` | ⚡ | $$$ | Tarefas complexas |
| **Claude Opus 4** | `claude-opus-4-20250514` | ⚡ | $$$ | Raciocinio avancado |

### Recomendacoes por Caso de Uso

#### Para Claude Haiku (Foco deste projeto)

\```typescript
// ✅ Casos ideais para Haiku
const HAIKU_IDEAL_CASES = {
  chat: 'claude-3-5-haiku-latest',           // Chat basico
  classification: 'claude-3-5-haiku-latest', // Classificacao de texto
  summarization: 'claude-3-5-haiku-latest',  // Resumos
  extraction: 'claude-3-5-haiku-latest',     // Extracao de dados
  translation: 'claude-3-5-haiku-latest',    // Traducao
  codeCompletion: 'claude-3-5-haiku-latest', // Code completion simples
};

// ❌ Casos que podem precisar de modelos maiores
const NEEDS_SONNET_OR_OPUS = {
  complexReasoning: 'claude-sonnet-4-20250514',
  codeGeneration: 'claude-sonnet-4-20250514',
  multipleFiles: 'claude-sonnet-4-20250514',
  longContext: 'claude-opus-4-20250514',
};
\```

### Capacidades por Modelo

| Recurso | Haiku | Sonnet | Opus |
|---------|-------|--------|------|
| Entrada de imagem | ✅ | ✅ | ✅ |
| Entrada de PDF | ✅ | ✅ | ✅ |
| Tool Calling | ✅ | ✅ | ✅ |
| Object Generation | ✅ | ✅ | ✅ |
| Prompt Caching | ✅ | ✅ | ✅ |
| Reasoning/Thinking | ❌ | ✅ | ✅ |
| Computer Use | ❌ | ❌ | ✅ |
| Web Search | ❌ | ✅ | ✅ |
| Max Output Tokens | 4096 | 8192 | 8192 |
| Context Window | 200K | 200K | 200K |

---

## Geracao de Texto

### Geracao Basica

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const { text } = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Explique o que e Next.js em 3 paragrafos',
});

console.log(text);
\```

### Geracao com Parametros

\```typescript
const { text, usage, finishReason } = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Escreva uma receita de lasanha vegetariana para 4 pessoas',

  // Parametros de controle
  maxTokens: 1000,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,

  // Sistema
  system: 'Voce e um chef profissional especializado em culinaria italiana.',
});

console.log('Texto:', text);
console.log('Tokens usados:', usage.totalTokens);
console.log('Razao de termino:', finishReason);
\```

### Geracao com Multiplas Mensagens

\```typescript
const { text } = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: 'Qual e a capital da Franca?',
    },
    {
      role: 'assistant',
      content: 'A capital da Franca e Paris.',
    },
    {
      role: 'user',
      content: 'Quantos habitantes tem?',
    },
  ],
});
\```

---

## Streaming

### Text Streaming Basico

\```typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Escreva um artigo sobre inteligencia artificial',
});

// Opcao 1: Stream de texto
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Opcao 2: Stream completo
for await (const part of result.fullStream) {
  console.log(part);
}
\```

### Streaming no Next.js API Route

\```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages,
    system: 'Voce e um assistente util e prestativo.',
  });

  return result.toUIMessageStreamResponse();
}
\```

### Streaming no Client com useChat

\```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          <strong>{message.role}:</strong> {message.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}
\```

### Object Streaming

\```typescript
import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const result = streamObject({
  model: anthropic('claude-3-5-haiku-latest'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    sentiment: z.enum(['positive', 'neutral', 'negative']),
  }),
  prompt: 'Analise este tweet: "Adorei o novo iPhone 15! A camera e incrivel!"',
});

// Stream parcial do objeto
for await (const partialObject of result.partialObjectStream) {
  console.log(partialObject);
}

// Objeto final
const finalObject = await result.object;
console.log(finalObject);
\```

---

## Tools e Function Calling

### Definindo Tools Basicos

\```typescript
import { generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  tools: {
    weather: tool({
      description: 'Obtem o clima atual de uma cidade',
      parameters: z.object({
        city: z.string().describe('Nome da cidade'),
        unit: z.enum(['celsius', 'fahrenheit']).optional(),
      }),
      execute: async ({ city, unit = 'celsius' }) => {
        // Simulacao de API call
        const temp = unit === 'celsius' ? '22°C' : '72°F';
        return { city, temperature: temp, condition: 'ensolarado' };
      },
    }),

    calculator: tool({
      description: 'Realiza calculos matematicos',
      parameters: z.object({
        expression: z.string().describe('Expressao matematica'),
      }),
      execute: async ({ expression }) => {
        try {
          const result = eval(expression);
          return { result };
        } catch (error) {
          return { error: 'Expressao invalida' };
        }
      },
    }),
  },
  prompt: 'Qual e o clima em Sao Paulo e quanto e 15 * 23?',
  maxSteps: 5, // Permite multiplas execucoes de tools
});

console.log(result.text);
console.log('Tool calls:', result.toolCalls);
\```

### Tools com Streaming

\```typescript
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  tools: {
    search: tool({
      description: 'Busca informacoes na web',
      parameters: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        // Implementacao real de busca
        return { results: [\`Resultado 1 para \${query}\`, \`Resultado 2 para \${query}\`] };
      },
    }),
  },
  prompt: 'Busque informacoes sobre TypeScript 5.0',
  maxSteps: 3,
  headers: {
    'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14',
  },
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
\```

### Desabilitando Parallel Tool Use

\```typescript
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  tools: { /* ... */ },
  prompt: 'Execute estas tarefas',
  providerOptions: {
    anthropic: {
      // Executa apenas um tool por vez
      disableParallelToolUse: true,
    },
  },
});
\```

### Provider-Defined Tools (Agent Skills)

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-opus-4-20250514'),
  prompt: 'Execute este comando bash: ls -la',
  providerOptions: {
    anthropic: {
      container: {
        skills: [
          {
            type: 'anthropic',
            skillId: 'bash', // Execucao de comandos bash
            version: 'latest',
          },
          {
            type: 'anthropic',
            skillId: 'web_search', // Busca na web
            version: 'latest',
          },
          {
            type: 'anthropic',
            skillId: 'text_editor', // Edicao de texto
            version: 'latest',
          },
        ],
      },
    },
  },
});
\```

**Skills Disponiveis**:
- `bash` - Execucao de comandos bash
- `web_search` - Busca na web integrada
- `web_fetch` - Fetch de URLs
- `text_editor` - Edicao de arquivos de texto
- `computer` - Controle de computador (Claude Opus apenas)
- `pptx` - Manipulacao de PowerPoint

---

## Capacidades Multimodais

### Entrada de Imagens

#### Imagem via URL

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'O que voce ve nesta imagem?',
        },
        {
          type: 'image',
          image: new URL('https://example.com/image.jpg'),
        },
      ],
    },
  ],
});

console.log(result.text);
\```

#### Imagem via Base64

\```typescript
import fs from 'fs';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const imageBuffer = fs.readFileSync('./image.png');
const base64Image = imageBuffer.toString('base64');

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Descreva esta imagem em detalhes',
        },
        {
          type: 'image',
          image: \`data:image/png;base64,\${base64Image}\`,
        },
      ],
    },
  ],
});
\```

#### Multiplas Imagens

\```typescript
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Compare estas duas imagens',
        },
        {
          type: 'image',
          image: new URL('https://example.com/image1.jpg'),
        },
        {
          type: 'image',
          image: new URL('https://example.com/image2.jpg'),
        },
      ],
    },
  ],
});
\```

### Entrada de PDFs

#### PDF via URL

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Resuma este documento PDF',
        },
        {
          type: 'file',
          data: new URL('https://example.com/document.pdf'),
          mimeType: 'application/pdf',
        },
      ],
    },
  ],
});

console.log(result.text);
\```

#### PDF via Base64

\```typescript
import fs from 'fs';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const pdfBuffer = fs.readFileSync('./document.pdf');

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Extraia as informacoes principais deste PDF',
        },
        {
          type: 'file',
          data: pdfBuffer,
          mimeType: 'application/pdf',
        },
      ],
    },
  ],
});
\```

### Combinando Imagens, PDFs e Texto

\```typescript
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analise o relatorio e compare com a imagem do grafico',
        },
        {
          type: 'file',
          data: new URL('https://example.com/report.pdf'),
          mimeType: 'application/pdf',
        },
        {
          type: 'image',
          image: new URL('https://example.com/chart.png'),
        },
      ],
    },
  ],
});
\```

---

## Prompt Caching

O Prompt Caching permite reutilizar partes de prompts longos, economizando tokens e custos.

### Cache em Mensagens do Usuario

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const longDocumentation = \`
  [Documentacao longa aqui - 10000+ tokens]
\`;

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: longDocumentation,
          providerOptions: {
            anthropic: {
              cacheControl: { type: 'ephemeral' },
            },
          },
        },
        {
          type: 'text',
          text: 'Resuma a secao sobre instalacao',
        },
      ],
    },
  ],
});

// Verifica tokens de cache
console.log('Cache creation tokens:',
  result.providerMetadata?.anthropic?.cacheCreationInputTokens);
console.log('Cache read tokens:',
  result.providerMetadata?.anthropic?.cacheReadInputTokens);
\```

### Cache em System Messages

\```typescript
const systemPrompt = \`
  Voce e um assistente especializado em TypeScript.
  [Guias e exemplos extensos aqui - 5000+ tokens]
\`;

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'system',
      content: systemPrompt,
      providerOptions: {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      },
    },
    {
      role: 'user',
      content: 'Como declaro tipos em TypeScript?',
    },
  ],
});
\```

### Cache com TTL Customizado

Por padrao, o cache dura 5 minutos. Voce pode estender para ate 1 hora:

\```typescript
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: longContent,
          providerOptions: {
            anthropic: {
              cacheControl: {
                type: 'ephemeral',
                ttl: '1h', // Cache por 1 hora
              },
            },
          },
        },
        {
          type: 'text',
          text: 'Qual e o conteudo principal?',
        },
      ],
    },
  ],
});
\```

### Quando Usar Prompt Caching

✅ **Use quando**:
- Prompts longos (>1024 tokens)
- System prompts grandes
- Documentacao extensa
- Multiplas queries no mesmo contexto
- RAG com chunks grandes

❌ **Nao use quando**:
- Prompts curtos (<1024 tokens)
- Contexto muda frequentemente
- Uma unica query

### Economia de Custos com Cache

\```typescript
// Primeira chamada: cria o cache
const firstCall = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: longDocumentation, // 10.000 tokens
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        { type: 'text', text: 'Pergunta 1' },
      ],
    },
  ],
});

// Custo: 10.000 tokens de entrada (preco normal)

// Segunda chamada (dentro de 5 minutos): usa o cache
const secondCall = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: longDocumentation, // Mesmo conteudo
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        { type: 'text', text: 'Pergunta 2' },
      ],
    },
  ],
});

// Custo: 10.000 tokens de cache read (90% mais barato!)
\```

---

## Reasoning (Pensamento)

**Nota**: Reasoning esta disponivel apenas em Claude Sonnet e Opus, nao em Haiku.

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: 'Resolva este problema de logica: ...',
  providerOptions: {
    anthropic: {
      thinking: {
        type: 'enabled',
        budgetTokens: 12000, // Tokens para raciocinio
      },
    },
  },
});

console.log('Raciocinio:', result.reasoning);
console.log('Resposta:', result.text);
\```

---

## Parametros e Configuracoes

### Parametros de Geracao

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),

  // Prompt basico
  prompt: 'Escreva um poema sobre a primavera',

  // Ou mensagens
  messages: [/* ... */],

  // System prompt
  system: 'Voce e um poeta romantico',

  // Controle de geracao
  maxTokens: 2000,              // Maximo de tokens na resposta
  temperature: 0.7,             // 0.0 = deterministico, 1.0 = criativo
  topP: 0.9,                    // Nucleus sampling
  topK: 40,                     // Top-K sampling

  // Stop sequences
  stopSequences: ['---', 'FIM'],

  // Tools
  tools: {/* ... */},
  maxSteps: 5,                  // Maximo de tool executions

  // Headers
  headers: {
    'anthropic-beta': 'feature-name',
  },

  // Provider options
  providerOptions: {
    anthropic: {
      thinking: { type: 'enabled', budgetTokens: 12000 },
      disableParallelToolUse: false,
      sendReasoning: true,
      cacheControl: { type: 'ephemeral', ttl: '1h' },
    },
  },

  // Callbacks
  onFinish: ({ text, usage, finishReason }) => {
    console.log('Finished!', { text, usage, finishReason });
  },
});
\```

### Provider Options Completo

\```typescript
interface AnthropicProviderOptions {
  // Reasoning/Thinking
  thinking?: {
    type: 'enabled' | 'disabled';
    budgetTokens?: number; // Padrao: 10000
  };

  // Tools
  disableParallelToolUse?: boolean; // Padrao: false
  sendReasoning?: boolean; // Padrao: true

  // Cache
  cacheControl?: {
    type: 'ephemeral';
    ttl?: '5m' | '1h'; // Padrao: '5m'
  };

  // Agent Skills (apenas Opus)
  container?: {
    skills: Array<{
      type: 'anthropic';
      skillId: string;
      version: string;
    }>;
  };
}
\```

### Temperature e Sampling

\```typescript
// 🎯 Deterministico (para tarefas precisas)
const precise = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Extraia os dados desta tabela',
  temperature: 0.0,
  topP: 0.1,
});

// 🎨 Criativo (para escrita criativa)
const creative = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Escreva uma historia de ficcao cientifica',
  temperature: 1.0,
  topP: 0.95,
  topK: 50,
});

// ⚖️ Balanceado (para chat geral)
const balanced = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Explique machine learning',
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
});
\```

---

## Integracao com Next.js

### Estrutura de Arquivos

\```
my-app/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API route
│   ├── page.tsx                  # Componente de chat
│   └── layout.tsx
├── .env.local                    # Variaveis de ambiente
└── package.json
\```

### API Route Completa

\```typescript
// app/api/chat/route.ts
import {
  streamText,
  convertToModelMessages,
  type UIMessage
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export const runtime = 'edge'; // Opcional: usar Edge Runtime
export const maxDuration = 30; // Timeout de 30 segundos

export async function POST(req: Request) {
  try {
    const {
      messages,
      model = 'claude-3-5-haiku-latest',
      temperature = 0.7,
    }: {
      messages: UIMessage[];
      model?: string;
      temperature?: number;
    } = await req.json();

    // Validacao
    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    const result = streamText({
      model: anthropic(model),
      messages: convertToModelMessages(messages),
      system: 'Voce e um assistente prestativo e amigavel.',
      temperature,
      maxTokens: 4096,

      // Callbacks (opcional)
      onFinish: async ({ text, usage }) => {
        console.log('Chat completed:', {
          textLength: text.length,
          tokens: usage.totalTokens
        });
      },
    });

    return result.toUIMessageStreamResponse({
      sendSources: true,
      sendReasoning: true,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
\```

### Componente de Chat Cliente

\```typescript
// app/page.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function ChatPage() {
  const [model, setModel] = useState('claude-3-5-haiku-latest');

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/chat',
    body: {
      model,
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
    onFinish: (message) => {
      console.log('Message finished:', message);
    },
  });

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Chat com Claude</h1>

        {/* Seletor de modelo */}
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="claude-3-5-haiku-latest">Haiku 3.5</option>
          <option value="claude-3-5-sonnet-20240620">Sonnet 3.5</option>
          <option value="claude-opus-4-20250514">Opus 4</option>
        </select>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={\`p-4 rounded-lg \${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }\`}
          >
            <div className="font-semibold mb-1">
              {message.role === 'user' ? 'Voce' : 'Claude'}
            </div>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        ))}

        {isLoading && (
          <div className="bg-gray-100 p-4 rounded-lg mr-auto max-w-[80%]">
            <div className="animate-pulse">Claude esta pensando...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 p-4 rounded-lg">
            <div className="text-red-600">Erro: {error.message}</div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Digite sua mensagem..."
          className="flex-1 px-4 py-2 border rounded-lg"
          disabled={isLoading}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="px-6 py-2 bg-red-500 text-white rounded-lg"
          >
            Parar
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          >
            Enviar
          </button>
        )}
      </form>
    </div>
  );
}
\```

### useChat com Attachments

\```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function ChatWithAttachments() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });

  const [files, setFiles] = useState<FileList | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    handleSubmit(e, {
      experimental_attachments: files
        ? Array.from(files).map((file) => ({
            name: file.name,
            contentType: file.type,
            url: URL.createObjectURL(file),
          }))
        : undefined,
    });

    setFiles(null);
  };

  return (
    <form onSubmit={onSubmit}>
      <input value={input} onChange={handleInputChange} />
      <input
        type="file"
        onChange={(e) => setFiles(e.target.files)}
        multiple
        accept="image/*,.pdf"
      />
      <button type="submit">Enviar</button>
    </form>
  );
}
\```

---

## Best Practices

### 1. Escolha do Modelo Correto

\```typescript
// ✅ BOM: Haiku para tarefas simples
const summary = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Resuma este texto em 3 frases',
});

// ❌ RUIM: Opus para tarefa simples (caro e lento)
const summary = await generateText({
  model: anthropic('claude-opus-4-20250514'),
  prompt: 'Resuma este texto em 3 frases',
});
\```

### 2. Use Prompt Caching para Contextos Grandes

\```typescript
// ✅ BOM: Cache para documentacao longa
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: longDocumentation,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        { type: 'text', text: query },
      ],
    },
  ],
});

// ❌ RUIM: Sem cache para contexto repetido
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: \`\${longDocumentation}\n\n\${query}\`,
});
\```

### 3. Streaming para UX Melhor

\```typescript
// ✅ BOM: Streaming para respostas longas
const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Escreva um artigo longo',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk); // Exibe em tempo real
}

// ❌ RUIM: Aguardar resposta completa
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Escreva um artigo longo',
});
console.log(result.text); // Usuario espera muito tempo
\```

### 4. Error Handling

\```typescript
// ✅ BOM: Error handling robusto
try {
  const result = await generateText({
    model: anthropic('claude-3-5-haiku-latest'),
    prompt: 'Hello',
  });
  console.log(result.text);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('rate_limit')) {
      console.error('Rate limit exceeded. Try again later.');
    } else if (error.message.includes('invalid_api_key')) {
      console.error('Invalid API key. Check your .env file.');
    } else {
      console.error('Unexpected error:', error.message);
    }
  }
}

// ❌ RUIM: Sem error handling
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Hello',
});
\```

### 5. Otimizacao de Tokens

\```typescript
// ✅ BOM: System prompt conciso
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  system: 'Voce e um assistente prestativo.',
  prompt: 'Explique TypeScript',
});

// ❌ RUIM: System prompt excessivo
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  system: \`
    Voce e um assistente muito prestativo e amigavel.
    Voce sempre responde de forma detalhada.
    Voce e especialista em programacao.
    Voce conhece todas as linguagens.
    Voce sempre explica com exemplos.
    [... 500 linhas ...]
  \`,
  prompt: 'Explique TypeScript',
});
\```

### 6. Type Safety com TypeScript

\```typescript
// ✅ BOM: Tipos bem definidos
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  model: string;
}

async function handleChat(request: ChatRequest) {
  const result = await generateText({
    model: anthropic(request.model),
    messages: request.messages,
  });

  return {
    text: result.text,
    usage: result.usage,
  };
}

// ❌ RUIM: Tipos any
async function handleChat(request: any) {
  const result = await generateText({
    model: anthropic(request.model),
    messages: request.messages,
  });

  return result;
}
\```

### 7. Monitoramento e Logging

\```typescript
// ✅ BOM: Log de metricas importantes
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Explique IA',
  onFinish: ({ text, usage, finishReason }) => {
    console.log({
      timestamp: new Date().toISOString(),
      model: 'claude-3-5-haiku-latest',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      finishReason,
      responseLength: text.length,
    });
  },
});
\```

---

## Exemplos Praticos

### 1. Chatbot Simples

\```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages,
    system: 'Voce e um assistente prestativo.',
  });

  return result.toUIMessageStreamResponse();
}
\```

\```typescript
// app/page.tsx
'use client';

import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
\```

### 2. Analise de Imagens

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

async function analyzeImage(imageUrl: string) {
  const result = await generateText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Descreva esta imagem em detalhes e identifique os objetos presentes.',
          },
          {
            type: 'image',
            image: new URL(imageUrl),
          },
        ],
      },
    ],
  });

  return result.text;
}

// Uso
const description = await analyzeImage('https://example.com/photo.jpg');
console.log(description);
\```

### 3. Extracao de Dados Estruturados

\```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

async function extractProductInfo(description: string) {
  const result = await generateObject({
    model: anthropic('claude-3-5-haiku-latest'),
    schema: z.object({
      name: z.string(),
      price: z.number(),
      currency: z.string(),
      category: z.string(),
      features: z.array(z.string()),
      inStock: z.boolean(),
    }),
    prompt: \`Extraia as informacoes do produto desta descricao: \${description}\`,
  });

  return result.object;
}

// Uso
const product = await extractProductInfo(\`
  iPhone 15 Pro Max - R$ 9.999,00
  Categoria: Smartphones
  Recursos: Camera 48MP, Chip A17 Pro, Tela 6.7"
  Disponivel em estoque
\`);

console.log(product);
// {
//   name: "iPhone 15 Pro Max",
//   price: 9999,
//   currency: "BRL",
//   category: "Smartphones",
//   features: ["Camera 48MP", "Chip A17 Pro", "Tela 6.7\""],
//   inStock: true
// }
\```

### 4. Chatbot com Ferramentas

\```typescript
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages,
    tools: {
      getWeather: tool({
        description: 'Obtem o clima de uma cidade',
        parameters: z.object({
          city: z.string(),
        }),
        execute: async ({ city }) => {
          // Chamada real para API de clima
          const response = await fetch(
            \`https://api.openweathermap.org/data/2.5/weather?q=\${city}&appid=\${process.env.WEATHER_API_KEY}\`
          );
          const data = await response.json();

          return {
            temperature: data.main.temp,
            condition: data.weather[0].description,
            humidity: data.main.humidity,
          };
        },
      }),

      getStockPrice: tool({
        description: 'Obtem o preco de uma acao',
        parameters: z.object({
          symbol: z.string(),
        }),
        execute: async ({ symbol }) => {
          // Chamada para API de acoes
          const response = await fetch(
            \`https://api.example.com/stocks/\${symbol}\`
          );
          const data = await response.json();

          return {
            symbol: symbol,
            price: data.price,
            change: data.change,
          };
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
}
\```

### 5. Resumo de PDFs

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import fs from 'fs';

async function summarizePDF(pdfPath: string) {
  const pdfBuffer = fs.readFileSync(pdfPath);

  const result = await generateText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: \`
              Resuma este documento PDF seguindo estas diretrizes:
              1. Identifique os pontos principais
              2. Liste as conclusoes
              3. Destaque dados importantes
              4. Seja conciso (maximo 500 palavras)
            \`,
          },
          {
            type: 'file',
            data: pdfBuffer,
            mimeType: 'application/pdf',
          },
        ],
      },
    ],
  });

  return result.text;
}

// Uso
const summary = await summarizePDF('./document.pdf');
console.log(summary);
\```

### 6. RAG com Prompt Caching

\```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Simulacao de knowledge base
const knowledgeBase = \`
  [Documentacao extensa sobre o produto - 15000 tokens]
\`;

async function answerQuestion(question: string) {
  const result = await generateText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages: [
      {
        role: 'user',
        content: [
          // Cache da knowledge base
          {
            type: 'text',
            text: \`Contexto:\n\${knowledgeBase}\`,
            providerOptions: {
              anthropic: {
                cacheControl: { type: 'ephemeral', ttl: '1h' },
              },
            },
          },
          // Pergunta do usuario (nao cached)
          {
            type: 'text',
            text: \`Pergunta: \${question}\`,
          },
        ],
      },
    ],
  });

  return result.text;
}

// Multiplas perguntas aproveitam o cache
const answer1 = await answerQuestion('Como faco o setup?');
const answer2 = await answerQuestion('Quais sao os requisitos?');
const answer3 = await answerQuestion('Como fazer deploy?');
// Apenas a primeira chamada paga o custo total; as seguintes usam cache (90% desconto)
\```

### 7. Code Assistant

\```typescript
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import fs from 'fs/promises';

const codeAssistant = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  system: \`
    Voce e um assistente de programacao especializado em TypeScript e React.
    Voce pode ler, analisar e sugerir melhorias em codigo.
  \`,
  tools: {
    readFile: tool({
      description: 'Le o conteudo de um arquivo',
      parameters: z.object({
        path: z.string(),
      }),
      execute: async ({ path }) => {
        const content = await fs.readFile(path, 'utf-8');
        return { content };
      },
    }),

    analyzeCode: tool({
      description: 'Analisa codigo e retorna sugestoes',
      parameters: z.object({
        code: z.string(),
        language: z.string(),
      }),
      execute: async ({ code, language }) => {
        // Logica de analise (exemplo simplificado)
        const issues = [];

        if (code.includes('var ')) {
          issues.push('Use let/const ao inves de var');
        }

        if (code.includes('any')) {
          issues.push('Evite usar "any", defina tipos especificos');
        }

        return { issues };
      },
    }),
  },
  prompt: 'Analise o arquivo src/App.tsx e sugira melhorias',
  maxSteps: 10,
});

for await (const chunk of codeAssistant.textStream) {
  process.stdout.write(chunk);
}
\```

---

## Troubleshooting

### Erro: "Invalid API Key"

\```
Error: Invalid API Key
\```

**Solucao**:
1. Verifique se a variavel `ANTHROPIC_API_KEY` esta definida em `.env.local`
2. Confirme que a chave comeca com `sk-ant-`
3. Reinicie o servidor de desenvolvimento apos adicionar a variavel

\```bash
# Verificar se a variavel esta definida
echo $ANTHROPIC_API_KEY

# Reiniciar o servidor
npm run dev
\```

### Erro: "Rate Limit Exceeded"

\```
Error: 429 - Rate limit exceeded
\```

**Solucao**:
1. Implemente retry com exponential backoff
2. Adicione rate limiting no seu backend
3. Considere usar caching para reduzir chamadas

\```typescript
async function generateWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateText({
        model: anthropic('claude-3-5-haiku-latest'),
        prompt,
      });
    } catch (error) {
      if (error.message.includes('rate_limit') && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
\```

### Erro: "Context Length Exceeded"

\```
Error: Context length exceeded
\```

**Solucao**:
1. Reduza o tamanho do prompt
2. Use resumos ao inves de textos completos
3. Implemente chunking para documentos longos

\```typescript
// ❌ RUIM: Contexto muito longo
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: \`\${longDocument}\n\nResuma este documento\`,
});

// ✅ BOM: Chunking
async function summarizeLongDocument(document: string) {
  const chunks = splitIntoChunks(document, 50000); // 50k tokens por chunk
  const summaries = [];

  for (const chunk of chunks) {
    const summary = await generateText({
      model: anthropic('claude-3-5-haiku-latest'),
      prompt: \`Resuma este trecho:\n\n\${chunk}\`,
    });
    summaries.push(summary.text);
  }

  // Resumo final dos resumos
  const finalSummary = await generateText({
    model: anthropic('claude-3-5-haiku-latest'),
    prompt: \`Combine estes resumos em um resumo final:\n\n\${summaries.join('\n\n')}\`,
  });

  return finalSummary.text;
}
\```

### Streaming Nao Funciona no Vercel

**Problema**: O streaming para no meio no Vercel

**Solucao**: Use Edge Runtime

\```typescript
// app/api/chat/route.ts
export const runtime = 'edge'; // 👈 Adicione esta linha

export async function POST(req: Request) {
  const result = streamText({
    model: anthropic('claude-3-5-haiku-latest'),
    // ...
  });

  return result.toUIMessageStreamResponse();
}
\```

### CORS Error no Frontend

**Problema**: Erro de CORS ao chamar API

**Solucao**: Configure CORS no Next.js

\```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};
\```

### Tokens Consumidos Muito Rapido

**Problema**: Custo alto com tokens

**Solucao**:
1. Use prompt caching para contextos repetidos
2. Escolha o modelo certo (Haiku para tarefas simples)
3. Seja especifico no prompt (evite tokens desnecessarios)
4. Monitore usage com callbacks

\```typescript
let totalTokens = 0;

const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Explique IA',
  onFinish: ({ usage }) => {
    totalTokens += usage.totalTokens;
    console.log('Tokens usados:', usage.totalTokens);
    console.log('Total acumulado:', totalTokens);

    // Alerta se ultrapassar limite
    if (totalTokens > 1000000) {
      console.warn('⚠️ Limite de tokens atingido!');
    }
  },
});
\```

### Model Not Found

\```
Error: Model "claude-3-haiku" not found
\```

**Solucao**: Use o ID completo do modelo

\```typescript
// ❌ RUIM: ID incompleto
const result = await generateText({
  model: anthropic('claude-3-haiku'),
  prompt: 'Hello',
});

// ✅ BOM: ID completo
const result = await generateText({
  model: anthropic('claude-3-5-haiku-latest'),
  prompt: 'Hello',
});
\```

---

## Recursos Adicionais

### Documentacao Oficial

- [AI SDK Documentation](https://ai-sdk.dev)
- [Anthropic Provider Docs](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)
- [Anthropic API Reference](https://docs.anthropic.com)
- [Claude Models Overview](https://www.anthropic.com/claude)

### Exemplos e Templates

- [AI SDK Examples](https://github.com/vercel/ai/tree/main/examples)
- [Next.js AI Chatbot Template](https://vercel.com/templates/next.js/ai-chatbot)

### Community

- [AI SDK GitHub](https://github.com/vercel/ai)
- [AI SDK Discord](https://discord.gg/ai-sdk)
- [Anthropic Community](https://community.anthropic.com)

### Comparacao de Modelos

| Metrica | Haiku 3.5 | Sonnet 4 | Opus 4 |
|---------|-----------|----------|---------|
| Velocidade | ~3 segundos | ~10 segundos | ~20 segundos |
| Custo (input) | $0.25 / 1M tokens | $3.00 / 1M tokens | $15.00 / 1M tokens |
| Custo (output) | $1.25 / 1M tokens | $15.00 / 1M tokens | $75.00 / 1M tokens |
| Context Window | 200K tokens | 200K tokens | 200K tokens |
| Max Output | 4096 tokens | 8192 tokens | 8192 tokens |

---

## Conclusao

Este guia cobre todas as funcionalidades principais do Anthropic Provider com foco em Claude Haiku. Para desenvolvimento rapido e economico, Haiku e a escolha ideal, oferecendo:

- ⚡ **Performance excepcional** (~3 segundos para respostas)
- 💰 **Custo reduzido** (~90% mais barato que Opus)
- 🎯 **Qualidade suficiente** para 80% dos casos de uso
- 🔧 **Todas as features** (tools, multimodal, caching)

Use este documento como referencia ao integrar Claude no seu projeto Next.js!
