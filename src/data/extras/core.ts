import type { Extra } from '../lesson-extras';

export const extrasCore: Record<string, Extra> = {
  'start/how-apps-use-ai': {
    takeaways: [
      'The model is a file of numbers that turns text into more text. The app is everything around it.',
      'Most apps call a model through an API and pay per token, for the text sent in and the text written back.',
      'The prompt holds instructions, the whole conversation so far and sometimes documents, not just your message.',
      'RAG lets an app use your own documents by finding relevant passages and pasting them into the prompt, without retraining.',
      'Fine-tuning changes the model’s weights. It suits style and narrow skills better than facts that change.',
    ],
    prereq: ['start/how-a-chatbot-answers'],
    play: [
      { label: 'Play Cost Crunch', href: '/play/cost-crunch/' },
      { label: 'Open the cost calculator', href: '/tools/cost/' },
    ],
    quiz: [
      { q: 'A support bot seems to remember what you said ten messages ago. What is usually happening?', options: ['The model updates its weights after each message', 'The app sends the earlier conversation again with every new message', 'The model stores each user’s chats inside itself', 'The provider retrains the model every night on chat logs'], answer: 1, why: 'Models keep nothing between requests. The app pastes the conversation back into the prompt each time, which is also why long chats cost more.' },
      { q: 'A company wants its chatbot to answer questions about a price list that changes every week. What fits best?', options: ['Fine-tune the model every week', 'Hope the model learned the prices in training', 'Write the prices from memory into the app’s instructions once', 'Retrieve the current price list and put the relevant part in the prompt'], answer: 3, why: 'Retrieval (RAG) uses the latest documents on every request, so updating the knowledge only means updating the documents.' },
      { q: 'Why does a request with a long pasted document cost more, even if the answer is short?', options: ['Every token sent in is processed and billed, not only the tokens written back', 'Long documents switch the provider to a premium model', 'The API charges per document, not per token', 'Long prompts make the model write longer answers'], answer: 0, why: 'Providers bill input tokens as well as output tokens. A long document adds many input tokens on every request that includes it.' },
      { q: 'What is the best description of fine-tuning?', options: ['Searching your documents before each answer', 'Writing clearer instructions in the prompt', 'Continuing to train an existing model on your own examples, which changes its weights', 'Choosing a bigger model from the same provider'], answer: 2, why: 'Fine-tuning changes the model itself. Retrieval and better prompts change only what the model reads for one request.' },
    ],
  },
  'foundations/how-models-learn': {
    takeaways: [
      'A model is a fixed design with many adjustable numbers. Training only changes the numbers.',
      'The loss is one number that measures how wrong the model is. Training tries to make it smaller.',
      'Gradient descent steps every parameter downhill; backpropagation works out the direction and size for each one.',
      'Too large a learning rate makes the loss explode; too small makes training crawl.',
      'Judge a model on held-out validation data. Falling training loss with rising validation loss means overfitting.',
    ],
    prereq: ['start/what-is-ai-in-plain-english'],
    quiz: [
      { q: 'A line model predicts 1, 2 and 3 for points whose right answers are 3, 5 and 7. What is the sum of squared errors?', options: ['9', '29', '12', '3'], answer: 1, why: 'The errors are -2, -3 and -4. Squared they are 4, 9 and 16, which add up to 29.' },
      { q: 'Training loss keeps falling but validation loss has started rising. What is the most likely explanation?', options: ['The model needs a higher learning rate', 'The validation data is too easy', 'Training has finished successfully', 'The model is starting to memorise the training data instead of generalising'], answer: 3, why: 'That divergence is the classic sign of overfitting: better on examples it has seen, worse on ones it has not.' },
      { q: 'After raising the learning rate, the loss jumps higher and higher every step. Why?', options: ['Each step overshoots the low point and lands further up the other side', 'The model has too few parameters', 'The batch is too small to compute a gradient', 'Backpropagation stops working at high learning rates'], answer: 0, why: 'The gradient gives the right direction, but too large a step jumps past the valley. In the lesson example, 0.1 made the loss go from 29 to about 157 to about 849.' },
      { q: 'What does backpropagation compute?', options: ['The next batch of training examples', 'The best learning rate for each layer', 'How much each parameter contributed to the loss, which gives the gradient for every parameter', 'The final accuracy on the test set'], answer: 2, why: 'Backpropagation works backwards from the loss through the layers using the chain rule. Gradient descent then uses those gradients to update the parameters.' },
    ],
  },
  'foundations/inside-a-transformer': {
    takeaways: [
      'Q, K and V come from three learned matrices applied to each token’s vector, then split into heads.',
      'A block is norm, attention, residual add, norm, feed-forward, residual add, repeated for every layer.',
      'GQA and MQA share keys and values across query heads, shrinking the KV cache by the ratio of query heads to KV heads.',
      'Position enters through added vectors (sinusoidal or learned) or by rotating Q and K (RoPE).',
      'Mixture of experts runs only a few experts per token, but all of them must sit in memory.',
    ],
    prereq: ['foundations/attention-intuition', 'foundations/tokens-and-embeddings'],
    play: [
      { label: 'Play Fit the Model', href: '/play/fit-the-model/' },
      { label: 'Open the memory tool', href: '/tools/memory/' },
    ],
    quiz: [
      { q: 'A model has 32 query heads. A GQA version uses 8 key-value heads. How big is its KV cache compared with standard multi-head attention?', options: ['The same size', 'One eighth', 'One quarter', 'Four times larger'], answer: 2, why: 'The cache stores keys and values per KV head. Going from 32 to 8 KV heads keeps 8/32, which is a quarter.' },
      { q: 'With top-p = 0.85, the most likely tokens have probabilities 0.5, 0.3, 0.1, 0.05 and 0.05. How many tokens can be sampled?', options: ['Two', 'Three', 'Five', 'One'], answer: 1, why: 'Top-p keeps the smallest set whose probabilities reach p. 0.5 + 0.3 = 0.8 falls short, so the 0.1 token is added, giving 0.9 and three tokens.' },
      { q: 'Where do the query, key and value vectors come from?', options: ['Each token’s vector multiplied by three learned weight matrices', 'They are fixed by the tokenizer', 'They are the outputs of the previous token’s feed-forward layer', 'They are random vectors drawn again at each step'], answer: 0, why: 'W_Q, W_K and W_V are trained like any other weight. Multiplying a token’s vector by them gives its query, key and value at that layer.' },
      { q: 'Mixtral 8x7B routes each token to two of eight experts. What does that mean when serving it?', options: ['It needs memory for only two experts at a time', 'It runs as slowly as a dense model of its total size', 'It cannot be split across GPUs', 'Compute per token follows the active parameters, but memory must hold all experts'], answer: 3, why: 'Any token may be routed to any expert, so all weights must be loaded, while each token only pays the compute of the experts it uses.' },
    ],
  },
};
