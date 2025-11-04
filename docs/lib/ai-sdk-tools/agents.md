# Agents - Orquestracao Multi-Agente

Sistema de multi-agente com handoffs automaticos e routing inteligente.

## Indice

- [Visao Geral](#visao-geral)
- [Instalacao](#instalacao)
- [Conceitos Basicos](#conceitos-basicos)
- [Criando Agentes](#criando-agentes)
- [Handoffs e Routing](#handoffs-e-routing)
- [Memory System](#memory-system)
- [Execucao](#execucao)
- [Configuracoes Avancadas](#configuracoes-avancadas)
- [Exemplos Completos](#exemplos-completos)
- [Best Practices](#best-practices)

---

## Visao Geral

O pacote `@ai-sdk-tools/agents` permite criar sistemas multi-agente onde:

- 🤖 **Agentes especializados** focam em tarefas especificas
- 🔄 **Handoffs automaticos** delegam para o agente certo
- 🎯 **Pattern matching** roteia sem overhead de LLM
- 🧠 **Memory built-in** mantem contexto entre conversas
- 🛡️ **Guardrails** validam input/output
- 📊 **Event tracking** monitora execucao

### Por que Multi-Agente?

\`\`\`
Tarefa complexa
      ↓
  Orquestrador
    /   |   \
   /    |    \
Math  Code  Writing
Agent Agent  Agent
\`\`\`

**Beneficios**:
- Cada agente usa o modelo ideal (custo/capacidade)
- Especialização melhora qualidade
- Context preservado em handoffs
- Escalavel para sistemas complexos

---

## Instalacao

\`\`\`bash
npm install @ai-sdk-tools/agents ai zod
\`\`\`

---

## Conceitos Basicos

### Agent

Um agente e uma entidade autonoma que:
- Tem um nome e instructions
- Usa um modelo LLM especifico
- Possui tools disponiveis
- Pode fazer handoff para outros agentes
- Mantem memoria persistente

### Handoff

Transferencia de controle de um agente para outro, preservando:
- Historico da conversa
- Contexto acumulado
- Working memory
- Tool results

### Pattern Matching

Routing automatico baseado em keywords/regex, sem LLM:

\`\`\`typescript
// Ativa automaticamente quando detecta "calculate" ou numeros
matchOn: ['calculate', 'math', /\d+\s*[\+\-\*\/]\s*\d+/]
\`\`\`

---

## Criando Agentes

### Agente Simples

\`\`\`typescript
import { Agent } from '@ai-sdk-tools/agents';
import { anthropic } from '@ai-sdk/anthropic';

const assistant = new Agent({
  name: 'Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  instructions: 'You are a helpful assistant. Be concise and friendly.',
});

// Usar
const response = await assistant.generate({
  prompt: 'What is TypeScript?',
});

console.log(response.text);
\`\`\`

### Agente com Tools

\`\`\`typescript
import { tool } from 'ai';
import { z } from 'zod';

const weatherAgent = new Agent({
  name: 'Weather Expert',
  model: anthropic('claude-3-5-haiku-latest'),
  instructions: 'You provide weather information.',
  
  tools: {
    getWeather: tool({
      description: 'Get current weather for a city',
      parameters: z.object({
        city: z.string(),
        unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
      }),
      execute: async ({ city, unit }) => {
        // Call weather API
        const data = await fetch(\`https://api.weather.com/\${city}\`);
        return data.json();
      },
    }),
  },
});
\`\`\`

### Agente com Instructions Dinamicas

\`\`\`typescript
const contextualAgent = new Agent({
  name: 'Contextual Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  
  // Function que recebe contexto
  instructions: ({ userId, chatId, workingMemory }) => {
    const userName = workingMemory?.name || 'User';
    const preferences = workingMemory?.preferences || {};
    
    return \`
      You are assisting \${userName}.
      Their preferences: \${JSON.stringify(preferences)}
      Be helpful and personalized.
    \`;
  },
});
\`\`\`

---

## Handoffs e Routing

### Multi-Agent com Handoffs

\`\`\`typescript
// Agentes especializados
const mathAgent = new Agent({
  name: 'Math Expert',
  model: anthropic('claude-3-5-haiku-latest'),
  instructions: 'You are a math expert. Solve mathematical problems.',
  matchOn: ['calculate', 'math', 'solve', /\d+\s*[\+\-\*\/]/],
});

const codeAgent = new Agent({
  name: 'Code Expert',
  model: anthropic('claude-3-5-sonnet-20240620'), // Modelo mais capaz
  instructions: 'You are a coding expert. Write and explain code.',
  matchOn: ['code', 'program', 'function', 'class'],
});

const writerAgent = new Agent({
  name: 'Writer',
  model: openai('gpt-4o'),
  instructions: 'You are a professional writer. Create engaging content.',
  matchOn: ['write', 'compose', 'create content'],
});

// Orquestrador
const orchestrator = new Agent({
  name: 'Coordinator',
  model: openai('gpt-4o-mini'), // Modelo barato
  instructions: \`
    You coordinate tasks between specialists.
    Analyze the request and delegate to:
    - Math Expert for calculations
    - Code Expert for programming
    - Writer for content creation
  \`,
  handoffs: [mathAgent, codeAgent, writerAgent],
});

// Uso
const response = await orchestrator.generate({
  prompt: 'Calculate 15 * 23 and write a short explanation',
  userId: 'user-123',
});

// Orquestrador identifica que precisa de Math e Writer
// 1. Delega para mathAgent: calcula 15 * 23 = 345
// 2. Delega para writerAgent: escreve explicacao
// 3. Retorna resultado combinado
\`\`\`

### Pattern-Based Routing (Sem LLM)

\`\`\`typescript
// Routing automatico - mais rapido e barato
const fastMathAgent = new Agent({
  name: 'Fast Math',
  model: anthropic('claude-3-5-haiku-latest'),
  
  // Ativa automaticamente quando detecta esses padroes
  matchOn: [
    'calculate',
    'compute',
    /\d+\s*[\+\-\*\/]\s*\d+/,
    /what is \d+/i,
  ],
  
  instructions: 'Solve the math problem quickly.',
});

const coordinator = new Agent({
  name: 'Coordinator',
  model: openai('gpt-4o-mini'),
  handoffs: [fastMathAgent],
});

// Quando usuario diz "calculate 5 + 3"
// fastMathAgent ativa automaticamente via pattern match
// Sem precisar do LLM do coordinator decidir!
\`\`\`

### Handoffs Condicionais

\`\`\`typescript
const seniorDev = new Agent({
  name: 'Senior Developer',
  model: anthropic('claude-opus-4-20250514'), // Modelo premium
  instructions: 'You handle complex architecture and design.',
});

const juniorDev = new Agent({
  name: 'Junior Developer',
  model: anthropic('claude-3-5-haiku-latest'), // Modelo barato
  instructions: 'You handle simple coding tasks.',
  
  // Pode escalar para senior se necessario
  handoffs: [seniorDev],
});

const techLead = new Agent({
  name: 'Tech Lead',
  model: openai('gpt-4o'),
  instructions: \`
    Assess task complexity:
    - Simple tasks: delegate to Junior Developer
    - Complex tasks: delegate to Senior Developer
  \`,
  handoffs: [juniorDev, seniorDev],
});
\`\`\`

---

## Memory System

### Working Memory

Memoria persistente acessivel pelo agente:

\`\`\`typescript
import { DrizzleProvider } from '@ai-sdk-tools/memory';
import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(process.env.DATABASE_URL);
const memoryProvider = new DrizzleProvider(db);

const agent = new Agent({
  name: 'Personal Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  
  memory: {
    provider: memoryProvider,
    
    // Working memory: contexto que persiste
    workingMemory: {
      enabled: true,
      scope: 'user', // 'user' ou 'chat'
    },
    
    // History: mensagens anteriores
    history: {
      enabled: true,
      limit: 10,
    },
  },
  
  instructions: ({ workingMemory }) => {
    const name = workingMemory?.name || 'User';
    const preferences = workingMemory?.preferences || {};
    
    return \`
      You are assisting \${name}.
      Remember their preferences: \${JSON.stringify(preferences)}
      Use this information to personalize responses.
    \`;
  },
});

// Primeira conversa
await agent.generate({
  prompt: 'My name is John and I prefer TypeScript',
  userId: 'user-123',
});

// Agent automaticamente salva: { name: 'John', preferences: { language: 'TypeScript' } }

// Proxima conversa (dias depois)
await agent.generate({
  prompt: 'Show me a code example',
  userId: 'user-123',
});

// Agent ja sabe: "Hi John! Here's a TypeScript example..."
\`\`\`

### Memory Scopes

\`\`\`typescript
// Chat-level: memoria isolada por conversa
memory: {
  workingMemory: { enabled: true, scope: 'chat' },
}

// User-level: memoria compartilhada em todas conversas do usuario
memory: {
  workingMemory: { enabled: true, scope: 'user' },
}
\`\`\`

### Memory Tools Automaticas

Agents automaticamente ganham tools para atualizar memoria:

\`\`\`typescript
// Agent pode usar internamente:
updateWorkingMemory({
  name: 'John',
  preferences: {
    language: 'TypeScript',
    framework: 'Next.js',
  },
});
\`\`\`

---

## Execucao

### generate() - Non-Streaming

\`\`\`typescript
const response = await agent.generate({
  prompt: 'What is React?',
  userId: 'user-123',
  chatId: 'chat-456', // Opcional
  
  // Opcoes adicionais
  maxTokens: 1000,
  temperature: 0.7,
});

console.log(response.text);
console.log(response.usage); // Token usage
console.log(response.finishReason);
\`\`\`

### stream() - Streaming

\`\`\`typescript
const stream = agent.stream({
  prompt: 'Write a long article',
  userId: 'user-123',
});

// AI SDK stream format
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
\`\`\`

### toUIMessageStream() - Next.js API Route

\`\`\`typescript
// app/api/chat/route.ts
import { Agent } from '@ai-sdk-tools/agents';
import { anthropic } from '@ai-sdk/anthropic';

const agent = new Agent({
  name: 'Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  instructions: 'You are helpful.',
});

export async function POST(req: Request) {
  const { prompt, userId } = await req.json();
  
  return agent.toUIMessageStream({
    prompt,
    userId,
  });
}

// Frontend (useChat funciona normalmente!)
import { useChat } from '@ai-sdk/react';

const { messages, input, handleSubmit } = useChat({
  api: '/api/chat',
  body: { userId: 'user-123' },
});
\`\`\`

### Event Tracking

\`\`\`typescript
const response = await agent.generate({
  prompt: 'Calculate 5 + 3',
  userId: 'user-123',
  
  onEvent: (event) => {
    switch (event.type) {
      case 'agent-start':
        console.log('Agent started:', event.agent);
        break;
      
      case 'agent-handoff':
        console.log(\`Handoff: \${event.from} -> \${event.to}\`);
        break;
      
      case 'tool-call':
        console.log('Tool called:', event.tool, event.args);
        break;
      
      case 'tool-result':
        console.log('Tool result:', event.result);
        break;
      
      case 'agent-finish':
        console.log('Agent finished:', event.result);
        break;
    }
  },
});
\`\`\`

---

## Configuracoes Avancadas

### Max Turns

Limite de iteracoes de tool calls:

\`\`\`typescript
const agent = new Agent({
  name: 'Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  tools: { /* ... */ },
  maxTurns: 5, // Maximo 5 tool calls
});
\`\`\`

### Guardrails

Validacao e modificacao de input/output:

\`\`\`typescript
const agent = new Agent({
  name: 'Safe Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  
  // Input guardrail
  inputGuardrail: async ({ prompt, userId }) => {
    // Filtrar conteudo inapropriado
    if (containsProfanity(prompt)) {
      throw new Error('Inappropriate content detected');
    }
    
    // Modificar prompt
    return {
      prompt: sanitize(prompt),
      userId,
    };
  },
  
  // Output guardrail
  outputGuardrail: async ({ text, userId }) => {
    // Filtrar informacoes sensiveis
    const sanitized = removeSensitiveData(text);
    
    // Log para auditoria
    await logOutput(userId, sanitized);
    
    return { text: sanitized };
  },
});
\`\`\`

### Tool Permissions

Controle quais tools estao disponiveis:

\`\`\`typescript
const agent = new Agent({
  name: 'Restricted Agent',
  model: anthropic('claude-3-5-haiku-latest'),
  
  tools: {
    readFile: tool({ /* ... */ }),
    writeFile: tool({ /* ... */ }),
    deleteFile: tool({ /* ... */ }),
  },
  
  // Permitir apenas leitura
  toolPermissions: ({ tool, userId }) => {
    if (tool === 'deleteFile') {
      return false; // Nao permitir
    }
    
    if (tool === 'writeFile' && !isAdmin(userId)) {
      return false; // Apenas admins podem escrever
    }
    
    return true;
  },
});
\`\`\`

---

## Exemplos Completos

### Exemplo 1: Sistema de Suporte Tecnico

\`\`\`typescript
// agents/support.ts
import { Agent } from '@ai-sdk-tools/agents';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { tool } from 'ai';
import { z } from 'zod';

// Agent Level 1: Responde perguntas simples
const l1Support = new Agent({
  name: 'L1 Support',
  model: anthropic('claude-3-5-haiku-latest'),
  
  instructions: \`
    You are L1 support.
    Handle common questions about:
    - Password resets
    - Account access
    - Basic troubleshooting
    
    If the issue is complex, escalate to L2.
  \`,
  
  matchOn: ['password', 'login', 'access', 'reset'],
  
  tools: {
    resetPassword: tool({
      description: 'Reset user password',
      parameters: z.object({ email: z.string().email() }),
      execute: async ({ email }) => {
        await sendPasswordReset(email);
        return { success: true };
      },
    }),
  },
});

// Agent Level 2: Problemas tecnicos
const l2Support = new Agent({
  name: 'L2 Support',
  model: anthropic('claude-3-5-sonnet-20240620'),
  
  instructions: \`
    You are L2 technical support.
    Handle:
    - Integration issues
    - API problems
    - Configuration
    
    If you need engineering help, escalate to L3.
  \`,
  
  tools: {
    checkApiStatus: tool({
      description: 'Check API health',
      parameters: z.object({ endpoint: z.string() }),
      execute: async ({ endpoint }) => {
        const status = await fetch(\`/health\${endpoint}\`);
        return status.json();
      },
    }),
    
    reviewLogs: tool({
      description: 'Review error logs',
      parameters: z.object({ userId: z.string(), hours: z.number() }),
      execute: async ({ userId, hours }) => {
        return await getErrorLogs(userId, hours);
      },
    }),
  },
});

// Agent Level 3: Engenharia
const l3Support = new Agent({
  name: 'L3 Engineering',
  model: openai('gpt-4o'),
  
  instructions: \`
    You are L3 engineering support.
    Handle critical issues and bugs.
    Create tickets for complex problems.
  \`,
  
  tools: {
    createJiraTicket: tool({
      description: 'Create engineering ticket',
      parameters: z.object({
        title: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
      }),
      execute: async (params) => {
        return await jira.createIssue(params);
      },
    }),
  },
});

// Coordinator
export const supportCoordinator = new Agent({
  name: 'Support Coordinator',
  model: openai('gpt-4o-mini'),
  
  instructions: \`
    You coordinate customer support.
    Route to:
    - L1 for simple issues
    - L2 for technical problems
    - L3 for critical bugs
  \`,
  
  handoffs: [l1Support, l2Support, l3Support],
  
  memory: {
    provider: memoryProvider,
    workingMemory: { enabled: true, scope: 'user' },
    history: { enabled: true, limit: 20 },
  },
});

// app/api/support/route.ts
export async function POST(req: Request) {
  const { message, userId } = await req.json();
  
  return supportCoordinator.toUIMessageStream({
    prompt: message,
    userId,
  });
}
\`\`\`

### Exemplo 2: Assistente de Pesquisa Multi-Agente

\`\`\`typescript
// Research system com especializacao

// Busca na web
const webSearchAgent = new Agent({
  name: 'Web Researcher',
  model: anthropic('claude-3-5-haiku-latest'),
  
  matchOn: ['search', 'find', 'look up', 'research'],
  
  tools: {
    searchWeb: tool({
      description: 'Search the web',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const results = await google.search(query);
        return results;
      },
    }),
  },
});

// Analisa papers academicos
const paperAnalysisAgent = new Agent({
  name: 'Paper Analyst',
  model: anthropic('claude-3-5-sonnet-20240620'),
  
  matchOn: ['paper', 'research', 'study', 'academic'],
  
  tools: {
    fetchPaper: tool({
      description: 'Fetch academic paper',
      parameters: z.object({ arxivId: z.string() }),
      execute: async ({ arxivId }) => {
        return await arxiv.fetch(arxivId);
      },
    }),
    
    analyzePaper: tool({
      description: 'Analyze paper content',
      parameters: z.object({ content: z.string() }),
      execute: async ({ content }) => {
        return await analyzeContent(content);
      },
    }),
  },
});

// Sintetiza informacoes
const synthesisAgent = new Agent({
  name: 'Synthesis Expert',
  model: openai('gpt-4o'),
  
  instructions: \`
    You synthesize research findings.
    Create comprehensive summaries with citations.
  \`,
});

// Coordinator
export const researchCoordinator = new Agent({
  name: 'Research Coordinator',
  model: openai('gpt-4o-mini'),
  
  instructions: \`
    You coordinate research tasks:
    1. Use Web Researcher for general information
    2. Use Paper Analyst for academic sources
    3. Use Synthesis Expert to combine findings
  \`,
  
  handoffs: [webSearchAgent, paperAnalysisAgent, synthesisAgent],
});
\`\`\`

---

## Best Practices

### 1. Use Modelos Apropriados

\`\`\`typescript
// ✅ BOM: Modelos adequados ao papel
const coordinator = new Agent({
  name: 'Coordinator',
  model: openai('gpt-4o-mini'), // Barato para routing
});

const specialist = new Agent({
  name: 'Specialist',
  model: anthropic('claude-opus-4-20250514'), // Premium para tarefas complexas
});

// ❌ RUIM: Opus para tudo (muito caro)
\`\`\`

### 2. Pattern Matching para Performance

\`\`\`typescript
// ✅ BOM: Pattern matching quando possivel
const mathAgent = new Agent({
  matchOn: ['calculate', /\d+/],
  // ...
});

// ❌ RUIM: Sempre usar LLM para decidir routing
\`\`\`

### 3. Limite maxTurns

\`\`\`typescript
// ✅ BOM: Previne loops infinitos
const agent = new Agent({
  maxTurns: 5,
  // ...
});
\`\`\`

### 4. Use Memory para Contexto

\`\`\`typescript
// ✅ BOM: Memory para personalizacao
const agent = new Agent({
  memory: {
    workingMemory: { enabled: true, scope: 'user' },
  },
  // ...
});
\`\`\`

### 5. Implemente Guardrails

\`\`\`typescript
// ✅ BOM: Validacao e seguranca
const agent = new Agent({
  inputGuardrail: sanitizeInput,
  outputGuardrail: filterSensitiveData,
  // ...
});
\`\`\`

---

## Recursos Adicionais

- **GitHub**: https://github.com/midday-ai/ai-sdk-tools
- **Docs**: https://ai-sdk-tools.dev/docs/agents
- **Exemplos**: https://ai-sdk-tools.dev/examples

---

## Conclusao

Agents sao ideais para:

- 🤖 Sistemas multi-agente complexos
- 🎯 Especializacao por dominio
- 🔄 Routing inteligente
- 🧠 Contexto persistente
- 🛡️ Sistemas de producao seguros

Comece com um agente simples e expanda conforme necessario!
