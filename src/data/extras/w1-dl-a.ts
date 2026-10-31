import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the "dl-a" batch. */
export const extrasW1DlA: Record<string, Extra> = {
  'deep-learning/inside-a-neural-network': {
    takeaways: [
      'A neuron multiplies each input by a weight, adds a bias, and passes the total through an activation function.',
      'A layer is many neurons reading the same inputs. A deep network has many hidden layers in a row.',
      'Without an activation function, any stack of layers collapses into one linear layer. The bend is what lets a network learn curves.',
      'Training starts from random weights and nudges them to lower a loss. The playground does exactly this, with no library.',
    ],
    prereq: ['foundations/how-models-learn'],
    quiz: [
      { q: 'What are the weights and the bias of a neuron?', options: ['The numbers training adjusts', 'The inputs the neuron receives', 'The size of the layer', 'The activation function itself'], answer: 0, why: 'Weights and biases are the neuron\'s parameters: the dials that training turns.' },
      { q: 'A network has 2 inputs, one hidden layer of 4 neurons and 1 output. How many weights and biases does it have?', options: ['8', '15', '17', '24'], answer: 2, why: 'The hidden layer has 2 x 4 = 8 weights and 4 biases; the output has 4 weights and 1 bias. 8 + 4 + 4 + 1 = 17.' },
      { q: 'Layer 1 computes y = 2x + 1 and layer 2 computes z = 3y - 4, with no activation function between. What is z in terms of x?', options: ['z = 5x - 3', 'z = 6x - 1', 'z = 6x + 1', 'A curve'], answer: 1, why: 'z = 3(2x + 1) - 4 = 6x - 1, a single straight line. Stacking linear layers adds nothing without a bend between them.' },
      { q: 'In the playground, the Ring pattern cannot be separated by a straight line. What makes a network able to do it?', options: ['Training for more steps with no hidden layer', 'A hidden layer with an activation function', 'A smaller learning rate on its own', 'Many hidden layers with the activation set to None'], answer: 1, why: 'Hidden neurons with a bending activation each make one cut, and the output combines them into a closed shape.' },
    ],
  },
  'deep-learning/training-deep-networks': {
    takeaways: [
      'Depth compounds: a factor a little below or above 1 per layer becomes vanishing or exploding signals and gradients.',
      'Initialisation (Xavier, He) sets the starting scale; normalisation (batch, layer, RMS) keeps numbers steady during training.',
      'SGD zig-zags in a ravine, momentum smooths it, Adam scales each weight\'s step, and AdamW applies weight decay properly.',
      'Use warm-up then decay for the learning rate, clip gradients, and regularise with weight decay, dropout and early stopping.',
    ],
    prereq: ['deep-learning/inside-a-neural-network', 'foundations/how-models-learn'],
    quiz: [
      { q: 'Each of 20 layers shrinks the signal to 0.9 of its size. Roughly how much is left after the last layer?', options: ['90%', '50%', '12%', '2%'], answer: 2, why: '0.9 to the power 20 is about 0.12, so only around 12 per cent of the signal is left. Small factors compound.' },
      { q: 'How does layer norm differ from batch norm?', options: ['It normalises across the features of one example, so batch size does not matter', 'It normalises each feature across the batch', 'It only works for images', 'It removes the need for a learning rate'], answer: 0, why: 'Layer norm uses one example\'s own features, which is why transformers use it. Batch norm uses statistics across the batch.' },
      { q: 'Why do most long training runs start with a learning-rate warm-up?', options: ['To save memory', 'Because the learning rate must always increase', 'Large steps on random weights with noisy early gradients can wreck the start', 'To make dropout work'], answer: 2, why: 'Early in training the weights are random and the optimiser\'s averages have not settled, so a small rate that rises is safer.' },
      { q: 'Training loss keeps falling but validation loss starts to rise. Which fix fits best?', options: ['Raise the learning rate', 'Remove all regularisation', 'Make the model larger', 'Add weight decay or dropout, or stop early'], answer: 3, why: 'That pattern means overfitting. Weight decay, dropout, early stopping, or more data all make memorising harder.' },
    ],
  },
  'deep-learning/backprop-from-scratch': {
    takeaways: [
      'Backpropagation is the chain rule on a computational graph: each node multiplies the gradient it receives by its own local derivative.',
      'Add passes the gradient on unchanged, multiply gives each input the other input\'s value, and tanh scales by 1 minus tanh squared.',
      'When a value is used more than once its gradients add up, and nodes are processed in reverse topological order.',
      'One forward and one backward pass give every gradient. A numerical gradient check is the standard test of an implementation.',
    ],
    prereq: ['deep-learning/inside-a-neural-network', 'foundations/how-models-learn'],
    quiz: [
      { q: 'For z = x * y, with x = 3 and y = -2, what gradient does x receive when z.grad is 1?', options: ['3', '1', '-2', '-6'], answer: 2, why: 'Multiplication hands each input the other input\'s value times the incoming gradient, so x gets y = -2.' },
      { q: 'A value a is used in two places in the graph. What must the code do with its gradient?', options: ['Add the contributions from both uses', 'Keep only the last one', 'Average the two', 'Use the larger of the two'], answer: 0, why: 'The total effect of a on the output is the sum of the effects along each path, so gradients accumulate with +=.' },
      { q: 'Why does the backward pass visit nodes in reverse topological order?', options: ['To make the code shorter', 'Because values must be recomputed in reverse', 'A node must have received gradient from everything that uses it before it passes gradient on', 'So that multiplication nodes go first'], answer: 2, why: 'Reverse order guarantees each node\'s gradient is complete before it is handed to its inputs.' },
      { q: 'A model has a billion weights. Why is backpropagation used instead of nudging each weight in turn to estimate its gradient?', options: ['Nudging gives wrong answers', 'Backpropagation gets every gradient from one forward and one backward pass, while nudging needs one pass per weight', 'Nudging only works for tanh', 'Backpropagation needs no memory'], answer: 1, why: 'Nudging would need about a billion forward passes for one step; backpropagation needs about three times the cost of one pass.' },
    ],
  },
};
