'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import {
  ANTHROPIC_MODELS,
  DEFAULT_ANTHROPIC_MODEL,
} from '@/lib/ai/models';
import { Action, Actions } from '@/components/ai-elements/actions';
import { Fragment, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/ai-elements/response';
import { CopyIcon, GlobeIcon, ImageIcon, RefreshCcwIcon, TimerIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';

type MenuToggleItemProps = {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
};

const MenuToggleItem = ({ icon: Icon, label, checked, onToggle }: MenuToggleItemProps) => (
  <CommandItem
    value={label.toLowerCase()}
    onSelect={() => onToggle(!checked)}
    onPointerDown={(event) => event.preventDefault()}
  >
    <div className="flex w-full items-center gap-2">
      <Icon className="size-4" />
      <span className="flex-1 text-sm">{label}</span>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onToggle}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  </CommandItem>
);

const MenuAttachmentItem = () => {
  const attachments = usePromptInputAttachments();

  return (
    <CommandItem
      value="add-photos-or-files"
      onSelect={() => attachments.openFileDialog()}
      onPointerDown={(event) => event.preventDefault()}
    >
      <div className="flex items-center gap-2">
        <ImageIcon className="size-4" />
        <span className="text-sm">Add photos or files</span>
      </div>
    </CommandItem>
  );
};

const models = ANTHROPIC_MODELS;

const ChatBotDemo = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(DEFAULT_ANTHROPIC_MODEL);
  const [webSearch, setWebSearch] = useState(false);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const { messages, sendMessage, status, regenerate } = useChat();
  const menuActive = webSearch || extendedThinking;

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      { 
        text: message.text || 'Sent with attachments',
        files: message.files 
      },
      {
        body: {
          model,
          webSearch,
          extendedThinking,
        },
      },
    );
    setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === 'assistant' && message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === 'source-url',
                        ).length
                      }
                    />
                    {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
                      <SourcesContent key={`${message.id}-${i}`}>
                        <Source
                          key={`${message.id}-${i}`}
                          href={part.url}
                          title={part.url}
                        />
                      </SourcesContent>
                    ))}
                  </Sources>
                )}
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role}>
                            <MessageContent>
                              <Response>
                                {part.text}
                              </Response>
                            </MessageContent>
                          </Message>
                          {message.role === 'assistant' && i === messages.length - 1 && (
                            <Actions className="mt-2">
                              <Action
                                onClick={() => regenerate()}
                                label="Retry"
                              >
                                <RefreshCcwIcon className="size-3" />
                              </Action>
                              <Action
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-3" />
                              </Action>
                            </Actions>
                          )}
                        </Fragment>
                      );
                    case 'reasoning':
                      return (
                        <Reasoning
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            ))}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          <PromptInputHeader>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger
                  aria-pressed={menuActive}
                  aria-label="Open tools menu"
                  variant={menuActive ? 'default' : 'ghost'}
                />
                <PromptInputActionMenuContent>
                  <Command className="w-64 gap-1 p-1">
                    <CommandInput placeholder="Search menu" />
                    <CommandList>
                      <CommandGroup heading="Tools">
                        <MenuAttachmentItem />
                        <MenuToggleItem
                          icon={TimerIcon}
                          label="Extended thinking"
                          checked={extendedThinking}
                          onToggle={(value) => setExtendedThinking(value)}
                        />
                      </CommandGroup>
                      <CommandSeparator />
                      <CommandGroup heading="Search">
                        <MenuToggleItem
                          icon={GlobeIcon}
                          label="Web search"
                          checked={webSearch}
                          onToggle={(value) => setWebSearch(value)}
                        />
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton
                aria-pressed={extendedThinking}
                aria-label="Toggle extended thinking"
                title="Extended thinking"
                variant={extendedThinking ? 'default' : 'ghost'}
                onClick={() => setExtendedThinking((prev) => !prev)}
              >
                <TimerIcon size={16} />
                <span>Think</span>
              </PromptInputButton>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue placeholder="Selecione o modelo" />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((modelOption) => (
                    <PromptInputModelSelectItem
                      key={modelOption.id}
                      value={modelOption.id}
                    >
                      {modelOption.label}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;
