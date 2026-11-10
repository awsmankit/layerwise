import type { Answer } from './types';

export const answers: Record<string, Answer> = {
  'how-a-neural-network-trains': {
    short:
      "A training step has four parts: a batch of token sequences goes forward through the network, which outputs a probability for every word in the vocabulary at every position, the loss (cross-entropy) turns those probabilities into one number that says how wrong the model was about the true next token, and backpropagation works out how much each weight contributed to that error, and an optimiser such as AdamW nudges every weight a small step in the direction that lowers the loss. Repeat this many thousands of times and the model gets better at predicting text.",
    explain: [
      {
        heading: "Forward pass and loss",
        body: "Take the sentence 'the cat sat on the' and ask for the next token. The model reads the tokens and, at every position, outputs a probability distribution over the whole vocabulary (tens of thousands of tokens, all adding up to 1). The loss is cross-entropy: the negative natural log of the probability the model gave to the token that actually came next, averaged over all positions in the batch. If the model gave the true token 0.5, the loss for that position is 0.69. If it gave 0.02, the loss is 3.91. One number now says how wrong the model is, and lower is better. Loss is not the same as accuracy: it rewards putting probability on the right answer even when that answer is not the top guess.",
      },
      {
        heading: "Backpropagation and the update",
        body: "A network is a long chain of simple operations, so the chain rule from calculus tells us how the loss changes when any one weight changes. Backpropagation applies the chain rule backwards from the loss through every layer, and one backward pass gives the gradient (the slope of the loss) for every weight at once. Plain gradient descent then updates each weight with w <- w - learning_rate x gradient, which moves the weight downhill. In practice most people use Adam or AdamW. These keep a running average of each weight's gradient and of its squared gradient, so the step size adapts per weight and is steadier than one noisy batch would give.",
      },
      {
        heading: "Batches, learning rate and monitoring",
        body: "The gradient is estimated on a mini-batch, a few thousand tokens or more, not on the whole dataset, because that is far cheaper and the estimate is good enough. One pass through all the data is an epoch. Large language models are often pretrained for less than one epoch, because the corpus is so big. The learning rate is the size of each step: too high and the loss jumps or turns into NaN (not a number), too low and training crawls. Standard practice is a warm-up (start tiny and ramp up over the first thousand or so steps) followed by a slow decay. Throughout, watch the training loss to see that it is falling, and a validation loss on data the model never trains on to see that it is generalising and not memorising. Normal use of a trained model never changes the weights: updates happen only in training.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'batch', label: "Batch of tokens", sub: "sequences of text, cut into tokens" },
        { id: 'fwd', label: "Forward pass", sub: "probabilities for the next token at every position" },
        { id: 'loss', label: "Loss", sub: "cross-entropy: -ln(p of the true token), averaged" },
        { id: 'back', label: "Backpropagation", sub: "chain rule gives a gradient for every weight" },
        { id: 'update', label: "Optimiser step", sub: "AdamW moves each weight a little downhill" },
      ],
      highlight: ['loss', 'back'],
      caption: "One training step. The loop repeats for many thousands of steps, and each new batch starts from the weights the last step left behind.",
    },
    example: {
      title: "Example: loss for three positions and one weight update",
      text: "Example numbers. For three positions the model gives the true next token probabilities 0.10, 0.50 and 0.02. The losses are -ln(0.10) = 2.303, -ln(0.50) = 0.693 and -ln(0.02) = 3.912, and the average is (2.303 + 0.693 + 3.912) / 3 = 2.303. Now take one weight with a gradient of 2.0 and a learning rate of 0.1 (example values): the new weight is 0.80 - 0.1 x 2.0 = 0.60. As a cost guide, a forward pass costs about 2 x parameters FLOPs per token, and the backward pass about twice that, so a training step is about 3 times a forward pass, or about 6 x parameters per token.",
      rows: [
        { label: "Loss at probability 0.50", value: "0.693" },
        { label: "Loss at probability 0.10", value: "2.303" },
        { label: "Loss at probability 0.02", value: "3.912" },
        { label: "Weight 0.80, gradient 2.0, rate 0.1", value: "new weight 0.60" },
        { label: "Compute per token: inference against training", value: "about 2 x params against about 6 x params" },
      ],
    },
    followUps: [
      {
        q: "Roughly how much more compute is a training step than a forward pass, and why?",
        a: "About three times as much. The backward pass costs about twice the forward pass, because it computes gradients with respect to both the activations and the weights. That gives the common estimate of about 6 x parameters x tokens FLOPs for training against about 2 x parameters per token for inference.",
      },
      {
        q: "The loss suddenly becomes NaN after 10,000 steps. What do you check?",
        a: "Look first at the learning rate and warm-up, then at exploding gradients (log the gradient norm and add clipping) and at fp16 overflow (use loss scaling or switch to bf16). Also check for bad data such as empty or extreme examples, and for a log of zero or a division by zero in a custom loss. Resume from the last good checkpoint with a lower learning rate.",
      },
    ],
    mistakes: [
      "Describing backpropagation as the model searching or storing examples. It is the chain rule, giving one gradient per weight.",
      "Mixing up the loss with an accuracy metric, or thinking the weights change while you simply use the model. They change only during training.",
      "Being unable to say which way the update moves the weights. It moves them against the gradient, downhill on the loss.",
    ],
  },

  'paper-claims-plus-point-eight-what-to-check': {
    short:
      "Read a paper in passes, and treat the abstract as a list of claims that the tables and ablations must support. Check what is compared with what, which data the settings were tuned on, what the gain costs and whether the code is available. With 5 runs per method and a standard deviation of 0.6, the 0.8-point gap is about 2.1 standard errors: suggestive but weak, because the lower end of the interval is near zero and five runs estimate the spread poorly. I would want more seeds or independent confirmation before building on it.",
    explain: [
      {
        heading: "Read in passes, and read claims as claims",
        body: "Pass one takes a few minutes: title, abstract, introduction, section headings and conclusion, just enough to decide whether the paper deserves more time. Pass two is the figures and tables, read with care, because that is where the evidence is. Do a full re-creation (pass three) only if you will build on or review the work. The abstract is advertising: a list of claims. Your job is to look in the tables, ablations and conclusion for the evidence for each claim, and for the doubts the authors admit to.",
      },
      {
        heading: "Is the comparison fair?",
        body: "Ask what is compared with what. Is the baseline scored the same way, on the same data and metric, with a similar tuning and compute budget? A carefully tuned new method against a baseline left on default settings proves little. Ask which data the settings were chosen on: the test set should be used once at the end, and a separate development set should pick hyperparameters (settings you choose before training). Look for an ablation that removes one part at a time, to show which part gives the gain. Look at the cost too, in parameters, training time and compute: a gain from a model a hundred times larger is a different claim.",
      },
      {
        heading: "Do the arithmetic on the spread",
        body: "Each method has 5 runs with a standard deviation of 0.6. The standard error of one mean is 0.6 / sqrt(5) = 0.27. The standard error of the difference between two means is about sqrt(2) x 0.27 = 0.38. So the 0.8 gap is 0.8 / 0.38 = about 2.1 standard errors, and an approximate 95% interval is 0.8 plus or minus 1.96 x 0.38, which is 0.06 to 1.54. That is suggestive but weak: the lower end is nearly zero, and with only five runs the spread itself is poorly estimated, so the true interval is wider than this simple calculation says.",
      },
      {
        heading: "Can you reproduce it?",
        body: "Look for code, data and a script that reproduces the main table. Check the licence and whether the project is still maintained. Before relying on the result, run a small version yourself. A published paper is not the same as a reproduced result.",
      },
    ],
    diagram: {
      kind: 'timeline',
      steps: [
        { label: "Pass 1: skim", detail: "Title, abstract, introduction, headings and conclusion. Decide whether to continue." },
        { label: "Pass 2: tables and figures", detail: "Check what is compared, on which data, with what tuning and cost. Look for ablations and spread." },
        { label: "Do the arithmetic", detail: "0.6 / sqrt(5) = 0.27 per method, 0.38 for the gap, so 0.8 is about 2.1 standard errors." },
        { label: "Pass 3: re-create", detail: "Only if you will build on it: work out how you would do it, find hidden assumptions, write five-line notes." },
        { label: "Try it small", detail: "Run the released code on a small case and see whether the main table holds." },
      ],
      caption: "Each pass costs more and is used on fewer papers. Most papers should stop after pass one or two.",
    },
    example: {
      title: "Example: is a gap of 0.8 points with 5 runs each convincing?",
      text: "Using the numbers in the question: standard deviation 0.6 for each method, 5 runs each. The standard error of one mean is 0.6 / sqrt(5) = 0.268. For the difference, sqrt(2) x 0.268 = 0.379. The gap divided by that is 0.8 / 0.379 = 2.11 standard errors. An approximate 95% interval is 0.8 plus or minus 1.96 x 0.379, which is 0.06 to 1.54. Verdict: probably a real but small gain, not yet convincing enough to rebuild a project around.",
      rows: [
        { label: "Standard error of one mean", value: "0.6 / sqrt(5) = 0.27" },
        { label: "Standard error of the difference", value: "sqrt(2) x 0.27 = 0.38" },
        { label: "Gap in standard errors", value: "0.8 / 0.38 = about 2.1" },
        { label: "Approximate 95% interval", value: "0.06 to 1.54" },
      ],
    },
    followUps: [
      {
        q: "The table shows a single run per method with no spread. What do you conclude and what do you do?",
        a: "The claim is unsupported until the noise is known. Re-run several seeds if the code is available, compare with a significance test or an interval, and look for corroboration on other benchmarks and from other groups.",
      },
      {
        q: "The baseline numbers in the paper are lower than the ones in the baseline's own paper. What does that suggest?",
        a: "It suggests a weakened or untuned baseline, or a different evaluation protocol. Re-run the baseline with its published settings and expect the real gain to be smaller.",
      },
      {
        q: "When is a result worth reading in pass three?",
        a: "When you will build on it or review it. Work out how you would do it yourself, compare with the paper to find hidden assumptions, and write five-line notes: claim, evidence, doubts, context, what to try.",
      },
    ],
    mistakes: [
      "Trusting the abstract number without opening the results table.",
      "Calling a gap real because it is positive, without looking at the spread across runs.",
      "Not asking what was tuned, and on which data. If the test set picked the settings, the number is optimistic.",
      "Assuming that a published paper has been reproduced. Publication is not replication.",
    ],
  },

  'vanishing-gradients-init-and-normalisation': {
    short:
      "Depth multiplies. A factor slightly off 1 at each layer is repeated at every layer, so signals and gradients shrink toward zero (vanishing) or grow without limit (exploding) as they cross 40 layers. Initialisation sets the starting scale of the weights so signals keep their size, and normalisation keeps the numbers well-behaved as training goes on, while residual connections give gradients a straight path back. My first check is whether the model can overfit a tiny batch of a few examples, because if it cannot, something is broken and tuning will not fix it.",
    explain: [
      {
        heading: "Why depth makes training fragile",
        body: "Each layer scales the signal by roughly some factor, and the gradient on the way back is scaled the same way. If each layer shrinks it by 10%, the factor is 0.9, and after 20 layers 0.9^20 leaves about 12% and after 100 layers 0.9^100 leaves about 0.00003. If each layer grows it by 10%, 1.1^20 is about 6.7 and 1.1^100 is about 13,800. Vanishing gradients leave the early layers barely learning. Exploding gradients make one step throw the weights somewhere useless. A classic cause is the sigmoid activation, whose slope is at most 0.25: ten sigmoid layers can multiply a gradient by about 0.25^10, roughly one millionth.",
      },
      {
        heading: "Initialisation: the starting scale",
        body: "Initialisation sets the weights' random starting scale so a signal keeps its size as it crosses layers. Xavier (also called Glorot) suits tanh-like activations. He initialisation is larger by a factor of sqrt(2), a standard deviation of sqrt(2 / fan_in), where fan_in is the number of inputs to a unit, because ReLU zeroes about half its inputs and would otherwise halve the variance at every layer. Frameworks apply sensible defaults, but a custom layer or a copied block can silently break them.",
      },
      {
        heading: "Normalisation and residual connections",
        body: "Normalisation subtracts a mean and divides by a spread, then applies a learned scale and shift, so numbers stay well-behaved while training runs. For 2, 4, 6, 8 the mean is 5 and the standard deviation is about 2.24, so the result is about -1.34, -0.45, 0.45, 1.34. Batch norm normalises each feature across the batch (it depends on batch size and uses saved averages at inference). Layer norm normalises across one example's features, which suits transformers. RMSNorm only rescales by the root mean square. Why batch norm helps is still debated. Residual connections add a block's input to its output, which gives gradients a straight path to early layers, and is why very deep networks such as ResNet, up to 152 layers, stay trainable.",
      },
      {
        heading: "What I would check first",
        body: "First, try to overfit a tiny batch of a few examples. If the loss will not go near zero there, the code or setup is broken, not mistuned. Next look at the size of activations and gradients per layer to see where they vanish or blow up. Then check the learning rate and look for a data or label bug. Do not just say 'lower the learning rate' without diagnosing anything.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "Layers crossed",
      yLabel: "Signal left, percent of the start (0.9 per layer)",
      points: [[0, 100], [10, 34.9], [20, 12.2], [30, 4.2], [40, 1.5], [60, 0.18], [80, 0.02], [100, 0.003]],
      marks: [{ x: 20, label: "0.9^20 = about 12%" }, { x: 100, label: "0.9^100 = about 0.003%" }],
      caption: "A 10% shrink per layer is mild, yet after 100 layers almost nothing is left. A 10% growth per layer gives the mirror image: 1.1^100 is about 13,800.",
    },
    example: {
      title: "Example: compounding per layer",
      text: "These come straight from multiplying one factor many times. A shrink factor of 0.9 gives 0.9^20 = 0.12 and 0.9^100 = 0.0000266 (about 0.00003). A growth factor of 1.1 gives 1.1^20 = 6.73 and 1.1^100 = 13,781 (about 13,800). Sigmoid has a slope of at most 0.25, so ten layers give 0.25^10 = 0.00000095, about one millionth. The batch 2, 4, 6, 8 has mean 5 and standard deviation sqrt((9 + 1 + 1 + 9) / 4) = 2.236, and each value becomes (value - 5) / 2.236.",
      rows: [
        { label: "0.9 per layer, 20 layers", value: "about 0.12 (12%)" },
        { label: "0.9 per layer, 100 layers", value: "about 0.00003" },
        { label: "1.1 per layer, 20 layers", value: "about 6.7" },
        { label: "1.1 per layer, 100 layers", value: "about 13,800" },
        { label: "Sigmoid slope 0.25, ten layers", value: "about one millionth (0.25^10)" },
        { label: "Normalising 2, 4, 6, 8", value: "-1.34, -0.45, 0.45, 1.34" },
      ],
    },
    followUps: [
      {
        q: "With tanh, a very large initial scale does not explode the signal. So why does it still train badly?",
        a: "Tanh squashes everything to between -1 and 1, but with large weights many units get stuck at the flat ends of the curve. There the slope, and so the gradient, is close to zero.",
      },
      {
        q: "You fine-tune a transformer with a batch size of 2. Batch norm or layer norm?",
        a: "Layer norm. Batch statistics from two examples are very noisy, while layer norm does not depend on batch size, which is why transformers use it (and RMSNorm in many recent language models).",
      },
      {
        q: "What does a residual connection do for the backward pass?",
        a: "The block's input is added to its output, so the block only learns a correction. The shortcut gives the gradient a direct route to earlier layers, so it does not have to pass through every local slope.",
      },
    ],
    mistakes: [
      "Saying 'lower the learning rate' without diagnosing anything. First find out which layers have tiny or huge gradients.",
      "Treating normalisation as only data preprocessing. Layer and batch norm sit inside the network and act on every layer's activations.",
      "Being unable to say why He initialisation differs from Xavier. The sqrt(2) is there because ReLU zeroes about half its inputs.",
      "Proposing more sigmoid layers to fix a vanishing gradient. Sigmoid has a slope of at most 0.25, which makes it worse.",
    ],
  },

  'cnn-parameters-and-receptive-field': {
    short:
      "A fully connected layer with 64 units on a 224 x 224 RGB image needs 150,528 x 64 = 9,633,792 weights, while a 3 x 3 convolution with 64 filters needs only 3 x 3 x 3 x 64 = 1,728 weights (1,792 with biases), about 5,500 times fewer. Three stacked 3 x 3 layers see 7 pixels across, and conv, 2 x 2 pool, conv sees 8. The output of a 3 x 3 convolution on a 12 x 12 input with padding 1 and stride 2 is 6 x 6. A depthwise-separable convolution splits one convolution into a per-channel filter and a 1 x 1 mix, which cuts a 64 to 128 channel layer from 73,728 weights to 8,768.",
    explain: [
      {
        heading: "Weights: dense against convolution",
        body: "A fully connected layer joins every input to every unit. The image flattens to 224 x 224 x 3 = 150,528 numbers, and 64 units need 150,528 x 64 = 9,633,792 weights, plus 64 biases. It also has no idea which numbers are neighbours, so an ear in one corner and the same ear somewhere else count as separate patterns. A convolution is local (each output sees only a small patch) and its weights are shared across every position. One 3 x 3 filter over 3 colour channels has 3 x 3 x 3 = 27 weights, so 64 filters give 1,728 weights plus 64 biases, 1,792 in all. That is about 9,633,792 / 1,728 = 5,500 times fewer, and a pattern means the same thing wherever it appears.",
      },
      {
        heading: "Weights are not compute",
        body: "Having few weights does not mean few operations. At stride 1 with padding 1 the layer slides over all 224 x 224 positions, and each position uses all 1,728 weights, which is 224 x 224 x 1,728 = about 86.7 million multiply-accumulates (one multiply plus one add). The weights are reused at every position. Mixing up the number of weights with the amount of compute is a common slip.",
      },
      {
        heading: "Receptive field and output size",
        body: "The receptive field is the patch of the input that one output cell can see. One 3 x 3 layer sees 3 pixels across, two stacked see 5 and three see 7: each layer adds 2. With conv, 2 x 2 max pool, conv the answer is 8, not 7: the first conv sees 3, the pool makes it 4, and because the pool has a stride of 2, the second conv's steps count double, adding 4 to reach 8. So pooling grows the field faster. Deeper cells see more and recognise larger things. The output size is floor((n + 2 x padding - kernel) / stride) + 1 = floor((12 + 2 - 3) / 2) + 1 = floor(5.5) + 1 = 6.",
      },
      {
        heading: "Depthwise-separable convolution",
        body: "A normal 3 x 3 convolution from 64 to 128 channels has 3 x 3 x 64 x 128 = 73,728 weights. Split it in two. A depthwise step uses one 3 x 3 filter per channel (3 x 3 x 64 = 576 weights) and handles the spatial pattern. A pointwise step, a 1 x 1 convolution, then mixes channels (64 x 128 = 8,192 weights). Together that is 8,768, about 8.4 times fewer. The multiply-accumulates drop by about the same factor. That is why mobile and tiny networks such as MobileNet and keyword-spotting DS-CNNs use it.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Weights", "Why"],
      rows: [
        { label: "Dense, 64 units on 224 x 224 x 3", cells: ["9,633,792", "every input joined to every unit; no sense of neighbours"] },
        { label: "3 x 3 conv, 64 filters", cells: ["1,728 (1,792 with biases)", "local patch, weights shared across all positions"] },
        { label: "3 x 3 conv, 64 to 128 channels", cells: ["73,728", "mixes space and channels at once"] },
        { label: "Depthwise-separable, 64 to 128", cells: ["8,768", "576 per-channel + 8,192 channel mix"] },
      ],
      caption: "Weight counts for the layers in the question. Locality and weight sharing remove most weights, and the depthwise-separable split removes most of what is left.",
    },
    example: {
      title: "Example: the numbers for all three parts",
      text: "Part 1: 224 x 224 x 3 = 150,528 inputs; 150,528 x 64 = 9,633,792 dense weights; the convolution has 3 x 3 x 3 x 64 = 1,728 weights plus 64 biases = 1,792. Part 2: three stacked 3 x 3 layers see 3, 5, then 7; conv, pool, conv sees 8. Part 3: output = floor((12 + 2 - 3) / 2) + 1 = 6. Depthwise-separable: 576 + 8,192 = 8,768 against 73,728.",
      rows: [
        { label: "Dense weights", value: "150,528 x 64 = 9,633,792" },
        { label: "Convolution weights", value: "1,728 (about 5,500 times fewer)" },
        { label: "Convolution multiply-accumulates", value: "224 x 224 x 1,728 = about 86.7 million" },
        { label: "Receptive field: three 3 x 3 convs", value: "3, 5, 7" },
        { label: "Receptive field: conv, 2 x 2 pool, conv", value: "8" },
        { label: "Output size on 12 x 12, pad 1, stride 2", value: "6 x 6" },
        { label: "Depthwise-separable saving", value: "73,728 / 8,768 = about 8.4 times" },
      ],
    },
    followUps: [
      {
        q: "In a MobileNet-style network, where does activation memory peak and why does it matter on a microcontroller?",
        a: "It peaks in an early, high-resolution layer, not in the deep weight-heavy ones. For a 224 x 224 input the first pointwise layer takes a 112 x 112 x 32 tensor in and writes 112 x 112 x 64, 1,204,224 values together, about 1.15 MiB in int8. That working memory (the arena) must fit in SRAM, so reducing the input resolution helps.",
      },
      {
        q: "Why did very deep plain CNNs get worse, not just stop improving, and what fixed it?",
        a: "Training error rose too, so it was not overfitting but an optimisation problem. Residual connections, which add a block's input to its output, let blocks learn a correction and keep the gradient path short.",
      },
      {
        q: "When would you choose a vision transformer over a CNN?",
        a: "A CNN builds in locality and weight sharing, which helps with limited data. The ViT authors found that a vision transformer, with less built in, matched or beat ResNets when trained on 14 to 300 million images, so it is a data-scale trade-off. Small CNNs remain the norm for phones and tiny devices.",
      },
    ],
    mistakes: [
      "Confusing weights with multiply-accumulates. The convolution has few weights but still does about 86.7 million operations on the image.",
      "Being unable to compute an output size from kernel, padding and stride. Practise floor((n + 2p - k) / s) + 1.",
      "Calling a convolution just a smaller dense layer without mentioning weight sharing. Sharing the same weights at every position is the whole point.",
    ],
  },

  'loss-flat-at-chance-overfit-one-batch-first': {
    short:
      "The number 6.9 is chance: for 1,000 equally likely classes, cross-entropy is ln(1000) = 6.908, so the model is outputting near-uniform guesses and has learned nothing at all. It is not learning slowly. I would first try to overfit a single batch of a few examples, because that cheap test separates a broken setup from a badly tuned one. Then I would check the data, the model and loss, and the optimiser settings, changing one thing at a time.",
    explain: [
      {
        heading: "Where 6.9 comes from",
        body: "If a model has no idea, it gives each of the 1,000 classes a probability of 1/1000 = 0.001. The cross-entropy loss is the negative log of the probability given to the true class, so it is -ln(0.001) = ln(1000) = 6.908. A loss that sits at 6.9 for 5,000 steps means the outputs are close to uniform. That is a very different situation from a model that is learning slowly, where the loss would at least creep down.",
      },
      {
        heading: "Debug in order, cheapest test first",
        body: "Start with the most informative, cheapest test: train on one batch of a handful of examples and try to drive the loss near zero. A working network can memorise a few examples easily. If it cannot, something is broken in the code or setup, and no amount of tuning will fix it. Then check the data path: labels still match inputs after shuffling, normalisation and augmentation are sane, you have looked at a few images and labels by eye, and there are no constant or NaN inputs. Then check the model and loss: the loss is applied to logits or probabilities as the framework expects, the model is in training mode, gradients are non-zero and reach the early layers, and the right parameters are in the optimiser.",
      },
      {
        heading: "Optimisation settings, and how to work",
        body: "Next, the optimisation settings: a learning rate far too small (or large and clipped), no warm-up for an optimiser whose averages have not settled, a bad initialisation for the activation used, or dead ReLU units (units that output zero for every input and so get no gradient). Change one thing at a time and log the result, and compare with a known-good reference such as a standard recipe on a small dataset. Once the tiny batch overfits, scale up in steps: more data first, then the full run, tracking training and validation loss and gradient norms as you go.",
      },
    ],
    diagram: {
      kind: 'flow',
      nodes: [
        { id: 'chance', label: "Recognise chance", sub: "ln(1000) = 6.908: nothing learned" },
        { id: 'one', label: "Overfit one batch", sub: "a few examples must reach near zero loss" },
        { id: 'data', label: "Check the data", sub: "labels, shuffling, normalisation, look by eye" },
        { id: 'model', label: "Check model and loss", sub: "logits, training mode, gradients reach layer 1" },
        { id: 'opt', label: "Check optimiser", sub: "learning rate, warm-up, init, dead ReLU" },
        { id: 'scale', label: "Scale up", sub: "more data, then the full run, one change at a time" },
      ],
      highlight: ['one'],
      caption: "The order matters. The tiny-batch test is cheap and tells you whether to look for a bug or to tune.",
    },
    example: {
      title: "Example: the chance-level loss for different class counts",
      text: "A uniform guess gives each class a probability of 1/K, so the chance loss is ln(K). For K = 1,000 that is 6.908. For other class counts the same rule gives the expected starting loss, which is a quick sanity check on the first step of any run. Example plan for this run: step 1, overfit 8 images (the loss should fall below 0.1 within a few hundred steps); step 2, check labels and gradients; step 3, scale up.",
      rows: [
        { label: "2 classes (ln 2)", value: "0.693" },
        { label: "10 classes (ln 10)", value: "2.303" },
        { label: "100 classes (ln 100)", value: "4.605" },
        { label: "1,000 classes (ln 1000)", value: "6.908" },
      ],
    },
    followUps: [
      {
        q: "The model overfits one batch but not the full set. What are the suspects?",
        a: "Learning rate and schedule problems, data-pipeline errors that show only at scale (such as mismatched label shuffling or corrupted shards), too-strong augmentation or regularisation, or a model that is too small. Test with larger and larger subsets to find the point where it breaks.",
      },
      {
        q: "The loss does fall, but training loss is 0.3 and validation loss is rising. Now what?",
        a: "That is overfitting. Add data or augmentation, weight decay or dropout, stop early at the best validation checkpoint, and check that the validation set is not leaking into training.",
      },
      {
        q: "Why check gradient norms by layer?",
        a: "To find vanishing or exploding signals. A layer with near-zero gradients is not learning, and a huge one predicts instability, which points to initialisation, normalisation or learning-rate fixes.",
      },
    ],
    mistakes: [
      "Starting a large hyperparameter sweep before checking for a bug. A sweep over a broken setup finds nothing.",
      "Not knowing where the 6.9 comes from. It is ln(1000), the loss of a model guessing uniformly.",
      "Changing many settings at once, so you cannot tell which change mattered.",
      "Never looking at the data. A few images and labels by eye catches many shuffling and label bugs.",
    ],
  },

  'code-backprop-tiny-graph-gradient-check': {
    short:
      "Each Value object stores its number, a gradient that starts at 0, the values it was built from, and a small backward function that passes gradient to those inputs. The forward pass builds the graph as the operations run, and backward() sets the output's gradient to 1 and visits nodes in reverse topological order, so each node is complete before it passes gradient on. For r = tanh(a x b + a) at a = 0.5, b = -1.5, the gradients are 0.470 for b and -0.470 for a. Gradients are added with +=, not assigned, because a is used twice, and I test the code by comparing with a numerical gradient.",
    explain: [
      {
        heading: "The design and the local rules",
        body: "A Value holds four things: its data, a grad initialised to 0, the set of Values it was made from, and a backward function. Each operation (add, multiply, tanh) returns a new Value that remembers its inputs and has its own backward function with a simple local rule. Add hands the incoming gradient unchanged to both inputs. Multiply gives each input the other input's value times the incoming gradient. Tanh multiplies the incoming gradient by 1 - t^2, where t is the tanh output. These rules are tiny, and chaining them gives the chain rule for free.",
      },
      {
        heading: "Running backward in the right order",
        body: "backward() sets the output's gradient to 1 (the output changes by 1 when it changes by 1), then visits the nodes in reverse topological order, which you build with a depth-first walk that appends a node after all its inputs. Going in reverse order means a node's gradient is complete, with a contribution from every node that uses it, before it passes gradient to its own inputs. Doing it in any other order passes on incomplete values.",
      },
      {
        heading: "Why += and not =",
        body: "If a value is used more than once, it receives a gradient contribution from each use, and the total derivative is their sum. Here a feeds both the multiplication and the addition. Through the product it gets b x 0.940 = -1.410, and through the direct addition it gets 0.940, and the total is -1.410 + 0.940 = -0.470. If the code assigned with =, the second contribution would overwrite the first and give -1.410 or 0.940, both wrong.",
      },
      {
        heading: "Testing without calculus, and why this scales",
        body: "Nudge an input by a small h (around 1e-5), compute (f(x + h) - f(x - h)) / (2h), and compare with the backward result using a relative tolerance. This numerical gradient check is the standard test for any backward implementation, and here it gives about -0.4700 for a and 0.4700 for b. It is too slow to use for training, because it needs one pass per weight. Backpropagation gives every gradient from one forward and one backward pass, and the backward pass for matrix multiplies costs about twice the forward. It needs the stored forward values, which is why training uses much more memory than inference.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Forward value", "Gradient rule (backward)"],
      rows: [
        { label: "p = a x b", cells: ["0.5 x -1.5 = -0.75", "a gets b x grad, b gets a x grad"] },
        { label: "q = p + a", cells: ["-0.75 + 0.5 = -0.25", "both inputs get the gradient unchanged"] },
        { label: "r = tanh(q)", cells: ["-0.245", "q gets (1 - r^2) x grad = 0.940 x 1"] },
        { label: "Result for b", cells: ["gradient of r with respect to b", "0.5 x 0.940 = 0.470"] },
        { label: "Result for a (two paths added)", cells: ["gradient of r with respect to a", "-1.410 + 0.940 = -0.470"] },
      ],
      caption: "The forward pass records the values, and the backward pass walks the same steps in reverse using the local rules. a gets two contributions.",
    },
    example: {
      title: "Example: gradients of r = tanh(a x b + a) at a = 0.5, b = -1.5",
      text: "Forward: p = a x b = -0.75; q = p + a = -0.25; r = tanh(-0.25) = -0.245. The tanh slope is 1 - r^2 = 1 - 0.060 = 0.940. Backward from r with gradient 1: q gets 0.940; add passes 0.940 to p and 0.940 to a; multiply passes b x 0.940 = -1.410 to a and a x 0.940 = 0.470 to b. So b's gradient is 0.470 and a's gradient is -1.410 + 0.940 = -0.470. Check by nudging with h = 0.00001: (f(a + h) - f(a - h)) / 2h gives -0.4700, and the same for b gives 0.4700. A sketch of the class: __init__(data, children), __add__, __mul__, tanh, and backward with a topological sort.",
      rows: [
        { label: "p = a x b", value: "-0.75" },
        { label: "q = p + a", value: "-0.25" },
        { label: "r = tanh(q), slope 1 - r^2", value: "-0.245, slope 0.940" },
        { label: "Gradient of b", value: "0.470" },
        { label: "Gradient of a (two paths)", value: "-1.410 + 0.940 = -0.470" },
        { label: "Numerical check for a and b", value: "-0.4700 and 0.4700" },
      ],
    },
    followUps: [
      {
        q: "Why must nodes be processed in reverse topological order?",
        a: "A node's gradient is complete only after every node that uses it has contributed. Processing it earlier would pass on an incomplete gradient.",
      },
      {
        q: "A model has a billion weights. How do finite differences compare with backpropagation?",
        a: "Finite differences need about a billion forward passes for one step. Backpropagation needs one forward and one backward pass, roughly three times the cost of running the model.",
      },
      {
        q: "Why do very deep stacks of tanh layers make gradients vanish, and what helps?",
        a: "The gradient is a product of local slopes along the path. Tanh's slope is at most 1 and near 0 when saturated, so the product collapses. Residual connections, normalisation and good initialisation keep it from collapsing.",
      },
    ],
    mistakes: [
      "Assigning gradients with = instead of accumulating with +=. Any value used twice then gets the wrong answer.",
      "Processing nodes in the wrong order, or ignoring the graph structure.",
      "Having no gradient check. A numerical comparison takes ten lines and catches almost every sign and rule error.",
      "Describing backpropagation as an approximation. It computes exact gradients, up to floating-point rounding.",
    ],
  },

  'vae-gan-diffusion-trade-offs': {
    short:
      "An autoencoder compresses and rebuilds data but is not a generator, while a VAE adds noise and a KL term so that a random code decodes to a plausible sample in one pass, at the cost of blur. A GAN trains a generator against a discriminator and samples in one pass, but suffers from mode collapse and unstable training. Diffusion trains stably and gives diverse, sharp images, but needs many steps per sample. As of 1 November 2026, I would start with diffusion or a flow model for images, and pick a GAN only if one-step latency is a hard requirement and we can afford the tuning.",
    explain: [
      {
        heading: "Autoencoder and VAE",
        body: "An autoencoder has an encoder that squeezes the input into a small code and a decoder that rebuilds it, trained to reproduce the input. It is good for compression, features, and anomaly scores (the rebuild error on normal data), but it is not a generator: training only ever visited the codes of real examples, so a random code often decodes to rubbish. A VAE (variational autoencoder) makes the encoder output a mean and a spread, draws a code with the reparameterisation trick (mean + spread x noise), and adds a KL term to the loss that pulls codes toward a standard bell curve. Sampling then draws a code from that bell curve and decodes it once. A heavier KL weight gives a tidier code and blurrier output: a code cloud with mean 1 and spread 0.5 costs about 0.82, and a standard cloud costs 0. Too heavy and the decoder ignores the code.",
      },
      {
        heading: "How a GAN works",
        body: "A GAN is a two-player game between a generator, which makes samples from random noise, and a discriminator, which tries to tell fake from real. The generator never sees real data, only the discriminator's verdict. Sampling is one forward pass, which is fast. The failures are mode collapse (the generator covers only some of the data's modes, for example a few kinds of face), instability because there are two moving targets, no single falling loss that tracks sample quality, and no likelihood to measure.",
      },
      {
        heading: "Diffusion, and the evidence",
        body: "Diffusion adds noise to real data step by step, trains a network to predict the noise, and generates by starting from noise and cleaning it over many steps. Training is stable and diversity is good. The cost is many network passes per sample, reduced by better samplers, few-step distillation and working in a latent space. On ImageNet at 128, 256 and 512 pixels, a diffusion model reported FID scores (lower is better) of 2.97, 4.59 and 7.72 against 6.02, 6.95 and 8.43 for a leading GAN, with better coverage, at the cost of slower sampling. GAN ideas live on inside other systems: adversarial losses in latent-diffusion autoencoders, adversarial distillation for one-to-four-step sampling, and fast GAN-trained vocoders for audio.",
      },
      {
        heading: "What I would pick",
        body: "As of 1 November 2026, diffusion and flow models are the usual starting point for images. I would choose a GAN only if one-step latency is a hard requirement and we can afford the tuning. Ask how any model was evaluated, and whether the metric sees diversity as well as sharpness, because a model can score well on sharpness while covering only a few modes.",
      },
    ],
    diagram: {
      kind: 'compare',
      columns: ["Trains by", "Samples by", "Characteristic failure"],
      rows: [
        { label: "Autoencoder", cells: ["rebuild the input from a small code", "not a generator", "random codes decode to rubbish"] },
        { label: "VAE", cells: ["rebuild plus a KL term on the code", "draw a code, decode once", "blurry samples; code ignored if KL is too heavy"] },
        { label: "GAN", cells: ["generator against discriminator", "one forward pass", "mode collapse, unstable, loss does not track quality"] },
        { label: "Diffusion", cells: ["predict the noise added to data", "many cleaning steps from noise", "slow sampling (many passes)"] },
      ],
      caption: "Four ways to learn from data and what each gives up. Each failure is the price of what the method does well.",
    },
    example: {
      title: "Example: the numbers behind the comparison",
      text: "The KL cost of one code: for a mean of 1 and a spread of 0.5, KL = 0.5 x (mean^2 + spread^2 - 1 - ln(spread^2)) = 0.5 x (1 + 0.25 - 1 - ln 0.25) = 0.5 x (0.25 + 1.386) = 0.818. A standard code (mean 0, spread 1) costs 0. The FID figures (lower is better) are those reported in the 2021 paper Diffusion Models Beat GANs on Image Synthesis for ImageNet.",
      rows: [
        { label: "VAE code: mean 1, spread 0.5", value: "KL about 0.82" },
        { label: "VAE code: mean 0, spread 1", value: "KL 0" },
        { label: "FID at 128 pixels, diffusion against GAN", value: "2.97 against 6.02" },
        { label: "FID at 256 pixels, diffusion against GAN", value: "4.59 against 6.95" },
        { label: "FID at 512 pixels, diffusion against GAN", value: "7.72 against 8.43" },
      ],
    },
    followUps: [
      {
        q: "In a GAN run the discriminator reaches near-perfect accuracy and the samples stop improving. Why?",
        a: "The detective is ahead of the forger, so the generator gets little useful feedback. Balance the two with learning rates and update ratio, use the non-saturating generator loss, or try a more stable objective such as Wasserstein. Their authors report these help, but none makes GANs effortless.",
      },
      {
        q: "How would you detect mode collapse?",
        a: "Compare the diversity and coverage of samples against the data's modes and across seeds. Do not rely on the loss curve, and use metrics that measure both quality and coverage.",
      },
      {
        q: "An autoencoder cannot generate. Why does it still work as an anomaly detector?",
        a: "It is trained on normal data only, so normal inputs rebuild well and strange ones rebuild badly. The rebuild error is the score, and you still have to choose a threshold.",
      },
    ],
    mistakes: [
      "Saying a falling GAN loss means good samples. The two networks pull against each other, so the loss does not track quality.",
      "Describing a VAE as an autoencoder with noise and leaving out the KL term, which is what makes sampling work.",
      "Claiming diffusion is best for every use. Its many sampling steps are a real cost when latency is tight.",
    ],
  },

  'lora-trainable-params-and-memory': {
    short:
      "LoRA freezes the weight matrix W and learns a low-rank update BA, so one 4,096 x 4,096 matrix at rank 16 adds 16 x (4,096 + 4,096) = 131,072 parameters. Across four projections and 32 layers that is 16,777,216, about 16.8M trainable parameters, roughly 0.25% of 6.7B. Full fine-tuning with Adam in mixed precision needs about 107 GB before activations, LoRA about 13.7 GB (frozen BF16 base plus a small adapter), and QLoRA about 3.6 GB because the base is stored in 4 bits. These are rough numbers under stated assumptions, and activations come on top.",
    explain: [
      {
        heading: "Counting the LoRA parameters",
        body: "LoRA keeps W frozen and learns W + BA, where B has shape (d_out x r) and A has shape (r x d_in), and r is the rank (here 16). One adapted matrix therefore adds r x (d_in + d_out) = 16 x (4,096 + 4,096) = 131,072 parameters. Per layer there are four projections (q, k, v, o), so 4 x 131,072 = 524,288. Across 32 layers that is 524,288 x 32 = 16,777,216, about 16.8M trainable parameters, which is 16,777,216 / 6.7B = about 0.25% of the model.",
      },
      {
        heading: "Memory: full fine-tuning against LoRA",
        body: "Assume 16 bytes per parameter for full fine-tuning with Adam in mixed precision: 2 for BF16 weights, 2 for BF16 gradients, 4 for FP32 master weights, and 4 + 4 for Adam's two running averages. That gives 6.7B x 16 = about 107 GB before activations, so you need several GPUs or sharding (ZeRO or FSDP). With LoRA, the frozen base in BF16 costs 6.7B x 2 bytes = about 13.4 GB. The adapter at the same 16 bytes per parameter costs 16,777,216 x 16 = about 268 MB. There are no gradients or optimiser state for the base weights, which is where the saving comes from.",
      },
      {
        heading: "QLoRA, activations and merging",
        body: "QLoRA stores the frozen base in 4-bit (the NF4 format) at about 0.5 bytes per parameter, so about 6.7B x 0.5 = 3.4 GB, plus a small overhead for the per-block scales. It dequantises (converts back to higher precision) on the fly for the forward and backward pass, while the adapters train in BF16. So it does not train the model in 4 bits, and the 4-bit base can cost some quality. Activations are extra in every case and grow with batch size and sequence length, and backpropagation still passes through the frozen base, so gradient checkpointing (recomputing activations instead of storing them) is often needed. After training the adapter can be merged into W with no inference overhead, or kept separate and swapped per task or customer. LoRA does not shrink the model or reduce inference memory.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "GB of GPU memory, before activations",
      items: [
        { label: "Full fine-tune (Adam, mixed precision)", value: 107.2, note: "16 bytes x 6.7B" },
        { label: "LoRA (BF16 base + adapter)", value: 13.7, note: "13.4 base + 0.27 adapter", hot: true },
        { label: "QLoRA (4-bit base + adapter)", value: 3.6, note: "3.35 base + 0.27 adapter + scales" },
      ],
      caption: "Example estimates under the assumptions in the text. Real use adds activations, which grow with batch size and sequence length, and framework overhead.",
    },
    example: {
      title: "Example: the arithmetic, step by step",
      text: "Assumptions: 6.7B parameters, 32 layers, hidden size 4,096, rank 16 on q, k, v and o, 16 bytes per parameter for full fine-tuning and for the adapter, 2 bytes for a BF16 frozen weight, 0.5 bytes for a 4-bit weight, and activations ignored. Adapter memory is 16,777,216 x 16 = 268 MB. QLoRA is 3.35 GB + 0.27 GB = about 3.6 GB before scale overhead. Grouped-query attention changes the count: with 8 KV heads of 128, k and v project 4,096 to 1,024, so each of k and v has 16 x (4,096 + 1,024) = 81,920 parameters, and per layer 2 x 131,072 + 2 x 81,920 = 425,984, times 32 = 13,631,488 (about 13.6M).",
      rows: [
        { label: "One adapted 4,096 x 4,096 matrix", value: "16 x 8,192 = 131,072" },
        { label: "Per layer (4 matrices)", value: "524,288" },
        { label: "Whole model (32 layers)", value: "16,777,216 (about 0.25% of 6.7B)" },
        { label: "Full fine-tune memory", value: "6.7B x 16 = about 107 GB" },
        { label: "LoRA memory", value: "13.4 GB + 0.27 GB = about 13.7 GB" },
        { label: "QLoRA memory", value: "3.35 GB + 0.27 GB = about 3.6 GB" },
        { label: "With grouped-query attention (8 KV heads)", value: "13,631,488 (about 13.6M)" },
      ],
    },
    followUps: [
      {
        q: "The model actually uses grouped-query attention with 8 KV heads of dimension 128, so k and v project 4,096 to 1,024. How many trainable parameters is that?",
        a: "q and o stay at 16 x (4,096 + 4,096) = 131,072 each, while k and v are 16 x (4,096 + 1,024) = 81,920 each. Per layer that is 2 x 131,072 + 2 x 81,920 = 425,984, and times 32 layers it is 13,631,488, about 13.6M.",
      },
      {
        q: "Should you also apply LoRA to the MLP layers, and how do you pick the rank?",
        a: "Adapting all linear layers (attention and MLP) often gives better quality for the same rank, at the cost of more parameters. Rank and alpha are hyperparameters chosen by validation, and higher ranks only help when the task needs them. The learning rate usually matters more than the rank.",
      },
      {
        q: "After fine-tuning on support tickets the model got worse at general instructions. What happened and what do you do?",
        a: "That is catastrophic forgetting or narrowing. Mix in general instruction data, lower the learning rate or use fewer epochs, lower the rank or use fewer target modules, and keep a general-capability regression eval next to the task eval. Compare with RAG or prompting on the base model before committing.",
      },
    ],
    mistakes: [
      "Thinking LoRA reduces inference memory or makes the model smaller. The base is still loaded in full, and you can merge the adapter in or keep it separate.",
      "Counting only the weights (2 bytes per parameter) for full fine-tuning and forgetting gradients and optimiser state, which make it about 16 bytes.",
      "Believing QLoRA trains the model in 4 bits, or that the 4-bit base has no effect on quality. The adapters train in BF16 and the base is a lossy copy.",
    ],
  },

  'diffusion-sampling-cost-and-guidance': {
    short:
      "Generation time is roughly steps x passes per step x time per pass. Classifier-free guidance needs a prompted and an unprompted prediction, so 30 steps x 2 passes x 50 ms = 3.0 s, or 1.5 s if the two passes run together in one batch at little extra cost. To get under one second the levers are fewer steps with a better sampler, a distilled student that needs a handful of steps, lower resolution, a smaller or quantised denoiser, and faster hardware, each with a quality cost. Guidance steers the image toward the prompt, and latent diffusion makes every pass far cheaper by working in a compressed space.",
    explain: [
      {
        heading: "The cost model",
        body: "The denoising network runs once per step, and guidance doubles that. Each step needs a noise guess given the prompt and a noise guess given an empty prompt, so there are two passes per step. With 50 ms per pass (an assumed figure) and 30 steps, that is 30 x 2 x 50 ms = 3.0 s. If the two passes run together as one batch of two, the cost is often close to one pass, so about 1.5 s. Without guidance it is also 30 x 50 ms = 1.5 s. The text encoder runs once and the decoder runs once at the end, so they add a small fixed cost.",
      },
      {
        heading: "Levers to get under one second",
        body: "Fewer steps with a better sampler: the DDIM paper reported samples 10 to 50 times faster, and one practical guide found that 15 steps kept the structure of the image but with problems in the details. A distilled student that takes a handful of steps: 8 steps x 50 ms = 0.4 s with batched guidance. A lower resolution: in pixel space doubling the side of the image quadruples the numbers each pass handles. A smaller or quantised denoiser. Faster hardware. Each trades some quality for speed, so test each lever on your own prompts, not the demo prompts.",
      },
      {
        heading: "What guidance does",
        body: "The guided noise guess is: unprompted + w x (prompted - unprompted), where w is the guidance scale. With w = 0 the prompt is ignored, with w = 1 you get the plain prompted guess, and higher values follow the prompt harder, with less variety and, if too high, artefacts such as harsh colours and similar-looking images. A negative prompt takes the place of the empty prompt, so the image is steered away from it. Scales are not comparable across models, so tune w on your own model. For training, add noise to a real image at a random step, show the network the noisy image and the step, ask it to predict the noise, and nudge it to reduce the error. Generation starts from pure noise and repeats: guess the noise, remove part of it. The seed fixes the starting noise, so the same model, prompt, settings and seed reproduce the same image.",
      },
      {
        heading: "Why a latent space",
        body: "Latent diffusion uses an autoencoder to compress a 3 x 512 x 512 image (786,432 numbers) into a 4 x 64 x 64 latent (16,384 numbers), which is 48 times fewer. Noise, denoising and guidance all happen there, so every one of the many passes is cheaper, and the decoder runs once at the end. A single step cannot give a sharp image: one jump has to predict the best single answer, which is the average of everything consistent with the noise, and that average is a blur.",
      },
    ],
    diagram: {
      kind: 'bars',
      unit: "seconds per image (example, 50 ms per pass)",
      items: [
        { label: "30 steps, guidance, passes run one after another", value: 3.0, note: "30 x 2 x 50 ms" },
        { label: "30 steps, guidance batched (or no guidance)", value: 1.5, note: "30 x 50 ms" },
        { label: "15 steps, guidance batched", value: 0.75, note: "15 x 50 ms, some detail lost" },
        { label: "Distilled, 8 steps, guidance batched", value: 0.4, note: "8 x 50 ms", hot: true },
      ],
      caption: "Example timings from the assumed 50 ms pass. The last two meet a one-second target, at some cost in detail or flexibility.",
    },
    example: {
      title: "Example: time and size arithmetic",
      text: "Assumed: 50 ms per denoising pass. 30 steps x 2 passes x 50 ms = 3,000 ms. Batched guidance: 30 x 50 ms = 1,500 ms. Fifteen steps: 15 x 50 ms = 750 ms. A distilled student at 8 steps: 8 x 50 ms = 400 ms. Latent space: 3 x 512 x 512 = 786,432 numbers against 4 x 64 x 64 = 16,384, a ratio of 48. Guidance with example numbers: if the unprompted guess is 0.2, the prompted guess is 0.5 and w = 7, the guided guess is 0.2 + 7 x (0.5 - 0.2) = 2.3.",
      rows: [
        { label: "30 steps with two sequential passes", value: "3.0 s" },
        { label: "30 steps with batched guidance", value: "about 1.5 s" },
        { label: "15 steps", value: "about 0.75 s" },
        { label: "Distilled student, 8 steps", value: "about 0.4 s" },
        { label: "Latent compression", value: "786,432 to 16,384 numbers (48 times fewer)" },
      ],
    },
    followUps: [
      {
        q: "Same prompt and settings, different seed. What changes?",
        a: "The starting noise changes, so you get a different image. The same seed with the same settings reproduces the result.",
      },
      {
        q: "Guidance scale 12 gives harsh, similar-looking images. Why?",
        a: "A large w pushes hard along the prompt direction, which cuts variety and causes artefacts. The scale is model-specific, so tune it on your own model.",
      },
      {
        q: "What would make you hesitate to ship an image generator?",
        a: "Memorisation of training images (researchers have reported extracting over a thousand training images from diffusion models), bias in who is depicted, and unsettled copyright and consent questions that vary by place (this is not legal advice, so ask counsel). Also fakes, which need provenance and labelling.",
      },
    ],
    mistakes: [
      "Ignoring the two passes per step that guidance needs. It doubles the cost unless the passes are batched.",
      "Saying time does not depend on steps or resolution. It scales with both.",
      "Promising sharp results from one step. One step gives the average of all consistent images, which is a blur, unless the model was distilled for it.",
      "Not mentioning the latent space or why it exists. It is what makes each pass 48 times smaller in this example.",
    ],
  },

  'sweep-budget-successive-halving-arithmetic': {
    short:
      "A full grid costs 64 x 20 = 1,280 GPU-hours, which is 3.2 times the 400-hour budget, so it does not fit. Successive halving does: train all 64 configurations briefly, keep the best half, double the budget for the survivors, and repeat. The schedule 64 x 1.25 h, 32 x 2.5 h, 16 x 5 h, 8 x 10 h, 4 x 20 h costs 80 GPU-hours per round, 400 in total. The danger is that early scores do not always predict final ones, so the early ranking must be taken with care.",
    explain: [
      {
        heading: "The arithmetic",
        body: "Baseline cost: 64 full runs x 20 GPU-hours = 1,280 GPU-hours, which is 1,280 / 400 = 3.2 times the budget. Successive halving spreads the same budget differently: it gives every configuration a short run, keeps the better half, gives the survivors twice the budget, and repeats until one or a few reach a full run. Each round: 64 x 1.25 h = 80, 32 x 2.5 h = 80, 16 x 5 h = 80, 8 x 10 h = 80, 4 x 20 h = 80. Five rounds of 80 give a total of 400 GPU-hours, which fits, and is 3.2 times cheaper than the full grid. The halving of the survivors exactly offsets the doubling of the budget, so every round costs the same.",
      },
      {
        heading: "How it can mislead you",
        body: "Early performance does not always predict final performance. A large learning rate or a long warm-up can look bad early and win later. A cosine schedule that is cut short is not the same as an early snapshot of the full one, so rank configurations at the end of each stage using the same schedule shape that the full run will use. Noise matters too: with only a few seeds, a small gap at an early stage is a coin flip. Do not cut configurations whose scores are within noise of each other, or keep more survivors.",
      },
      {
        heading: "Keeping the result honest, and alternatives",
        body: "Select on a validation set, then evaluate the best configuration on a held-out test set once, and report the number of configurations tried (the more you try, the more the best score is flattered by luck). Alternatives: random search over a sensible range often beats a grid, because a few settings matter much more than the rest. Tune the learning rate first, because it matters most, and transfer settings from smaller scale with care. Keep some budget unspent, for rerunning a failed or surprising run and for confirming the winner with extra seeds.",
      },
    ],
    diagram: {
      kind: 'curve',
      xLabel: "GPU-hours given to each configuration in the round",
      yLabel: "Configurations still running",
      points: [[1.25, 64], [2.5, 32], [5, 16], [10, 8], [20, 4]],
      marks: [{ x: 1.25, label: "64 configs x 1.25 h = 80" }, { x: 20, label: "4 configs x 20 h = 80" }],
      caption: "Each round halves the field and doubles the budget per survivor, so every round costs 80 GPU-hours, five rounds, 400 in all.",
    },
    example: {
      title: "Example: the schedule that fits 400 GPU-hours",
      text: "Example figures from the question: 64 configurations, 20 GPU-hours for a full run, a 400 GPU-hour budget. Full grid: 64 x 20 = 1,280, which is 3.2 times too much. Successive halving with 5 rounds fits exactly, and the four survivors of the last round have each had a full 20-hour run, so you have four finished candidates to compare.",
      rows: [
        { label: "Round 1: 64 configs x 1.25 h", value: "80 GPU-hours" },
        { label: "Round 2: 32 configs x 2.5 h", value: "80 GPU-hours" },
        { label: "Round 3: 16 configs x 5 h", value: "80 GPU-hours" },
        { label: "Round 4: 8 configs x 10 h", value: "80 GPU-hours" },
        { label: "Round 5: 4 configs x 20 h", value: "80 GPU-hours" },
        { label: "Total, against the full grid at 1,280", value: "400 GPU-hours (3.2 times cheaper)" },
      ],
    },
    followUps: [
      {
        q: "Your learning-rate sweep shows the best value at the edge of the range. What do you do?",
        a: "Extend the range, because the optimum lies outside it. A best value on the boundary means the sweep has not found the peak.",
      },
      {
        q: "Training is unstable at the highest learning rates. Does that mean you drop them?",
        a: "Check warm-up and gradient clipping before dropping them, since the instability may be fixable. The stable region is what the final run needs, but record the failure.",
      },
      {
        q: "Why keep some of the 400 hours unspent?",
        a: "To rerun a failed or surprising run and to confirm the winner with extra seeds. A plan that spends all of the budget on exploration leaves no room for the finding to be checked.",
      },
    ],
    mistakes: [
      "Running a full grid without checking it against the budget. 1,280 hours does not fit in 400.",
      "Eliminating configurations on a noisy early score without a thought for schedule shape. A short run is not a snapshot of a long one.",
      "Selecting and reporting on the same data. Pick on validation and report once on a held-out test set.",
      "Not saying how many configurations were tried. The best of 64 is flattered by luck.",
    ],
  },

  'training-run-nan-and-loss-spikes': {
    short:
      "Restore the last good checkpoint (with optimiser state), log the gradient norm and loss every step, and inspect the batch at the failing step for missing, infinite or extreme values. Then fix the likely causes: add a warm-up (about 1,000 steps), clip the global gradient norm (1.0 is a common limit), and lower the peak learning rate if it persists. Doubling the batch size and rate with no warm-up is the likely trigger, and a scaling rule from image-classification work is only a starting point. A concrete schedule: 1,000-step linear warm-up to 3e-4, then cosine decay to 10% of the peak by step 100,000.",
    explain: [
      {
        heading: "Read the symptoms",
        body: "The usual checklist says NaN or infinity points to a learning rate that is too high, a bad value in the data, or overflow in low-precision numbers. Occasional spikes point to a rate that is too high for the batch size, no warm-up, or an odd batch. This run has several suspects at once: no warm-up, a peak rate of 3e-4, and a batch size that was doubled last week. Loss spikes from step 12,000 are an early warning, not noise to ignore.",
      },
      {
        heading: "Triage, in order",
        body: "First restore the last good checkpoint, and make sure it includes the optimiser state, not just the weights. Then log the gradient norm and the loss per step, and inspect the batch at the failing step for missing, infinite or extreme values, and skip or fix it. If a restart from just before the failure hits NaN at the same place with the same data order, the cause is deterministic, most likely a particular batch or a numerical overflow on specific data, and not random instability. Check the precision settings too: bf16 has the range of 32-bit numbers, while fp16 overflows more easily and needs loss scaling.",
      },
      {
        heading: "What to change",
        body: "Add a warm-up: raise the rate from zero to the peak over about a thousand steps, because early on the weights are random, gradients are noisy and Adam's running averages have not settled. Clip the global gradient norm (1.0 is a common limit), so one bad batch cannot throw the weights far. Lower the peak rate if it persists. Connect the batch-size change: a reported linear scaling rule (batch times k, learning rate times k, with warm-up) came from image-classification work, so treat it as a starting point and re-tune. Changing batch size and rate together is the likely trigger. Before long runs, confirm the model can overfit a tiny batch, then scale up.",
      },
      {
        heading: "AdamW and the schedule",
        body: "Adam keeps two running averages per weight, so a 7-billion-parameter model carries 14 billion extra numbers, about 56 GB at 4 bytes each. That is why optimiser state must be in checkpoints. AdamW applies weight decay directly to the weights, not through the gradient, which is the decoupling that its paper found improved results. A schedule with example values: warm up linearly to 3e-4 over 1,000 steps, then decay on a cosine curve to 10% of the peak (3e-5) by step 100,000.",
      },
    ],
    diagram: {
      kind: 'experiment',
      slug: 'no-lr-warmup',
      caption: "A toy network trained at the full rate from step 1 and with a short ramp. It shows why the first steps are the most dangerous.",
    },
    example: {
      title: "Example: the learning-rate schedule and the optimiser memory",
      text: "Example schedule: 1,000-step linear warm-up to a 3e-4 peak, then cosine decay to a floor of 3e-5 (10% of the peak) by step 100,000. Warm-up: lr = 3e-4 x step / 1,000, so 1.5e-4 at step 500. After warm-up: lr = floor + (peak - floor) x 0.5 x (1 + cos(pi x progress)), where progress = (step - 1,000) / 99,000. At step 50,500 progress is 0.5, so the cosine term is 0 and lr = (3e-4 + 3e-5) / 2 = 1.65e-4. At step 100,000 it reaches 3e-5. Optimiser state: 2 x 7 billion = 14 billion numbers x 4 bytes = 56 GB.",
      rows: [
        { label: "Step 500 (warm-up)", value: "1.5e-4" },
        { label: "Step 1,000 (peak)", value: "3e-4" },
        { label: "Step 50,500 (cosine midpoint)", value: "1.65e-4" },
        { label: "Step 100,000 (end)", value: "3e-5" },
        { label: "Adam state for a 7B model", value: "14 billion numbers = about 56 GB" },
      ],
    },
    followUps: [
      {
        q: "You restart from the step-30,000 checkpoint with the same data order and it hits NaN at the same place. What does that suggest?",
        a: "A deterministic cause, most likely a particular batch or a numerical overflow on specific data, and not random instability. Inspect that batch, log per-layer activations, skip it, and check the precision settings.",
      },
      {
        q: "A different new architecture has a loss that never moves from its starting value. What do you check?",
        a: "A learning rate that is far too small, dead ReLU units, or a bug such as mismatched labels. First check that it can overfit a handful of examples.",
      },
      {
        q: "Why AdamW rather than Adam with an L2 penalty?",
        a: "For plain SGD, L2 and weight decay are the same, but for Adam they are not: the penalty gets rescaled by the second-moment term. Decoupling the decay from the Adam step improved results in the AdamW paper.",
      },
    ],
    mistakes: [
      "Rerunning with another seed and hoping. If the cause is the rate, the batch or the data, it will come back.",
      "Raising the learning rate to speed up a spiking run. That makes instability worse.",
      "Not logging gradient norms or looking at the batch where it failed. Without them you are guessing.",
      "Blaming the hardware before checking the data and the rate.",
    ],
  },
};
