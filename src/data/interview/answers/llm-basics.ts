import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'parameters-hyperparameters-and-sampling-settings': {
    short:
      "Parameters are the learned numbers inside the model, hyperparameters are choices you make before training, and sampling settings are choices you make on each request. In the quote, temperature 0.2 is a sampling setting and 2e-5 is a training learning rate, so neither one tunes the model’s parameters, which only change when training runs. The test is simple: if changing it means training again it is a hyperparameter, and if it only changes how one answer is picked it is a sampling setting.",
    explain: [
      {
        heading: "Three kinds of numbers, set at three different times",
        body: "A parameter is one of the numbers inside the model that training adjusts, also called a weight. When someone says “a 7B model”, the 7 billion is the count of these numbers. A hyperparameter is a setting the training process does not learn: you pick it before the run starts. Examples are the learning rate (the size of each training step), the batch size, how long to train, and for LoRA fine-tuning the rank of the adapter. A sampling setting is chosen per request and only changes how one answer is generated: temperature, top-p, top-k, maximum tokens, stop sequences and the random seed.",
      },
      {
        heading: "What each one costs you to change",
        body: "Parameters cost memory: the count times the bytes per parameter, so 7 billion at 16 bits is about 14 GB before the KV cache (the stored keys and values for every token so far) is added. Hyperparameters cost a training run, with GPU hours and a validation set to find out whether the change helped. Sampling settings cost almost nothing: you can change them on every call and measure the result on an eval set. That is why they are the first thing to try, and parameters, by fine-tuning or choosing a bigger model, are the last.",
      },
      {
        heading: "What temperature actually does",
        body: "A model does not output a word. For every possible next token it outputs a raw score, and those scores are turned into percentages. Temperature divides the scores first. A low temperature makes the top choice dominate, so answers are more repeatable. A high temperature flattens the odds, so answers vary more and go wrong more often. It never adds knowledge: a wrong fact at temperature 0 is also wrong at 0.7, only less often. And temperature 0 does not promise identical output, because batching, hardware and the serving engine can still change the result.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'greedy-decoding',
      caption: "Try it: a toy model that always takes the most likely word, then one that samples. The probabilities are invented to show the mechanism.",
    },
    example: {
      title: "Example: one made-up word choice, and the memory bill",
      text: "Suppose a model gives four candidate next words these raw scores (example numbers): cat 2.0, dog 1.4, bird 0.6 and table -1.0. Dividing the scores by the temperature before turning them into percentages changes how much the top word dominates. Separately, the number of parameters sets the memory for the weights alone.",
      rows: [
        { label: "Temperature 0.2", value: "cat 95.2%, dog 4.7%" },
        { label: "Temperature 0.5", value: "cat 73.3%, dog 22.1%" },
        { label: "Temperature 1.0", value: "cat 54.2%, dog 29.7%" },
        { label: "Temperature 2.0", value: "cat 40.6%, dog 30.1%" },
        { label: "7 billion parameters at 16 bits", value: "7e9 x 2 bytes = 14 GB" },
        { label: "The same at 8 bits and at 4 bits", value: "7 GB and about 3.5 GB (about 4 GB with scales)" },
      ],
    },
    followUps: [
      {
        q: "You use a hosted model through an API. Which of the three can you change?",
        a: "Sampling settings, on every call. You can only touch training hyperparameters and parameters if the provider offers fine-tuning, and then the hyperparameters are for your own run. The provider’s own training settings are not yours to change.",
      },
      {
        q: "Does temperature zero guarantee the same output every time?",
        a: "No. Batching, hardware and the serving engine can still change the output slightly. Repeatable is also not the same as correct: a wrong answer can be repeated perfectly.",
      },
      {
        q: "A 7B model “fits” in 16 GB at 16 bits but runs out of memory on a long prompt. Why?",
        a: "The weights already take about 14 GB, and the KV cache grows with every token of context. Activations and runtime overhead take their share too, so a long prompt pushes it over.",
      },
    ],
    mistakes: [
      "Calling every adjustable number a “parameter”. Say which of the three kinds you mean.",
      "Turning the temperature down to fix a wrong fact. It only makes the model repeat its most likely answer more often. For missing knowledge you need retrieval or fine-tuning.",
      "Thinking sampling settings are changed by training or fine-tuning. They are set on each request.",
    ],
  },
};
