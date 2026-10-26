import type { Extra } from '../lesson-extras';

export const extrasEcosystem: Record<string, Extra> = {
  'llm/parameters-and-hyperparameters': {
    takeaways: [
      'Parameters are learned during training and stored in the model; they set the memory the weights need.',
      'Training hyperparameters, such as learning rate, batch size and LoRA rank, are chosen before a run, and changing one means training again.',
      'Sampling settings, such as temperature, top-p and max tokens, are chosen per request and change only how one answer is generated.',
      'Memory for weights is roughly parameters times bytes per parameter; the KV cache and concurrency add on top.',
    ],
    prereq: ['foundations/how-models-learn', 'serving/quantization'],
    quiz: [
      {
        q: 'A 7-billion-parameter model is stored in 16-bit precision. Roughly how much memory do the weights alone need?',
        options: ['About 3.5 GB', 'About 14 GB', 'About 28 GB', 'About 7 GB'],
        answer: 1,
        why: '7 billion parameters times 2 bytes is about 14 GB. The KV cache and runtime need more on top.',
      },
      {
        q: 'Which of these is a training hyperparameter?',
        options: ['The weight values after training', 'The learning rate chosen before training starts', 'The temperature set on one request', 'I don’t know'],
        answer: 1,
        why: 'The learning rate is chosen before the run and is not learned. The weights are parameters, and temperature is a sampling setting.',
      },
      {
        q: 'A deployed model gives rambling answers. You want a change without retraining. Which setting is the first thing to try?',
        options: ['Raise the learning rate', 'Lower the temperature and cap the output length', 'Add more layers', 'I don’t know'],
        answer: 1,
        why: 'Temperature and max tokens are sampling settings, changed per request with no retraining. Learning rate and layers only matter during training.',
      },
    ],
  },
  'rag-agents/the-tools-and-ecosystem': {
    takeaways: [
      'Name the layer a tool sits in: model hub, local runtime, serving engine, application library, or tools and agents.',
      'A model only proposes a tool call; your code validates it, checks permissions and runs it.',
      'Function calling is the model API feature, MCP is a protocol for tool servers, and an Agent Skill is a folder of instructions and scripts loaded when needed.',
      'Skills and MCP servers can run code, so install only from trusted sources and grant the least access needed.',
    ],
    prereq: ['rag-agents/agents-and-tool-use'],
    quiz: [
      {
        q: 'Which of these is the model API feature for requesting a tool call?',
        options: ['Function calling', 'A serving engine', 'A Hub repository', 'I don’t know'],
        answer: 0,
        why: 'Function calling lets you describe functions, and the model returns a structured call. The serving engine and the Hub are other layers of the stack.',
      },
      {
        q: 'An agent proposes a tool call that deletes a file. What should happen first?',
        options: ['Run it, because the model chose it', 'Validate it, check permissions, and ask for confirmation', 'Ignore the tool result', 'I don’t know'],
        answer: 1,
        why: 'The model’s output is a suggestion. Your code checks the call against its schema and permissions, and asks a person before anything changes data.',
      },
      {
        q: 'Which file format is used by llama.cpp and the tools built on it?',
        options: ['Safetensors', 'GGUF', 'SKILL.md', 'I don’t know'],
        answer: 1,
        why: 'GGUF stores quantized weights with their metadata in one file. Safetensors is a different weight format, and SKILL.md is the instruction file of an Agent Skill.',
      },
    ],
  },
};
