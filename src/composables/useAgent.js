import { ref } from 'vue';
import { z } from 'zod';
import {
  Agent,
  run,
  tool,
  setDefaultOpenAIKey,
  setDefaultOpenAIClient,
} from '@openai/agents';
import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const baseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL;
const apiModel = import.meta.env.VITE_LLM_MODEL;

if (!apiKey) {
  console.warn('VITE_OPENAI_API_KEY is not set; OpenAI agent calls will fail.');
} else {
  setDefaultOpenAIKey(apiKey);
  setDefaultOpenAIClient(
    new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: baseUrl || "https://api.openai.com/v1",
    }),
  );
}

function createScalarSchemaFromProp(propEl) {
  const type = (propEl.getAttribute('type') || 'string').toLowerCase();
  const required = propEl.hasAttribute('required');

  let schema;
  switch (type) {
    case 'number':
      schema = z.number();
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    default:
      schema = z.string();
      break;
  }

  return required ? schema : schema.optional();
}

function createArraySchemaFromElement(arrayEl) {
  const required = arrayEl.hasAttribute('required');
  const children = Array.from(arrayEl.children || []);
  const dictEl = children.find(
    (child) => child.tagName && child.tagName.toLowerCase() === 'dict',
  );

  // Support the documented pattern: <array><dict><prop ... /></dict></array>
  if (dictEl) {
    const dictProps = {};
    Array.from(dictEl.children || []).forEach((child) => {
      if (!child.tagName || child.tagName.toLowerCase() !== 'prop') return;
      const name = child.getAttribute('name');
      if (!name) return;
      dictProps[name] = createScalarSchemaFromProp(child);
    });

    let schema = z.array(z.object(dictProps));
    if (!required) {
      schema = schema.optional();
    }
    return schema;
  }

  // Fallback: array of strings
  let schema = z.array(z.string());
  if (!required) {
    schema = schema.optional();
  }
  return schema;
}

function createParametersSchema(toolEl) {
  const shape = {};

  const children = Array.from(toolEl.children || []);
  children.forEach((child) => {
    if (!child.tagName) return;
    const tag = child.tagName.toLowerCase();

    if (tag === 'prop') {
      const name = child.getAttribute('name');
      if (!name) return;
      shape[name] = createScalarSchemaFromProp(child);
    }

    if (tag === 'array') {
      const name = child.getAttribute('name');
      if (!name) return;
      shape[name] = createArraySchemaFromElement(child);
    }
  });

  return z.object(shape);
}

function executeDomTool(toolElement, input, shouldWaitForReturn, toolName) {
  if (typeof document === 'undefined' || !toolElement) {
    return Promise.reject(
      new Error(`Tool "${toolName}" is not available in the DOM.`),
    );
  }

  if (!shouldWaitForReturn) {
    toolElement.dispatchEvent(
      new CustomEvent('call', { detail: input || {} }),
    );
    return Promise.resolve({ success: true });
  }

  return new Promise((resolve, reject) => {
    let timeoutId;

    const handleReturn = (event) => {
      if (timeoutId) clearTimeout(timeoutId);
      toolElement.removeEventListener('return', handleReturn);
      resolve(event.detail);
    };

    timeoutId = setTimeout(() => {
      toolElement.removeEventListener('return', handleReturn);
      reject(
        new Error(`Tool "${toolName}" did not emit a return event in time.`),
      );
    }, 15000);

    toolElement.addEventListener('return', handleReturn, { once: true });
    toolElement.dispatchEvent(
      new CustomEvent('call', { detail: input || {} }),
    );
  });
}

function buildToolsFromDom() {
  if (typeof document === 'undefined') return [];

  const toolElements = Array.from(
    document.querySelectorAll('tool[name]') || [],
  );

  return toolElements.map((el) => {
    const name = el.getAttribute('name');
    const description = el.getAttribute('description') || '';
    const parameters = createParametersSchema(el);
    const shouldWaitForReturn = el.hasAttribute('return');

    return tool({
      name,
      description,
      parameters,
      execute: async (input) =>
        executeDomTool(el, input, shouldWaitForReturn, name),
    });
  });
}

function collectContextsFromDom() {
  if (typeof document === 'undefined') return '';

  const contextEls = Array.from(
    document.querySelectorAll('context[name]') || [],
  );

  if (!contextEls.length) return '';

  const parts = contextEls.map((el) => {
    const name = el.getAttribute('name') || 'context';
    const text = (el.textContent || '').trim();
    return `Context "${name}":\n${text}`;
  });

  return parts.join('\n\n');
}

function createAgent() {
  const tools = buildToolsFromDom();
  const contextText = collectContextsFromDom();

  let instructions = "You are a Kira, a robot employed by Taunussparkasse. Your output is spoken german language, so don't include any special formatting or markup. Always respond in a very short and friendly manner.";
  if (contextText) {
    instructions +=
      '\n\nUse the following page context when answering:\n\n' + contextText;
  }

  return new Agent({
    name: 'Data agent',
    instructions,
    tools,
    model: apiModel,
  });
}

export function useAgent() {
  const result = ref('');
  const loading = ref(false);
  const error = ref(null);
  const history = ref('');

  const runPrompt = async (prompt) => {
    if (!prompt) return;
    if (!apiKey) {
      error.value = new Error('Missing VITE_OPENAI_API_KEY');
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const agent = createAgent();
      const fullPrompt = history.value
        ? `${history.value}\n\nUser: ${prompt}`
        : prompt;

      const runResult = await run(agent, fullPrompt);
      result.value = runResult.finalOutput;

      const turn = `User: ${prompt}\nAssistant: ${runResult.finalOutput}`;
      history.value = history.value
        ? `${history.value}\n\n${turn}`
        : turn;
    } catch (e) {
      console.error(e);
      error.value = e;
    } finally {
      loading.value = false;
    }
  };

  return {
    result,
    loading,
    error,
    runPrompt,
  };
}
