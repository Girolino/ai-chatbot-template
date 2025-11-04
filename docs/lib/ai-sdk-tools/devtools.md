# Devtools - Ferramentas de Desenvolvimento e Debug

Interface de debugging em tempo real para aplicacoes AI SDK.

## Indice

- [Visao Geral](#visao-geral)
- [Instalacao](#instalacao)
- [Setup Basico](#setup-basico)
- [Features](#features)
- [Integracao](#integracao)
- [Monitoramento](#monitoramento)
- [Best Practices](#best-practices)

---

## Visao Geral

O \`@ai-sdk-tools/devtools\` fornece uma interface visual para:

- 🔍 **Inspecionar tool calls** em tempo real
- 📊 **Metricas de performance** (latencia, tokens, custos)
- 📝 **Logs estruturados** de eventos
- 🔄 **Visualizar handoffs** entre agentes
- ⚡ **Monitorar streaming** de artifacts
- 🐛 **Debug** de problemas em desenvolvimento

---

## Instalacao

\`\`\`bash
npm install @ai-sdk-tools/devtools
\`\`\`

---

## Setup Basico

### 1. Adicionar ao Layout

\`\`\`typescript
// app/layout.tsx
import { AIDevtools } from '@ai-sdk-tools/devtools';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        
        {/* Apenas em development */}
        {process.env.NODE_ENV === 'development' && (
          <AIDevtools />
        )}
      </body>
    </html>
  );
}
\`\`\`

### 2. Configurar Provider

\`\`\`typescript
// app/providers.tsx
'use client';

import { DevtoolsProvider } from '@ai-sdk-tools/devtools';

export function Providers({ children }) {
  return (
    <DevtoolsProvider enabled={process.env.NODE_ENV === 'development'}>
      {children}
    </DevtoolsProvider>
  );
}
\`\`\`

---

## Features

### Tool Call Inspector

Visualiza todos os tool calls:

\`\`\`
[14:23:45] Tool: searchWeb
  Input: { query: "Next.js 15" }
  Duration: 2.3s
  Output: { results: [...] }
  Status: Success ✅
\`\`\`

### Token Usage Tracking

Monitora consumo de tokens:

\`\`\`
Total Tokens: 1,234
├─ Prompt: 567 (46%)
└─ Completion: 667 (54%)

Cost: $0.0234
\`\`\`

### Agent Handoff Visualization

Visualiza fluxo entre agentes:

\`\`\`
User → Coordinator → MathAgent → Response
        ↓
        CodeAgent (unused)
\`\`\`

### Artifact Streaming

Monitora artifacts em tempo real:

\`\`\`
[Dashboard Artifact]
  Status: streaming
  Progress: 65%
  Updates: 12
\`\`\`

---

## Integracao

### Com useChat

\`\`\`typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { useDevtools } from '@ai-sdk-tools/devtools';

export function Chat() {
  const chat = useChat({ api: '/api/chat' });
  
  // Conectar com devtools
  useDevtools(chat);
  
  return <ChatUI {...chat} />;
}
\`\`\`

### Com Agents

\`\`\`typescript
import { Agent } from '@ai-sdk-tools/agents';

const agent = new Agent({
  name: 'Assistant',
  model: anthropic('claude-3-5-haiku-latest'),
  
  // Events vao para devtools automaticamente
  onEvent: (event) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Devtools]', event);
    }
  },
});
\`\`\`

---

## Monitoramento

### Custom Logging

\`\`\`typescript
import { logger } from '@ai-sdk-tools/devtools';

// Log custom
logger.info('Custom event', { data: {...} });
logger.warn('Warning', { issue: '...' });
logger.error('Error occurred', { error });

// Visualizado no devtools
\`\`\`

### Performance Marks

\`\`\`typescript
import { performance } from '@ai-sdk-tools/devtools';

// Marcar inicio
performance.mark('tool-start');

// ... operacao

// Marcar fim e calcular duracao
performance.mark('tool-end');
performance.measure('tool-execution', 'tool-start', 'tool-end');

// Visualizado no devtools
\`\`\`

---

## Best Practices

### 1. Apenas em Development

\`\`\`typescript
// ✅ BOM
{process.env.NODE_ENV === 'development' && <AIDevtools />}

// ❌ RUIM
<AIDevtools /> // Em producao tambem!
\`\`\`

### 2. Sensitive Data

\`\`\`typescript
// ✅ BOM: Filtrar dados sensiveis
const sanitized = {
  ...data,
  apiKey: '***',
  password: '***',
};

logger.info('API call', sanitized);
\`\`\`

### 3. Performance Impact

\`\`\`typescript
// Devtools adiciona ~5ms overhead
// Aceitavel em dev, desabilite em prod
\`\`\`

---

## Recursos Adicionais

- **GitHub**: https://github.com/midday-ai/ai-sdk-tools
- **Docs**: https://ai-sdk-tools.dev/docs/devtools

---

## Conclusao

Devtools e essencial para:

- 🐛 Debug rapido
- 📊 Performance monitoring
- 🔍 Inspecao de tool calls
- 📝 Logging estruturado

Use em desenvolvimento para identificar problemas rapidamente!
