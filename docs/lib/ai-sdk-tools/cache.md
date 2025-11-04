# Cache - Universal Caching para AI SDK Tools

Sistema de cache universal que reduz custos em 80% e melhora performance em 10x.

## Indice

- [Visao Geral](#visao-geral)
- [Instalacao](#instalacao)
- [Quick Start](#quick-start)
- [Backends Disponiveis](#backends-disponiveis)
- [Tipos de Tools Suportados](#tipos-de-tools-suportados)
- [Configuracoes](#configuracoes)
- [Integracao com Artifacts](#integracao-com-artifacts)
- [Exemplos Praticos](#exemplos-praticos)
- [Best Practices](#best-practices)

---

## Visao Geral

O \`@ai-sdk-tools/cache\` e um wrapper universal para caching de AI SDK tools que oferece:

- ⚡ **10x mais rapido** em cache hits
- 💰 **80% reducao de custos** evitando chamadas duplicadas
- 🔧 **Zero configuracao** - funciona out-of-the-box
- 🔄 **Suporte completo** para tools regulares, streaming e artifacts
- 📦 **Multiplos backends** - LRU (local) e Redis (distribuido)

### Quando Usar

Use cache quando tiver:
- Tool calls caros (APIs externas, processamento pesado)
- Chamadas repetitivas com mesmos parametros
- Necessidade de reduzir latencia
- Orcamento limitado de API

---

## Instalacao

\`\`\`bash
npm install @ai-sdk-tools/cache
\`\`\`

Para Redis (producao):
\`\`\`bash
npm install ioredis
\`\`\`

---

## Quick Start

### 1. Wrap Qualquer Tool

\`\`\`typescript
import { cached } from '@ai-sdk-tools/cache';
import { tool } from 'ai';
import { z } from 'zod';

// Tool original (caro)
const expensiveTool = tool({
  description: 'Fetch data from expensive API',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // 2 segundos de latencia
    const response = await fetch(\`https://api.expensive.com/search?q=\${query}\`);
    return response.json();
  },
});

// Tool com cache (instantaneo em hits)
const cachedTool = cached(expensiveTool);

// Primeira chamada: 2s (API request)
// Proximas chamadas: <1ms (cache hit)
\`\`\`

### 2. Usar no streamText

\`\`\`typescript
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { cached } from '@ai-sdk-tools/cache';

const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages,
  tools: {
    search: cached(searchTool),
    calculate: cached(calculateTool),
  },
});

return result.toUIMessageStreamResponse();
\`\`\`

---

## Backends Disponiveis

### LRU Cache (Default)

Cache em memoria, ideal para single-instance:

\`\`\`typescript
import { cached } from '@ai-sdk-tools/cache';

const cachedTool = cached(tool, {
  ttl: 5 * 60 * 1000, // 5 minutos (default)
  maxSize: 1000, // max entries (default)
});
\`\`\`

**Pros**:
- Zero configuracao
- Extremamente rapido
- Sem dependencias externas

**Cons**:
- Cache nao compartilhado entre instancias
- Perdido ao reiniciar

### Redis Cache (Producao)

Cache distribuido, ideal para multi-instance:

\`\`\`typescript
import { cached, RedisCache } from '@ai-sdk-tools/cache';
import Redis from 'ioredis';

// Inicializar Redis
const redis = new Redis(process.env.REDIS_URL);

// Criar backend
const redisCache = new RedisCache(redis, {
  keyPrefix: 'ai-cache:', // prefixo para keys
  ttl: 60 * 60 * 1000, // 1 hora
});

// Usar cache
const cachedTool = cached(tool, {
  cache: redisCache,
});
\`\`\`

**Pros**:
- Compartilhado entre instancias
- Persistente (configur avel)
- Escalavel

**Cons**:
- Requer Redis
- Latencia de rede (ms)

### Environment-Aware

Alternar entre LRU e Redis baseado no ambiente:

\`\`\`typescript
import { cached, RedisCache } from '@ai-sdk-tools/cache';
import Redis from 'ioredis';

// Cache backend baseado no ambiente
const cacheBackend = process.env.NODE_ENV === 'production'
  ? new RedisCache(new Redis(process.env.REDIS_URL))
  : undefined; // LRU default

const cachedTool = cached(tool, {
  cache: cacheBackend,
});
\`\`\`

---

## Tipos de Tools Suportados

### 1. Regular Tools

Tools assincronos normais:

\`\`\`typescript
const weatherTool = tool({
  description: 'Get weather',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => {
    const data = await fetch(\`https://api.weather.com/\${city}\`);
    return data.json();
  },
});

// Cache o resultado completo
const cachedWeather = cached(weatherTool);
\`\`\`

### 2. Streaming Tools

Async generators que fazem yield:

\`\`\`typescript
const streamingTool = tool({
  description: 'Stream large dataset',
  parameters: z.object({ query: z.string() }),
  execute: async function* ({ query }) {
    for (const chunk of await fetchLargeDataset(query)) {
      yield chunk;
    }
  },
});

// Cache todos os chunks
const cachedStreaming = cached(streamingTool);

// Primeira chamada: streams em tempo real
// Proxima chamada: todos chunks do cache (instantaneo)
\`\`\`

### 3. Artifact Tools

Tools que usam writer:

\`\`\`typescript
const dashboardTool = tool({
  description: 'Generate dashboard',
  parameters: z.object({ dateRange: z.string() }),
  execute: async ({ dateRange }, { writer }) => {
    writer.write(dashboardArtifact.create({ loading: true }));
    
    const data = await fetchData(dateRange);
    
    writer.write(dashboardArtifact.update({ data, complete: true }));
    
    return { success: true };
  },
});

// Cache artifacts E writer data
const cachedDashboard = cached(dashboardTool);

// ⚠️ IMPORTANTE: Incluir writer no context
const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  tools: { dashboard: cachedDashboard },
  experimental_context: { writer }, // NECESSARIO!
});
\`\`\`

---

## Configuracoes

### Opcoes Completas

\`\`\`typescript
const cachedTool = cached(tool, {
  // Cache backend
  cache: redisCache, // ou undefined para LRU
  
  // TTL (time-to-live)
  ttl: 5 * 60 * 1000, // 5 minutos
  
  // Max size (apenas LRU)
  maxSize: 1000,
  
  // Custom key generator
  keyGenerator: (params) => {
    // Customize cache key logic
    return \`custom-\${JSON.stringify(params)}\`;
  },
  
  // Conditional caching
  shouldCache: (result, params) => {
    // Nao cache erros
    if (result.error) return false;
    
    // Nao cache resultados vazios
    if (!result.data) return false;
    
    return true;
  },
  
  // Callbacks
  onHit: (key, value) => {
    console.log('Cache hit:', key);
    metrics.increment('cache.hit');
  },
  
  onMiss: (key) => {
    console.log('Cache miss:', key);
    metrics.increment('cache.miss');
  },
  
  // Debug mode
  debug: process.env.NODE_ENV === 'development',
});
\`\`\`

### Key Generation

Por padrao, a key e: \`tool-name:\${JSON.stringify(params)}\`

Customize para casos especiais:

\`\`\`typescript
// Exemplo: Ignorar timestamp nos parametros
const cachedTool = cached(tool, {
  keyGenerator: (params) => {
    const { timestamp, ...rest } = params;
    return \`search:\${JSON.stringify(rest)}\`;
  },
});

// Exemplo: Case-insensitive
const cachedTool = cached(tool, {
  keyGenerator: (params) => {
    const normalized = {
      ...params,
      query: params.query.toLowerCase(),
    };
    return JSON.stringify(normalized);
  },
});
\`\`\`

### Conditional Caching

Decida quando cachear:

\`\`\`typescript
const cachedTool = cached(tool, {
  shouldCache: (result, params) => {
    // Nao cache queries de usuario especifico
    if (params.userId === 'admin') {
      return false;
    }
    
    // Nao cache erros
    if (result.error || result.status === 'error') {
      return false;
    }
    
    // Nao cache resultados pequenos
    if (JSON.stringify(result).length < 100) {
      return false;
    }
    
    return true;
  },
});
\`\`\`

---

## Integracao com Artifacts

### IMPORTANTE: experimental_context

Para cachear artifacts corretamente, DEVE incluir \`writer\`:

\`\`\`typescript
// ❌ RUIM: Sem writer
const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  tools: {
    dashboard: cached(dashboardTool),
  },
  // Apenas text sera cacheado, artifacts NAO!
});

// ✅ BOM: Com writer
const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  tools: {
    dashboard: cached(dashboardTool),
  },
  experimental_context: { writer }, // ⚠️ NECESSARIO
});

// Agora artifacts sao cacheados completamente!
\`\`\`

### Exemplo Completo

\`\`\`typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { cached } from '@ai-sdk-tools/cache';
import { dashboardArtifact } from '@/lib/artifacts';
import { z } from 'zod';

const dashboardTool = tool({
  description: 'Generate financial dashboard',
  parameters: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  execute: async ({ startDate, endDate }, { writer }) => {
    // Expensive operation
    writer.write(dashboardArtifact.create({ loading: true }));
    
    const data = await fetchFinancialData(startDate, endDate);
    
    writer.write(dashboardArtifact.update({ data, complete: true }));
    
    return { success: true };
  },
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages,
    tools: {
      dashboard: cached(dashboardTool, {
        ttl: 10 * 60 * 1000, // 10 minutos
        debug: true,
      }),
    },
    experimental_context: { writer }, // ⚠️ IMPORTANTE
  });
  
  return result.toUIMessageStreamResponse();
}
\`\`\`

---

## Exemplos Praticos

### Exemplo 1: API Externa

\`\`\`typescript
import { cached } from '@ai-sdk-tools/cache';
import { tool } from 'ai';
import { z } from 'zod';

const githubTool = tool({
  description: 'Fetch GitHub repository info',
  parameters: z.object({
    owner: z.string(),
    repo: z.string(),
  }),
  execute: async ({ owner, repo }) => {
    const response = await fetch(
      \`https://api.github.com/repos/\${owner}/\${repo}\`
    );
    return response.json();
  },
});

// Cache por 1 hora (dados nao mudam muito)
const cachedGithub = cached(githubTool, {
  ttl: 60 * 60 * 1000,
  onHit: (key) => console.log('GitHub cache hit:', key),
  onMiss: (key) => console.log('GitHub API call:', key),
});

// Usar
const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  tools: { github: cachedGithub },
  messages: [
    { role: 'user', content: 'Tell me about vercel/next.js' },
  ],
});
\`\`\`

### Exemplo 2: Processamento Pesado

\`\`\`typescript
const analysisTool = tool({
  description: 'Analyze large dataset',
  parameters: z.object({ datasetId: z.string() }),
  execute: async ({ datasetId }) => {
    // 30 segundos de processamento
    const data = await loadDataset(datasetId);
    const result = await heavyAnalysis(data);
    return result;
  },
});

// Cache por 1 dia (processamento muito caro)
const cachedAnalysis = cached(analysisTool, {
  ttl: 24 * 60 * 60 * 1000,
  
  // Custom key (ignorar parametros irrelevantes)
  keyGenerator: ({ datasetId }) => \`analysis:\${datasetId}\`,
  
  // Monitoramento
  onHit: () => metrics.increment('analysis.cache_hit'),
  onMiss: () => {
    metrics.increment('analysis.cache_miss');
    slack.notify('Heavy analysis running');
  },
});
\`\`\`

### Exemplo 3: Cache Seletivo por Usuario

\`\`\`typescript
const searchTool = tool({
  description: 'Search documents',
  parameters: z.object({
    query: z.string(),
    userId: z.string(),
  }),
  execute: async ({ query, userId }) => {
    const results = await search(query, userId);
    return results;
  },
});

const cachedSearch = cached(searchTool, {
  // Apenas cache para usuarios regulares
  shouldCache: (result, params) => {
    // Admins sempre veem dados frescos
    if (isAdmin(params.userId)) {
      return false;
    }
    
    // Cache apenas resultados com dados
    return result.data && result.data.length > 0;
  },
  
  // Key por usuario
  keyGenerator: ({ query, userId }) => {
    return \`search:\${userId}:\${query.toLowerCase()}\`;
  },
});
\`\`\`

### Exemplo 4: Multi-Backend

\`\`\`typescript
import { cached, RedisCache } from '@ai-sdk-tools/cache';
import Redis from 'ioredis';

// Redis para producao
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null;

const redisCache = redis ? new RedisCache(redis) : undefined;

// Tools com caches diferentes
const tools = {
  // Cache curto (5 min) - dados volateis
  weather: cached(weatherTool, {
    cache: redisCache,
    ttl: 5 * 60 * 1000,
  }),
  
  // Cache medio (1 hora) - dados semi-estaticos
  github: cached(githubTool, {
    cache: redisCache,
    ttl: 60 * 60 * 1000,
  }),
  
  // Cache longo (1 dia) - dados estaticos
  docs: cached(docsTool, {
    cache: redisCache,
    ttl: 24 * 60 * 60 * 1000,
  }),
};

// Usar
export async function POST(req: Request) {
  const result = streamText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages: await req.json(),
    tools,
  });
  
  return result.toUIMessageStreamResponse();
}
\`\`\`

---

## Best Practices

### 1. TTL Baseado em Volatilidade

\`\`\`typescript
// Dados em tempo real: TTL curto
const stockPrice = cached(stockTool, {
  ttl: 60 * 1000, // 1 minuto
});

// Dados semi-estaticos: TTL medio
const githubRepo = cached(githubTool, {
  ttl: 60 * 60 * 1000, // 1 hora
});

// Dados estaticos: TTL longo
const documentation = cached(docsTool, {
  ttl: 24 * 60 * 60 * 1000, // 1 dia
});
\`\`\`

### 2. Monitoramento

\`\`\`typescript
const cachedTool = cached(tool, {
  onHit: (key) => {
    metrics.increment('cache.hit');
    logger.debug('Cache hit:', key);
  },
  
  onMiss: (key) => {
    metrics.increment('cache.miss');
    logger.debug('Cache miss:', key);
  },
});

// Dashboard: cache hit rate, cost savings, etc
\`\`\`

### 3. Invalidacao Manual

\`\`\`typescript
import { cache } from '@ai-sdk-tools/cache';

// Limpar cache especifico
await cache.delete('tool-name:{"param":"value"}');

// Limpar todo cache de um tool
await cache.clear('tool-name:*');

// Limpar tudo
await cache.flush();
\`\`\`

### 4. Warmup de Cache

\`\`\`typescript
// Pre-popular cache com queries comuns
async function warmupCache() {
  const commonQueries = [
    { query: 'Next.js' },
    { query: 'React' },
    { query: 'TypeScript' },
  ];
  
  for (const params of commonQueries) {
    await cachedTool.execute(params);
  }
}

// Executar no startup ou periodicamente
warmupCache();
\`\`\`

### 5. Redis Clustering

Para alta disponibilidade:

\`\`\`typescript
import Redis from 'ioredis';

const redis = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 },
]);

const cache = new RedisCache(redis);
\`\`\`

---

## Performance e Custos

### Metricas

| Metrica | Sem Cache | Com Cache | Melhoria |
|---------|-----------|-----------|----------|
| Latencia (hit) | 2000ms | <1ms | **2000x** |
| Custo (hit) | $0.01 | $0.00 | **100%** |
| API calls | 1000/dia | 200/dia | **80%** |

### Exemplo Real

\`\`\`typescript
// Tool caro: $0.01 por chamada
// 1000 chamadas/dia = $10/dia
// Cache hit rate: 80%

// Sem cache: $10/dia = $300/mes
// Com cache: $2/dia = $60/mes
// Economia: $240/mes (80%)
\`\`\`

---

## Troubleshooting

### Cache nao funciona

\`\`\`typescript
// ❌ PROBLEMA: Nao incluiu writer
const result = streamText({
  tools: { tool: cached(artifactTool) },
  // Sem experimental_context!
});

// ✅ SOLUCAO
const result = streamText({
  tools: { tool: cached(artifactTool) },
  experimental_context: { writer },
});
\`\`\`

### Keys muito longas

\`\`\`typescript
// ❌ PROBLEMA: Key com objeto grande
const cachedTool = cached(tool, {
  // JSON.stringify(params) cria key gigante
});

// ✅ SOLUCAO: Custom key generator
const cachedTool = cached(tool, {
  keyGenerator: (params) => {
    // Usar apenas campos relevantes
    const { id, type } = params;
    return \`\${type}:\${id}\`;
  },
});
\`\`\`

### Redis connection errors

\`\`\`typescript
// ✅ Fallback para LRU se Redis falhar
let cacheBackend;
try {
  const redis = new Redis(process.env.REDIS_URL);
  await redis.ping();
  cacheBackend = new RedisCache(redis);
} catch (error) {
  console.error('Redis unavailable, using LRU');
  cacheBackend = undefined; // LRU default
}

const cachedTool = cached(tool, {
  cache: cacheBackend,
});
\`\`\`

---

## Recursos Adicionais

- **GitHub**: https://github.com/midday-ai/ai-sdk-tools
- **Docs**: https://ai-sdk-tools.dev/docs/cache
- **Exemplos**: https://ai-sdk-tools.dev/examples

---

## Conclusao

Cache e essencial para:

- 💰 Reducao de custos (80%)
- ⚡ Performance (10x mais rapido)
- 📉 Menos API calls
- 🎯 Melhor UX

Comece com LRU e migre para Redis em producao!
