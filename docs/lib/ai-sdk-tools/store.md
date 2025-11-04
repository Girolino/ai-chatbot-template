# Store - State Management para AI SDK

Gerenciamento de estado de alta performance para aplicacoes de chat AI.

## Indice

- [Visao Geral](#visao-geral)
- [Instalacao](#instalacao)
- [Por que usar Store?](#por-que-usar-store)
- [Migracao do @ai-sdk/react](#migracao-do-ai-sdkreact)
- [API Reference](#api-reference)
- [Padroes Avancados](#padroes-avancados)
- [Performance](#performance)
- [Best Practices](#best-practices)
- [Exemplos Completos](#exemplos-completos)

---

## Visao Geral

O `@ai-sdk-tools/store` e um **drop-in replacement** para `@ai-sdk/react` que oferece:

- ⚡ **3-5x mais rapido** que a implementacao padrao
- 🎯 **Re-renderizacoes seletivas** - apenas componentes que precisam
- 🔍 **Lookup O(1)** de mensagens
- 🌐 **Acesso global** ao estado de qualquer componente
- ✅ **100% compativel** com API do @ai-sdk/react
- 🔒 **Type-safe** com TypeScript

### Como Funciona

Internamente usa **Zustand** para gerenciamento de estado eficiente, eliminando prop drilling e permitindo que componentes se inscrevam apenas nos dados que precisam.

---

## Instalacao

\`\`\`bash
npm install @ai-sdk-tools/store
# ou
pnpm add @ai-sdk-tools/store
# ou
yarn add @ai-sdk-tools/store
\`\`\`

---

## Por que usar Store?

### Problema: Prop Drilling e Performance

Com `@ai-sdk/react` padrao:

\`\`\`typescript
// ❌ PROBLEMA: Prop drilling
function App() {
  const { messages, input, handleSubmit } = useChat();
  
  return (
    <ChatContainer 
      messages={messages} 
      input={input} 
      onSubmit={handleSubmit} 
    />
  );
}

function ChatContainer({ messages, input, onSubmit }) {
  return (
    <div>
      <MessageList messages={messages} />
      <InputForm input={input} onSubmit={onSubmit} />
    </div>
  );
}

function MessageList({ messages }) {
  // Re-renderiza TODA VEZ que qualquer estado muda
  return messages.map(m => <Message key={m.id} {...m} />);
}
\`\`\`

### Solucao: Store com Selecao

\`\`\`typescript
// ✅ SOLUCAO: Acesso direto ao estado
import { useChat } from '@ai-sdk-tools/store';

function App() {
  return <ChatContainer />;
}

function ChatContainer() {
  return (
    <div>
      <MessageList />
      <InputForm />
    </div>
  );
}

function MessageList() {
  // Apenas re-renderiza quando messages mudam
  const messages = useChat((state) => state.messages);
  
  return messages.map(m => <Message key={m.id} {...m} />);
}

function InputForm() {
  // Apenas re-renderiza quando input muda
  const input = useChat((state) => state.input);
  const handleSubmit = useChat((state) => state.handleSubmit);
  
  return <form onSubmit={handleSubmit}>...</form>;
}
\`\`\`

---

## Migracao do @ai-sdk/react

### Passo 1: Trocar Import

\`\`\`typescript
// Antes
import { useChat } from '@ai-sdk/react';

// Depois
import { useChat } from '@ai-sdk-tools/store';
\`\`\`

### Passo 2: Codigo Permanece Igual

\`\`\`typescript
// Funciona exatamente da mesma forma!
export default function Chat() {
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
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {error && <div>Erro: {error.message}</div>}
    </div>
  );
}
\`\`\`

E so isso! Sua aplicacao agora e 3-5x mais rapida.

---

## API Reference

### useChat Hook

\`\`\`typescript
import { useChat } from '@ai-sdk-tools/store';

const chat = useChat(options);
\`\`\`

#### Options

\`\`\`typescript
interface UseChatOptions {
  // API endpoint
  api?: string;
  
  // ID unico do chat (para persistencia)
  id?: string;
  
  // Mensagens iniciais
  initialMessages?: Message[];
  
  // Input inicial
  initialInput?: string;
  
  // Callbacks
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
  onResponse?: (response: Response) => void;
  
  // Headers customizados
  headers?: Record<string, string>;
  
  // Body adicional
  body?: Record<string, any>;
  
  // Credenciais
  credentials?: 'include' | 'omit' | 'same-origin';
  
  // Enviar input automaticamente no mount
  sendExtraMessageFields?: boolean;
}
\`\`\`

#### Return Value

\`\`\`typescript
interface UseChatReturn {
  // Estado
  messages: Message[];
  input: string;
  isLoading: boolean;
  error: Error | undefined;
  
  // Acoes
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  reload: () => void;
  stop: () => void;
  append: (message: Message) => void;
  
  // Setters
  setMessages: (messages: Message[]) => void;
  setInput: (input: string) => void;
}
\`\`\`

### Message Type

\`\`\`typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
  
  // Campos opcionais
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: ToolCall[];
  data?: Record<string, any>;
}
\`\`\`

---

## Padroes Avancados

### 1. Selecao com Selector

Em vez de retornar todo o estado, use um selector:

\`\`\`typescript
// ❌ RUIM: Re-renderiza para qualquer mudanca
function MessageCount() {
  const chat = useChat();
  return <div>Mensagens: {chat.messages.length}</div>;
}

// ✅ BOM: Re-renderiza apenas quando length muda
function MessageCount() {
  const count = useChat((state) => state.messages.length);
  return <div>Mensagens: {count}</div>;
}
\`\`\`

### 2. Hooks Customizados

Crie hooks reutilizaveis para acesso ao estado:

\`\`\`typescript
// hooks/useLastMessage.ts
import { useChat } from '@ai-sdk-tools/store';

export function useLastMessage() {
  return useChat((state) => {
    const messages = state.messages;
    return messages[messages.length - 1];
  });
}

// hooks/useMessageCount.ts
export function useMessageCount() {
  return useChat((state) => state.messages.length);
}

// hooks/useIsTyping.ts
export function useIsTyping() {
  return useChat((state) => state.isLoading);
}

// Uso
function LastMessageDisplay() {
  const lastMessage = useLastMessage();
  return <div>{lastMessage?.content}</div>;
}

function MessageStats() {
  const count = useMessageCount();
  const isTyping = useIsTyping();
  
  return (
    <div>
      Total: {count} mensagens
      {isTyping && ' (digitando...)'}
    </div>
  );
}
\`\`\`

### 3. Comparacao com Shallow

Para evitar re-renders desnecessarios com objetos:

\`\`\`typescript
import { useChat } from '@ai-sdk-tools/store';
import { shallow } from 'zustand/shallow';

function ChatActions() {
  // Compara apenas as propriedades, nao referencia do objeto
  const { handleSubmit, reload, stop } = useChat(
    (state) => ({
      handleSubmit: state.handleSubmit,
      reload: state.reload,
      stop: state.stop,
    }),
    shallow
  );
  
  return (
    <div>
      <button onClick={reload}>Recarregar</button>
      <button onClick={stop}>Parar</button>
    </div>
  );
}
\`\`\`

### 4. Acesso Fora de React

\`\`\`typescript
import { chatStore } from '@ai-sdk-tools/store';

// Acesso direto ao estado
const currentMessages = chatStore.getState().messages;

// Assinar mudancas
const unsubscribe = chatStore.subscribe((state) => {
  console.log('Mensagens:', state.messages.length);
});

// Modificar estado diretamente
chatStore.setState({ input: 'Nova mensagem' });

// Cleanup
unsubscribe();
\`\`\`

### 5. Multiplos Chats

Gerencie multiplas conversas simultaneamente:

\`\`\`typescript
function MultiChatApp() {
  const [activeChat, setActiveChat] = useState('chat-1');
  
  return (
    <div>
      <ChatTabs activeId={activeChat} onChange={setActiveChat} />
      <ChatWindow chatId={activeChat} />
    </div>
  );
}

function ChatWindow({ chatId }: { chatId: string }) {
  const { messages, input, handleSubmit } = useChat({
    id: chatId, // Cada chat tem seu proprio estado
    api: '/api/chat',
  });
  
  return <Chat messages={messages} input={input} onSubmit={handleSubmit} />;
}
\`\`\`

### 6. Persistencia Local

Salve o estado no localStorage:

\`\`\`typescript
import { useChat } from '@ai-sdk-tools/store';
import { useEffect } from 'react';

function PersistentChat() {
  const { messages, setMessages } = useChat({
    id: 'persistent-chat',
  });
  
  // Carregar do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chat-messages');
    if (saved) {
      setMessages(JSON.parse(saved));
    }
  }, [setMessages]);
  
  // Salvar no localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat-messages', JSON.stringify(messages));
    }
  }, [messages]);
  
  return <Chat />;
}
\`\`\`

### 7. Filtros e Busca

\`\`\`typescript
function SearchableChat() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredMessages = useChat((state) => {
    if (!searchQuery) return state.messages;
    
    return state.messages.filter((msg) =>
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  
  return (
    <div>
      <input
        placeholder="Buscar mensagens..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      
      {filteredMessages.map((msg) => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  );
}
\`\`\`

---

## Performance

### Metricas

| Metrica | @ai-sdk/react | @ai-sdk-tools/store | Melhoria |
|---------|---------------|---------------------|----------|
| Renderizacoes | 100% componentes | ~20% componentes | **5x menos** |
| Lookup mensagem | O(n) | O(1) | **Instant** |
| Memory overhead | Medio | Baixo | **-30%** |
| Re-renders desnecessarios | Muitos | Nenhum | **100%** |

### Benchmark: 100 Mensagens

\`\`\`typescript
// Teste: Adicionar 100 mensagens e medir re-renders

// @ai-sdk/react: 450 re-renders totais
// @ai-sdk-tools/store: 105 re-renders totais

// Resultado: 4.3x mais rapido
\`\`\`

### Otimizacoes Internas

1. **Zustand**: Store otimizado com subscricoes granulares
2. **Shallow comparison**: Evita re-renders desnecessarios
3. **Memoizacao**: Selectores sao memoizados automaticamente
4. **Batching**: Updates sao agrupados em um unico render
5. **WeakMap**: Lookup rapido de mensagens por ID

---

## Best Practices

### 1. Use Selectores

\`\`\`typescript
// ❌ RUIM
const chat = useChat();
const lastMessage = chat.messages[chat.messages.length - 1];

// ✅ BOM
const lastMessage = useChat((state) => state.messages.at(-1));
\`\`\`

### 2. Evite Criar Objetos em Selectores

\`\`\`typescript
// ❌ RUIM: Cria novo objeto a cada render
const data = useChat((state) => ({
  count: state.messages.length,
  loading: state.isLoading,
}));

// ✅ BOM: Use shallow comparison
import { shallow } from 'zustand/shallow';

const data = useChat(
  (state) => ({
    count: state.messages.length,
    loading: state.isLoading,
  }),
  shallow
);
\`\`\`

### 3. Extraia Acoes

\`\`\`typescript
// ✅ BOM: Acoes nao causam re-render
function SubmitButton() {
  const handleSubmit = useChat((state) => state.handleSubmit);
  const isLoading = useChat((state) => state.isLoading);
  
  return (
    <button onClick={handleSubmit} disabled={isLoading}>
      Enviar
    </button>
  );
}
\`\`\`

### 4. Hooks Customizados

\`\`\`typescript
// ✅ BOM: Reutilizavel e testavel
function useUserMessages() {
  return useChat((state) =>
    state.messages.filter((m) => m.role === 'user')
  );
}

function useAssistantMessages() {
  return useChat((state) =>
    state.messages.filter((m) => m.role === 'assistant')
  );
}
\`\`\`

### 5. Memoize Computacoes Caras

\`\`\`typescript
import { useMemo } from 'react';

function MessageAnalytics() {
  const messages = useChat((state) => state.messages);
  
  const analytics = useMemo(() => {
    // Computacao cara
    return {
      totalWords: messages.reduce((sum, m) => sum + m.content.split(' ').length, 0),
      avgLength: messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length,
      userCount: messages.filter((m) => m.role === 'user').length,
    };
  }, [messages]);
  
  return <div>...</div>;
}
\`\`\`

---

## Exemplos Completos

### Exemplo 1: Chat Basico Otimizado

\`\`\`typescript
// app/page.tsx
'use client';

import { useChat } from '@ai-sdk-tools/store';

// Componente de mensagem isolado
function Message({ id }: { id: string }) {
  // Apenas este componente re-renderiza quando esta mensagem muda
  const message = useChat((state) =>
    state.messages.find((m) => m.id === id)
  );
  
  if (!message) return null;
  
  return (
    <div className={\`message message-\${message.role}\`}>
      <strong>{message.role}:</strong>
      <p>{message.content}</p>
    </div>
  );
}

// Lista de mensagens
function MessageList() {
  // Apenas re-renderiza quando IDs mudam (nova mensagem)
  const messageIds = useChat((state) => state.messages.map((m) => m.id));
  
  return (
    <div className="message-list">
      {messageIds.map((id) => (
        <Message key={id} id={id} />
      ))}
    </div>
  );
}

// Input isolado
function ChatInput() {
  const input = useChat((state) => state.input);
  const isLoading = useChat((state) => state.isLoading);
  const handleInputChange = useChat((state) => state.handleInputChange);
  const handleSubmit = useChat((state) => state.handleSubmit);
  
  return (
    <form onSubmit={handleSubmit} className="chat-input">
      <input
        value={input}
        onChange={handleInputChange}
        placeholder="Digite sua mensagem..."
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading || !input}>
        {isLoading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
}

// Status isolado
function ChatStatus() {
  const isLoading = useChat((state) => state.isLoading);
  const error = useChat((state) => state.error);
  const count = useChat((state) => state.messages.length);
  
  return (
    <div className="chat-status">
      <span>{count} mensagens</span>
      {isLoading && <span className="loading">Carregando...</span>}
      {error && <span className="error">Erro: {error.message}</span>}
    </div>
  );
}

// App principal (nunca re-renderiza!)
export default function Chat() {
  return (
    <div className="chat-container">
      <ChatStatus />
      <MessageList />
      <ChatInput />
    </div>
  );
}
\`\`\`

### Exemplo 2: Chat com Features Avancadas

\`\`\`typescript
'use client';

import { useChat } from '@ai-sdk-tools/store';
import { useEffect, useState } from 'react';

// Hook customizado para estatisticas
function useChatStats() {
  return useChat((state) => {
    const messages = state.messages;
    return {
      total: messages.length,
      user: messages.filter((m) => m.role === 'user').length,
      assistant: messages.filter((m) => m.role === 'assistant').length,
      lastMessageTime: messages.at(-1)?.createdAt,
    };
  });
}

// Componente de estatisticas
function ChatStats() {
  const stats = useChatStats();
  
  return (
    <div className="stats">
      <div>Total: {stats.total}</div>
      <div>Usuario: {stats.user}</div>
      <div>Assistente: {stats.assistant}</div>
      {stats.lastMessageTime && (
        <div>Ultima: {new Date(stats.lastMessageTime).toLocaleTimeString()}</div>
      )}
    </div>
  );
}

// Busca em tempo real
function MessageSearch() {
  const [query, setQuery] = useState('');
  
  const results = useChat((state) => {
    if (!query) return [];
    return state.messages.filter((m) =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );
  });
  
  return (
    <div className="search">
      <input
        placeholder="Buscar mensagens..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <div className="results">
          {results.length} resultado(s) encontrado(s)
        </div>
      )}
    </div>
  );
}

// Acoes do chat
function ChatActions() {
  const reload = useChat((state) => state.reload);
  const stop = useChat((state) => state.stop);
  const setMessages = useChat((state) => state.setMessages);
  const isLoading = useChat((state) => state.isLoading);
  
  const handleClear = () => {
    if (confirm('Limpar todas as mensagens?')) {
      setMessages([]);
    }
  };
  
  const handleExport = () => {
    const messages = useChat.getState().messages;
    const json = JSON.stringify(messages, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-export.json';
    a.click();
  };
  
  return (
    <div className="actions">
      <button onClick={reload} disabled={isLoading}>
        Recarregar
      </button>
      <button onClick={stop} disabled={!isLoading}>
        Parar
      </button>
      <button onClick={handleClear}>
        Limpar
      </button>
      <button onClick={handleExport}>
        Exportar
      </button>
    </div>
  );
}

// App completo
export default function AdvancedChat() {
  // Configuracao do chat
  const {} = useChat({
    api: '/api/chat',
    id: 'advanced-chat',
    onFinish: (message) => {
      console.log('Mensagem concluida:', message);
    },
    onError: (error) => {
      console.error('Erro no chat:', error);
    },
  });
  
  // Persistencia
  useEffect(() => {
    const messages = useChat.getState().messages;
    localStorage.setItem('chat-backup', JSON.stringify(messages));
  }, []);
  
  return (
    <div className="advanced-chat">
      <header>
        <h1>Chat Avancado</h1>
        <ChatStats />
      </header>
      
      <aside>
        <MessageSearch />
        <ChatActions />
      </aside>
      
      <main>
        <MessageList />
        <ChatInput />
      </main>
    </div>
  );
}
\`\`\`

### Exemplo 3: Multi-Chat com Tabs

\`\`\`typescript
'use client';

import { useChat } from '@ai-sdk-tools/store';
import { useState } from 'react';

// Hook para gerenciar multiplos chats
function useMultiChat() {
  const [chats, setChats] = useState([
    { id: 'chat-1', title: 'Chat 1' },
  ]);
  const [activeId, setActiveId] = useState('chat-1');
  
  const addChat = () => {
    const newChat = {
      id: \`chat-\${Date.now()}\`,
      title: \`Chat \${chats.length + 1}\`,
    };
    setChats([...chats, newChat]);
    setActiveId(newChat.id);
  };
  
  const removeChat = (id: string) => {
    setChats(chats.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(chats[0]?.id);
    }
  };
  
  return { chats, activeId, setActiveId, addChat, removeChat };
}

// Tab individual
function ChatTab({ id, title, isActive, onClick, onClose }) {
  return (
    <div
      className={\`tab \${isActive ? 'active' : ''}\`}
      onClick={onClick}
    >
      <span>{title}</span>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }}>
        x
      </button>
    </div>
  );
}

// Janela de chat individual
function ChatWindow({ chatId }: { chatId: string }) {
  const { messages, input, handleSubmit, handleInputChange } = useChat({
    id: chatId,
    api: '/api/chat',
  });
  
  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((m) => (
          <div key={m.id} className={\`message-\${m.role}\`}>
            {m.content}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

// App multi-chat
export default function MultiChat() {
  const { chats, activeId, setActiveId, addChat, removeChat } = useMultiChat();
  
  return (
    <div className="multi-chat">
      <div className="tabs">
        {chats.map((chat) => (
          <ChatTab
            key={chat.id}
            id={chat.id}
            title={chat.title}
            isActive={chat.id === activeId}
            onClick={() => setActiveId(chat.id)}
            onClose={() => removeChat(chat.id)}
          />
        ))}
        <button onClick={addChat}>+ Novo Chat</button>
      </div>
      
      {activeId && <ChatWindow chatId={activeId} />}
    </div>
  );
}
\`\`\`

---

## Troubleshooting

### Problema: Estado nao atualiza

\`\`\`typescript
// ❌ PROBLEMA
const messages = useChat((state) => state.messages);
messages.push(newMessage); // Mutacao direta!

// ✅ SOLUCAO
const setMessages = useChat((state) => state.setMessages);
const messages = useChat((state) => state.messages);
setMessages([...messages, newMessage]);
\`\`\`

### Problema: Re-renders excessivos

\`\`\`typescript
// ❌ PROBLEMA: Re-renderiza para qualquer mudanca
function Component() {
  const chat = useChat();
  return <div>{chat.messages.length}</div>;
}

// ✅ SOLUCAO: Use selector
function Component() {
  const count = useChat((state) => state.messages.length);
  return <div>{count}</div>;
}
\`\`\`

### Problema: "Cannot find store"

\`\`\`typescript
// ❌ PROBLEMA: Tentando acessar antes de inicializar
const messages = chatStore.getState().messages;

// ✅ SOLUCAO: Use dentro de componente React
function Component() {
  const messages = useChat((state) => state.messages);
  return <div>...</div>;
}
\`\`\`

---

## Recursos Adicionais

- **GitHub**: https://github.com/midday-ai/ai-sdk-tools
- **Docs Oficiais**: https://ai-sdk-tools.dev/docs/store
- **Zustand Docs**: https://github.com/pmndrs/zustand

---

## Conclusao

O `@ai-sdk-tools/store` e a escolha ideal para aplicacoes de chat que precisam de:

- ⚡ Alta performance
- 🎯 Re-renders otimizados
- 🌐 Acesso global ao estado
- 🔒 Type safety
- 📦 Facil migracao

Comece trocando uma linha de codigo e veja a diferenca imediatamente!
