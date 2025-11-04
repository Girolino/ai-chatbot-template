# Artifacts - Streaming Estruturado Type-Safe

Crie interfaces streaming estruturadas com validacao de tipo usando Zod.

## Indice

- [Visao Geral](#visao-geral)
- [Instalacao](#instalacao)
- [Conceitos Basicos](#conceitos-basicos)
- [Criando Artifacts](#criando-artifacts)
- [React Hooks](#react-hooks)
- [Streaming em Tempo Real](#streaming-em-tempo-real)
- [Casos de Uso](#casos-de-uso)
- [Exemplos Completos](#exemplos-completos)
- [Best Practices](#best-practices)

---

## Visao Geral

Artifacts permitem criar **streaming de dados estruturados** do backend para o frontend com:

- ✅ **Type-safe** com Zod schemas
- 📊 **Progress tracking** (0-1)
- ⚠️ **Error handling** built-in
- 🔄 **Real-time updates** durante streaming
- 🎨 **Customizavel** para qualquer UI

### Quando Usar

Use Artifacts quando precisar streamar:
- Dashboards com metricas
- Charts e graficos
- Relatorios complexos
- Dados estruturados em tempo real
- Interfaces Canvas-style

---

## Instalacao

\`\`\`bash
npm install @ai-sdk-tools/artifacts zod
\`\`\`

---

## Conceitos Basicos

### Artifact

Um artifact e uma unidade de dados estruturados que:
1. Tem um ID unico
2. Segue um schema Zod
3. Pode ser streamado incrementalmente
4. Possui status (loading, streaming, complete, error)
5. Suporta progress tracking

### Lifecycle

\`\`\`
idle → loading → streaming → complete
             ↓
           error
\`\`\`

---

## Criando Artifacts

### 1. Definir Schema

\`\`\`typescript
import { z } from 'zod';
import { artifact } from '@ai-sdk-tools/artifacts';

// Schema do artifact
const dashboardSchema = z.object({
  revenue: z.number(),
  expenses: z.number(),
  profit: z.number(),
  growth: z.number(),
  status: z.enum(['loading', 'processing', 'complete']),
});

// Criar artifact
const dashboardArtifact = artifact('dashboard', dashboardSchema);
\`\`\`

### 2. Usar no Backend

\`\`\`typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { dashboardArtifact } from '@/lib/artifacts';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages,
    tools: {
      generateDashboard: tool({
        description: 'Generate dashboard data',
        parameters: z.object({
          startDate: z.string(),
          endDate: z.string(),
        }),
        execute: async ({ startDate, endDate }, { writer }) => {
          // Primeira atualizacao
          writer.write(dashboardArtifact.create({
            revenue: 0,
            expenses: 0,
            profit: 0,
            growth: 0,
            status: 'loading',
          }));
          
          // Simular processamento
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Atualizacao intermediaria
          writer.write(dashboardArtifact.update({
            revenue: 50000,
            expenses: 30000,
            profit: 20000,
            growth: 0,
            status: 'processing',
          }));
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Dados finais
          writer.write(dashboardArtifact.update({
            revenue: 100000,
            expenses: 60000,
            profit: 40000,
            growth: 25,
            status: 'complete',
          }));
          
          return { success: true };
        },
      }),
    },
    // IMPORTANTE: Incluir writer no context
    experimental_context: { writer },
  });
  
  return result.toUIMessageStreamResponse();
}
\`\`\`

### 3. Consumir no Frontend

\`\`\`typescript
'use client';

import { useArtifact } from '@ai-sdk-tools/artifacts';
import { dashboardArtifact } from '@/lib/artifacts';

function DashboardChart() {
  const { data, status, progress, error } = useArtifact(dashboardArtifact);
  
  if (status === 'error') {
    return <div>Error: {error}</div>;
  }
  
  if (!data) {
    return <div>Aguardando dados...</div>;
  }
  
  return (
    <div className="dashboard">
      <h2>Dashboard Financeiro</h2>
      
      {progress !== undefined && (
        <ProgressBar value={progress * 100} />
      )}
      
      <div className="metrics">
        <Metric label="Receita" value={data.revenue} />
        <Metric label="Despesas" value={data.expenses} />
        <Metric label="Lucro" value={data.profit} />
        <Metric label="Crescimento" value={\`\${data.growth}%\`} />
      </div>
      
      <div className="status">
        Status: {data.status}
      </div>
    </div>
  );
}
\`\`\`

---

## React Hooks

### useArtifact

Hook para consumir um artifact especifico:

\`\`\`typescript
import { useArtifact } from '@ai-sdk-tools/artifacts';

const {
  data,      // Dados tipados do artifact
  status,    // 'idle' | 'loading' | 'streaming' | 'complete' | 'error'
  progress,  // 0-1 (opcional)
  error,     // Mensagem de erro
  isActive,  // true se loading ou streaming
  hasData,   // true se tem dados
} = useArtifact(artifactDefinition, {
  // Callbacks opcionais
  onUpdate: (data) => console.log('Update:', data),
  onComplete: (data) => console.log('Complete:', data),
  onError: (error) => console.error('Error:', error),
  onProgress: (progress) => console.log('Progress:', progress),
});
\`\`\`

### useArtifacts

Hook para listar multiplos artifacts:

\`\`\`typescript
import { useArtifacts } from '@ai-sdk-tools/artifacts';

const {
  artifacts, // Lista em ordem cronologica
  byType,    // Agrupados por tipo
  latest,    // Mais recente de cada tipo
  current,   // Mais recente geral
} = useArtifacts();

// Exemplo: Switch-case rendering
function ArtifactRenderer() {
  const { current } = useArtifacts();
  
  if (!current) return null;
  
  switch (current.type) {
    case 'dashboard':
      return <DashboardChart artifact={current} />;
    case 'chart':
      return <Chart artifact={current} />;
    case 'report':
      return <Report artifact={current} />;
    default:
      return null;
  }
}
\`\`\`

---

## Streaming em Tempo Real

### Progress Tracking

\`\`\`typescript
// Backend
execute: async ({ query }, { writer }) => {
  const steps = 5;
  
  for (let i = 0; i <= steps; i++) {
    writer.write(artifactDefinition.update({
      data: processStep(i),
      progress: i / steps, // 0, 0.2, 0.4, 0.6, 0.8, 1.0
    }));
    
    await processStep(i);
  }
}

// Frontend
function ProgressiveChart() {
  const { data, progress } = useArtifact(chartArtifact);
  
  return (
    <div>
      {progress !== undefined && (
        <div>Progresso: {Math.round(progress * 100)}%</div>
      )}
      <Chart data={data} />
    </div>
  );
}
\`\`\`

### Staged Loading

\`\`\`typescript
const reportSchema = z.object({
  stage: z.enum(['loading', 'fetching', 'analyzing', 'generating', 'complete']),
  data: z.any().optional(),
});

// Backend
writer.write(reportArtifact.create({ stage: 'loading' }));
writer.write(reportArtifact.update({ stage: 'fetching' }));
// ... fetch data
writer.write(reportArtifact.update({ stage: 'analyzing', data: rawData }));
// ... analyze
writer.write(reportArtifact.update({ stage: 'generating', data: analyzed }));
// ... generate
writer.write(reportArtifact.update({ stage: 'complete', data: final }));

// Frontend
function ReportView() {
  const { data } = useArtifact(reportArtifact);
  
  const stages = {
    loading: 'Iniciando...',
    fetching: 'Buscando dados...',
    analyzing: 'Analisando informacoes...',
    generating: 'Gerando relatorio...',
    complete: 'Concluido!',
  };
  
  return <div>{stages[data?.stage] || 'Aguardando...'}</div>;
}
\`\`\`

---

## Casos de Uso

### 1. Dashboard Financeiro

\`\`\`typescript
const burnRateArtifact = artifact('burn-rate', z.object({
  monthlyBurn: z.number(),
  runway: z.number(),
  cashOnHand: z.number(),
  burnRate: z.number(),
  projection: z.array(z.object({
    month: z.string(),
    balance: z.number(),
  })),
}));

function BurnRateChart() {
  const { data, status } = useArtifact(burnRateArtifact);
  
  if (!data) return <Skeleton />;
  
  return (
    <Card>
      <h3>Burn Rate Analysis</h3>
      <div>Monthly Burn: \${data.monthlyBurn.toLocaleString()}</div>
      <div>Runway: {data.runway} meses</div>
      <div>Cash: \${data.cashOnHand.toLocaleString()}</div>
      <LineChart data={data.projection} />
    </Card>
  );
}
\`\`\`

### 2. Chart Interativo

\`\`\`typescript
const chartArtifact = artifact('chart', z.object({
  type: z.enum(['line', 'bar', 'pie']),
  title: z.string(),
  data: z.array(z.object({
    label: z.string(),
    value: z.number(),
  })),
  config: z.object({
    colors: z.array(z.string()),
    showLegend: z.boolean(),
  }),
}));

function DynamicChart() {
  const { data } = useArtifact(chartArtifact);
  
  if (!data) return null;
  
  const ChartComponent = {
    line: LineChart,
    bar: BarChart,
    pie: PieChart,
  }[data.type];
  
  return (
    <div>
      <h3>{data.title}</h3>
      <ChartComponent
        data={data.data}
        colors={data.config.colors}
        showLegend={data.config.showLegend}
      />
    </div>
  );
}
\`\`\`

### 3. Relatorio com Multiplas Secoes

\`\`\`typescript
const reportArtifact = artifact('report', z.object({
  title: z.string(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    status: z.enum(['pending', 'processing', 'complete']),
  })),
  progress: z.number(),
}));

function Report() {
  const { data } = useArtifact(reportArtifact);
  
  return (
    <div className="report">
      <h1>{data?.title}</h1>
      
      {data?.sections.map((section, i) => (
        <section key={i}>
          <h2>{section.title}</h2>
          {section.status === 'complete' ? (
            <p>{section.content}</p>
          ) : (
            <Spinner />
          )}
        </section>
      ))}
    </div>
  );
}
\`\`\`

### 4. Canvas com Multiplos Artifacts

\`\`\`typescript
function Canvas() {
  const { byType, latest } = useArtifacts();
  
  return (
    <div className="canvas">
      {/* Dashboard */}
      {latest['dashboard'] && (
        <DashboardCard artifact={latest['dashboard']} />
      )}
      
      {/* Charts */}
      {byType['chart']?.map((artifact) => (
        <ChartCard key={artifact.id} artifact={artifact} />
      ))}
      
      {/* Reports */}
      {byType['report']?.map((artifact) => (
        <ReportCard key={artifact.id} artifact={artifact} />
      ))}
    </div>
  );
}
\`\`\`

---

## Exemplos Completos

### Exemplo 1: Analise de Dados com Progress

\`\`\`typescript
// lib/artifacts.ts
import { artifact } from '@ai-sdk-tools/artifacts';
import { z } from 'zod';

export const analysisArtifact = artifact('analysis', z.object({
  stage: z.enum(['init', 'loading', 'processing', 'analyzing', 'complete']),
  progress: z.number(),
  data: z.object({
    totalRecords: z.number(),
    processed: z.number(),
    insights: z.array(z.string()),
  }).optional(),
}));

// app/api/analyze/route.ts
import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { analysisArtifact } from '@/lib/artifacts';

export async function POST(req: Request) {
  const { dataset } = await req.json();
  
  const result = streamText({
    model: anthropic('claude-3-5-haiku-latest'),
    messages: [
      { role: 'user', content: \`Analyze this dataset: \${dataset}\` },
    ],
    tools: {
      analyzeData: tool({
        description: 'Analyze dataset',
        parameters: z.object({
          datasetUrl: z.string(),
        }),
        execute: async ({ datasetUrl }, { writer }) => {
          // Stage 1: Init
          writer.write(analysisArtifact.create({
            stage: 'init',
            progress: 0,
          }));
          
          // Stage 2: Loading
          writer.write(analysisArtifact.update({
            stage: 'loading',
            progress: 0.2,
          }));
          
          const data = await fetchData(datasetUrl);
          
          // Stage 3: Processing
          writer.write(analysisArtifact.update({
            stage: 'processing',
            progress: 0.4,
            data: {
              totalRecords: data.length,
              processed: 0,
              insights: [],
            },
          }));
          
          // Process in batches
          const batchSize = 100;
          const insights = [];
          
          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const batchInsights = await processBatch(batch);
            insights.push(...batchInsights);
            
            writer.write(analysisArtifact.update({
              stage: 'analyzing',
              progress: 0.4 + (0.5 * (i / data.length)),
              data: {
                totalRecords: data.length,
                processed: i + batch.length,
                insights,
              },
            }));
          }
          
          // Stage 4: Complete
          writer.write(analysisArtifact.update({
            stage: 'complete',
            progress: 1.0,
            data: {
              totalRecords: data.length,
              processed: data.length,
              insights,
            },
          }));
          
          return { success: true };
        },
      }),
    },
    experimental_context: { writer },
  });
  
  return result.toUIMessageStreamResponse();
}

// components/AnalysisView.tsx
'use client';

import { useArtifact } from '@ai-sdk-tools/artifacts';
import { analysisArtifact } from '@/lib/artifacts';

export function AnalysisView() {
  const { data, status, progress } = useArtifact(analysisArtifact);
  
  const stageLabels = {
    init: 'Inicializando...',
    loading: 'Carregando dataset...',
    processing: 'Processando dados...',
    analyzing: 'Analisando...',
    complete: 'Analise completa!',
  };
  
  return (
    <div className="analysis-view">
      <h2>Analise de Dados</h2>
      
      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: \`\${progress * 100}%\` }}
          />
          <span>{Math.round(progress * 100)}%</span>
        </div>
      )}
      
      {/* Status */}
      <div className="status">
        {data?.stage && stageLabels[data.stage]}
      </div>
      
      {/* Data */}
      {data?.data && (
        <div className="results">
          <div>Total: {data.data.totalRecords}</div>
          <div>Processados: {data.data.processed}</div>
          
          {data.data.insights.length > 0 && (
            <div className="insights">
              <h3>Insights</h3>
              <ul>
                {data.data.insights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
\`\`\`

---

## Best Practices

### 1. Use Schemas Estritos

\`\`\`typescript
// ❌ RUIM: Schema muito permissivo
const badSchema = z.object({
  data: z.any(),
});

// ✅ BOM: Schema especifico
const goodSchema = z.object({
  revenue: z.number().positive(),
  expenses: z.number().positive(),
  profit: z.number(),
  metrics: z.array(z.object({
    name: z.string(),
    value: z.number(),
    unit: z.enum(['currency', 'percentage', 'count']),
  })),
});
\`\`\`

### 2. Sempre Inclua writer no Context

\`\`\`typescript
// ❌ RUIM: Esqueceu o writer
const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages,
  tools: { myTool },
  // Artifacts nao funcionarao!
});

// ✅ BOM: Incluir writer
const result = streamText({
  model: anthropic('claude-3-5-haiku-latest'),
  messages,
  tools: { myTool },
  experimental_context: { writer }, // ⚠️ NECESSARIO
});
\`\`\`

### 3. Forneca Feedback Visual

\`\`\`typescript
function ArtifactView() {
  const { data, status, progress, error } = useArtifact(artifact);
  
  // Loading state
  if (status === 'loading') {
    return <Skeleton />;
  }
  
  // Error state
  if (status === 'error') {
    return <ErrorMessage error={error} />;
  }
  
  // Streaming state
  if (status === 'streaming' && progress !== undefined) {
    return <ProgressIndicator value={progress} />;
  }
  
  // Complete state
  return <DataView data={data} />;
}
\`\`\`

### 4. Handle Errors Gracefully

\`\`\`typescript
const { data, status, error } = useArtifact(artifact, {
  onError: (error) => {
    console.error('Artifact error:', error);
    toast.error('Falha ao carregar dados');
  },
  onComplete: (data) => {
    console.log('Artifact complete:', data);
    analytics.track('artifact_loaded');
  },
});
\`\`\`

### 5. Cache Artifacts se Necessario

\`\`\`typescript
import { cached } from '@ai-sdk-tools/cache';

const cachedTool = cached(
  tool({
    description: 'Generate expensive artifact',
    execute: async ({ params }, { writer }) => {
      // ... expensive operation
    },
  }),
  {
    ttl: 5 * 60 * 1000, // 5 minutos
  }
);
\`\`\`

---

## Recursos Adicionais

- **GitHub**: https://github.com/midday-ai/ai-sdk-tools
- **Docs**: https://ai-sdk-tools.dev/docs/artifacts
- **Exemplos**: https://ai-sdk-tools.dev/examples

---

## Conclusao

Artifacts sao ideais para:

- 📊 Dashboards dinamicos
- 📈 Charts em tempo real
- 📄 Relatorios complexos
- 🎨 Interfaces Canvas-style
- 🔄 Dados estruturados streamados

Comece definindo seu schema e veja os dados fluirem em tempo real!
