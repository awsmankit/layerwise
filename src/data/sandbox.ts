/**
 * Recorded terminal sessions for the sandbox. Each transcript is example output,
 * written to show the shape of what the tool prints. Real output changes with the
 * version, the model and the hardware, so the sandbox says so.
 */
export type Command = {
  /** What the learner types. Matched on the first words, so extra arguments are allowed. */
  cmd: string;
  /** Lines printed back, in order. "$ " lines are echoed as typed. */
  output: string[];
  /** One sentence on what the command does and what to look for. */
  note: string;
};

export const commands: Command[] = [
  {
    cmd: 'ollama --version',
    output: ['ollama version is 0.x.y'],
    note: 'Checks the local Ollama install. Ollama runs as a background service and exposes a local HTTP API.',
  },
  {
    cmd: 'ollama pull llama3.2',
    output: ['pulling manifest', 'pulling 6a0746a1ec1a... 100%', 'verifying sha256 digest', 'writing manifest', 'success'],
    note: 'Downloads the model weights, usually quantized, into a local store. Nothing leaves your machine after the download.',
  },
  {
    cmd: 'ollama run llama3.2 "Say hello in five words"',
    output: ['Hello there, friend, how are you?'],
    note: 'Runs one prompt against the local model. The reply is generated on your hardware, one token at a time.',
  },
  {
    cmd: 'ollama list',
    output: ['NAME               ID            SIZE      MODIFIED', 'llama3.2:latest    a80c4f17acd5  2.0 GB    2 minutes ago'],
    note: 'Lists the models on disk. The size is the download size, which is roughly the memory needed to load it, plus working space.',
  },
  {
    cmd: 'vllm serve your-model --port 8000',
    output: ['INFO: Loading model weights...', 'INFO: Allocated KV cache blocks', 'INFO: Uvicorn running on http://0.0.0.0:8000'],
    note: 'Starts an OpenAI-compatible server on a GPU machine. Watch the KV cache allocation: it sets how many requests can run at once.',
  },
  {
    cmd: 'curl localhost:8000/v1/chat/completions',
    output: ['{"id":"cmpl-1","object":"chat.completion","choices":[{"message":{"role":"assistant","content":"Hello!"}}]}'],
    note: 'Calls the server with the same request shape as the OpenAI chat API, so an application can switch engines by changing the URL.',
  },
  {
    cmd: 'huggingface-cli download your-org/your-model --local-dir ./model',
    output: ['Fetching 12 files: 100%', 'Download complete: ./model'],
    note: 'Downloads a model repository from the Hugging Face Hub. Check the licence on the model card before you use it.',
  },
];

export const helpLines = [
  'Try one of the commands above, or type "help". This sandbox replays recorded output.',
];
