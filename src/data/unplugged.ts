/**
 * Unplugged activity cards for classrooms: no computer, no accounts, nothing stored about
 * students. Every activity is written for this site; the "related" links name the public
 * resources that inspired or sit beside it. A test checks the lesson keys and ids.
 */
export type Band = '10-12' | '13-15' | '16-18';
export const bands: { id: Band; label: string; short: string }[] = [
  { id: '10-12', label: 'Ages 10 to 12', short: '10-12' },
  { id: '13-15', label: 'Ages 13 to 15', short: '13-15' },
  { id: '16-18', label: 'Ages 16 to 18', short: '16-18' },
];

export type Cards = { title: string; note?: string; items: string[] };
export type Unplugged = {
  id: string;
  title: string;
  /** one line for the index */
  hook: string;
  bands: Band[];
  minutes: number;
  group: string;
  /** AI4K12 big idea, 1 to 5 */
  bigIdea: 1 | 2 | 3 | 4 | 5;
  materials: string[];
  steps: string[];
  notice: string[];
  discuss: string[];
  /** teacher notes, including worked answers */
  answers?: string[];
  /** lesson keys this activity supports */
  lessons: string[];
  /** cut-out cards to print */
  cards?: Cards[];
  related: { label: string; url: string }[];
};

export const unplugged: Unplugged[] = [
  {
    id: 'ai-or-not',
    title: 'AI or not? The card sort',
    hook: 'Sort everyday machines into “follows rules a person wrote” and “learned from examples”, and argue about the edge cases.',
    bands: ['10-12', '13-15'],
    minutes: 20,
    group: 'Pairs',
    bigIdea: 1,
    materials: ['One set of cut-out cards per pair', 'Two sheets of paper labelled “Rules written by a person” and “Learned from examples”, plus a third labelled “Not sure”'],
    steps: [
      'Hand out the cards. Before anyone sorts, ask the class for a one-sentence test for “is this AI?” and write two or three on the board.',
      'Pairs place each card on one of the three sheets. They must agree a reason for every card, and write the reason in a few words on the card.',
      'Pairs join into fours and compare. For every card the groups disagree about, they must say which fact about the machine would settle it.',
      'Read out the teacher notes for the cards that caused the most argument. Then return to the board: which test survived?',
    ],
    notice: [
      'A machine can sense without perceiving: a door that opens when a sensor is triggered reacts to a signal, but it does not work out what the signal means.',
      'The same product can be both. A calculator follows fixed rules; a phone keyboard that predicts your next word learned from examples.',
      'Most people end with a “Not sure” pile. That is a good result: the sheet is a prompt for questions, not a test.',
    ],
    discuss: [
      'What fact about a machine would move it from “Not sure” to one of the other sheets?',
      'Does a machine have to be clever to count as AI, or does it have to learn?',
      'Name one machine in your home that you suspect has learned something from data. What data would it have needed?',
    ],
    answers: [
      'Calculator, lift that always visits floors in order, and a vending machine that checks coins: rules written by a person.',
      'Photo app that groups pictures by face, translation app, and email spam filter: built from examples (a learned model).',
      'Thermostat: a schedule is rules. A thermostat that adjusts itself from your past habits is learning. Ask which one it is.',
      'Automatic door: sensing, not perceiving. If a camera on the door decides whether a person or a trolley is approaching, that part is perception.',
      'Hedge on products: whether a real product learns depends on how it is built, which the maker often does not say. Say so to students.',
    ],
    lessons: ['start/what-is-ai-in-plain-english', 'start/computers-that-decide-and-plan'],
    cards: [
      {
        title: 'Machine cards',
        note: 'Cut along the dashed lines. Pairs get one set.',
        items: [
          'Pocket calculator',
          'Vending machine that checks your coin',
          'Automatic door with a pressure pad',
          'Photo app that groups pictures by whose face is in them',
          'Translation app',
          'Lift that stops at every floor in order',
          'Thermostat on a weekly timer',
          'Thermostat that changes itself from your past habits',
          'Email spam filter',
          'Phone keyboard that suggests your next word',
          'Traffic light on a fixed timer',
          'Game character that follows if-then rules the designer wrote',
        ],
      },
    ],
    related: [
      { label: 'AI4K12, Big Idea 1: Perception (sensing versus perception)', url: 'https://ai4k12.org/big-idea-1-overview/' },
      { label: 'Experience AI, Understanding AI, lesson 1: What is AI?', url: 'https://experience-ai.org/en/units/understanding-ai-11-14' },
    ],
  },
  {
    id: 'be-the-classifier',
    title: 'Be the classifier',
    hook: 'Work out the hidden rule that separates Zorps from Blips from ten labelled cards, then test it on cards you have not seen.',
    bands: ['10-12', '13-15', '16-18'],
    minutes: 30,
    group: 'Pairs or threes',
    bigIdea: 3,
    materials: ['Training cards (10) and test cards (6), cut out and kept face down until needed', 'Paper and a pencil per group'],
    steps: [
      'Show the ten training cards, each with its label. Do not say what the rule is. Say only that every card has a label because someone checked it.',
      'Groups write down a rule that gets every training card right. They also write how many training cards they got right.',
      'Collect the rules on the board. Ask: which feature did you use, and which did you ignore?',
      'Turn over the six test cards, one at a time. Each group writes “Zorp” or “Blip” using its rule before the label is revealed. Score each group out of 6.',
      'Compare training scores with test scores. Ask which rules did well on both, and why a rule that scored 8 out of 10 on training should have been rejected.',
    ],
    notice: [
      'Several different rules can fit the training cards. Only some keep working on new cards.',
      'The number of antennae does not matter in this set. A learner has to find which features carry the label and which are noise.',
      'A rule that is right on the cards it was built from is not proof that it is right on new ones. This is why computers are tested on cards they never trained on.',
    ],
    discuss: [
      'Which rules fit all ten training cards? How could you pick between them?',
      'What new card would you ask for to tell two rules apart?',
      'If we added ten more labelled cards, would your rule change? Why?',
    ],
    answers: [
      'The hidden rule: a card with a tail and at least 2 spots is a Zorp; any other card is a Blip.',
      'On the training cards, “has a tail” alone and “at least 2 spots” alone each get 8 of 10 right, and only the full rule gets 10 of 10. On the six test cards, the full rule gets 6 of 6, “has a tail” gets 5, and “at least 2 spots” gets 4. We checked these counts with a short script.',
      'Antennae never matter. Groups who use antennae do badly on both sets.',
      'If a group finds the right rule early, give them a rule-breaker: a card with a tail and 2 spots labelled Blip. Ask what a machine should do about one mislabelled card (it usually tolerates a few).',
    ],
    lessons: ['start/how-computers-learn', 'start/three-ways-machines-learn'],
    cards: [
      {
        title: 'Training cards (labelled)',
        note: 'Format: antennae, spots, tail, then the label. Write the label on the back for the unlabelled version.',
        items: [
          '2 antennae, 3 spots, tail: ZORP',
          '1 antenna, 2 spots, tail: ZORP',
          '3 antennae, 4 spots, tail: ZORP',
          '2 antennae, 2 spots, tail: ZORP',
          '1 antenna, 3 spots, tail: ZORP',
          '2 antennae, 0 spots, tail: BLIP',
          '3 antennae, 1 spot, tail: BLIP',
          '1 antenna, 4 spots, no tail: BLIP',
          '2 antennae, 3 spots, no tail: BLIP',
          '3 antennae, 0 spots, no tail: BLIP',
        ],
      },
      {
        title: 'Test cards (hide the labels)',
        note: 'Labels, in order, for the teacher: Zorp, Blip, Blip, Zorp, Blip, Blip.',
        items: ['3 antennae, 2 spots, tail', '1 antenna, 1 spot, tail', '2 antennae, 4 spots, no tail', '3 antennae, 3 spots, tail', '1 antenna, 0 spots, no tail', '2 antennae, 2 spots, no tail'],
      },
    ],
    related: [
      { label: 'Experience AI, Understanding AI, lesson 3: Classification', url: 'https://experience-ai.org/en/units/understanding-ai-11-14' },
      { label: 'AI4K12, Big Idea 3: Learning', url: 'https://ai4k12.org/big-idea-3-overview/' },
    ],
  },
  {
    id: 'twenty-questions-tree',
    title: '20 questions as a decision tree',
    hook: 'Play 20 questions with 16 animals, then draw the questions you asked as a branching tree.',
    bands: ['10-12', '13-15'],
    minutes: 30,
    group: 'Pairs',
    bigIdea: 2,
    materials: ['Animal list for each pair', 'Plain paper and a pencil for drawing the tree'],
    steps: [
      'One partner secretly chooses an animal from the list. The other asks yes or no questions to find it, and the chooser answers truthfully. Count the questions.',
      'Swap roles and play twice more. Each pair writes down the questions that worked best.',
      'Now ask for a plan made before the game: the fewest questions that guarantee an answer. Pairs draw a tree with one question at the top and branches for yes and no, ending in animals.',
      'Test the tree. Hand a pair another pair’s tree and an animal. Follow the branches. Did the tree reach the animal?',
      'Ask which questions split the list into two roughly equal halves, and why those are the best ones.',
    ],
    notice: [
      'Each question has two outcomes. If a question splits the remaining animals in half, 16 animals need only 4 questions, because 2 × 2 × 2 × 2 = 16.',
      'Twenty good questions can separate more than a million things: 2 to the power of 20 is 1,048,576.',
      'A tree is a plan made before the game. A machine that learns one from labelled examples is called a decision tree.',
    ],
    discuss: [
      'Which first question did most pairs choose? What made it good?',
      'Would the best tree for animals work for a different list, such as musical instruments?',
      'Is the tree “thinking”, or is it following a plan? What is the difference?',
    ],
    answers: [
      'The list is four mammals (dog, cat, rabbit, horse), four birds (sparrow, penguin, eagle, owl), four animals with a backbone that are not mammals or birds (goldfish, shark, frog, crocodile) and four small animals without one (bee, ant, spider, butterfly). Sixteen items, so a perfectly balanced tree needs 4 questions.',
      'A strong first question is “Is it a mammal or a bird?”, which splits the list 8 and 8. “Does it have legs?” is a weak one: only goldfish and shark say no, so it splits 14 and 2. On the “no” side, “Does it have a backbone?” splits 4 and 4. Let pairs discover this, and do not worry if their trees are not perfectly balanced.',
      'Real decision-tree learning picks each question from labelled examples, by choosing the one that best separates the labels.',
    ],
    lessons: ['start/computers-that-decide-and-plan', 'ml/decision-trees-and-random-forests'],
    cards: [
      {
        title: 'Animal list',
        items: ['Dog', 'Cat', 'Rabbit', 'Horse', 'Sparrow', 'Penguin', 'Eagle', 'Owl', 'Goldfish', 'Shark', 'Frog', 'Crocodile', 'Bee', 'Ant', 'Spider', 'Butterfly'],
      },
    ],
    related: [
      { label: 'CS Unplugged, Searching algorithms (How many guesses?)', url: 'https://www.csunplugged.org/en/topics/searching-algorithms/' },
      { label: 'CS Unplugged, Data structures for searching (binary search trees, ages 11 to 14)', url: 'https://www.csunplugged.org/en/topics/data-structures-for-searching/' },
      { label: 'Experience AI, Foundations of AI, lesson 4: Decision trees', url: 'https://experience-ai.org/en/units/foundations-of-ai-11-14' },
    ],
  },
  {
    id: 'bias-in-the-data',
    title: 'Bias in the data',
    hook: 'Teach a “bird detector” with only small garden birds, then test it on a penguin, an ostrich and a bat.',
    bands: ['10-12', '13-15', '16-18'],
    minutes: 30,
    group: 'Groups of four',
    bigIdea: 5,
    materials: ['The lopsided training set and the test set, cut out', 'Paper for the group’s written rule'],
    steps: [
      'Give each group only the lopsided training set. Ask them to write a rule that separates “bird” from “not a bird” using only those cards. Do not show the test set yet.',
      'Each group predicts what its rule will say for each test card. Write the predictions down before you reveal anything.',
      'Reveal the test cards and the true answers. Groups count their mistakes and circle which cards fooled them.',
      'Ask: what is true of every card the rule got wrong? What is missing from the training set?',
      'Groups design a better training set: list five cards to add, and say why each one is needed. Then ask who chose the original cards, and whether they could have known.',
    ],
    notice: [
      'The rule is not stupid. It is exactly right for the examples it saw. The unfairness is in the examples.',
      'The mistakes fall on the cases the set did not include: the animals that are unusual, not the ones that are common.',
      'Adding more cards that look the same does not help. It needs different cards, so the number of examples matters less than their variety.',
    ],
    discuss: [
      'Who decided which cards went into the training set? What did they not think about?',
      'If a real system for something that matters, such as spotting illness, were trained like this, who would it let down?',
      'How could you find out that a training set is lopsided before using the system?',
    ],
    answers: [
      'Typical learned rule: small, has wings, flies, has feathers. Expect the penguin and ostrich to be called “not a bird”, the bat to be called “bird”, and the eagle to depend on how the group handled “small”.',
      'Students’ rules vary, so these outcomes are typical rather than guaranteed. The point is to compare predictions with the reveal.',
      'A fairer set includes birds that do not fly, big birds, water birds, and non-birds that fly (bat, bee, plane).',
    ],
    lessons: ['responsible/when-examples-are-unfair', 'start/how-computers-learn'],
    cards: [
      { title: 'Training set (lopsided)', note: 'Birds: sparrow in a tree, robin on a fence, blue tit on a feeder, blackbird on a lawn, finch on a branch, wren in a hedge. Not birds: cat on a sofa, dog in a park, goldfish in a bowl, ladybird on a leaf, bicycle, tree.', items: ['BIRD: sparrow in a tree', 'BIRD: robin on a fence', 'BIRD: blue tit on a feeder', 'BIRD: blackbird on a lawn', 'BIRD: finch on a branch', 'BIRD: wren in a hedge', 'NOT A BIRD: cat on a sofa', 'NOT A BIRD: dog in a park', 'NOT A BIRD: goldfish in a bowl', 'NOT A BIRD: ladybird on a leaf', 'NOT A BIRD: bicycle', 'NOT A BIRD: tree'] },
      { title: 'Test set (hide the answers)', note: 'Answers for the teacher: penguin yes, ostrich yes, eagle yes, chicken yes, bat no, kite (toy) no.', items: ['Penguin swimming', 'Ostrich running', 'Eagle in flight', 'Chicken in a farmyard', 'Bat in flight', 'Toy kite in the sky'] },
    ],
    related: [
      { label: 'Experience AI, Understanding AI, lesson 4: Bias in, bias out', url: 'https://experience-ai.org/en/units/understanding-ai-11-14' },
      { label: 'AI4K12, Big Idea 5: Societal Impact', url: 'https://ai4k12.org/big-idea-5-societal-impact/' },
    ],
  },
  {
    id: 'human-neural-network',
    title: 'Human neural network',
    hook: 'Six students become the units of a tiny network that decides whether to go to the park, then change one number and watch the decision change.',
    bands: ['13-15', '16-18'],
    minutes: 30,
    group: 'Six students; the rest are observers',
    bigIdea: 3,
    materials: ['Six unit cards (below), each with its weights and its “needs a score of at least” number', 'Input cards: Sunny, Friend free, Homework done, each showing 1 or 0', 'A whiteboard to record results'],
    steps: [
      'Three students hold the input cards. The inputs for this round are announced by the teacher, for example: Sunny 0, Friend free 1, Homework done 1.',
      'Two students are hidden units, H1 and H2. Each reads their card, adds up the weight times the input for each of their inputs, and compares the total with their “needs at least” number. If the total reaches it, they say 1, otherwise 0.',
      'The sixth student is the output unit. They take H1 and H2’s answers, multiply by their own weights, add up, and say “Go to the park” (1) or “Stay in” (0).',
      'Observers record the inputs and the output for each round. Run all eight combinations of inputs.',
      'Now change one number on one card, such as raising H1’s “needs at least” from 1 to 2, and run all eight combinations again. Compare the two tables.',
    ],
    notice: [
      'Nobody in the network understands “the park”. Each person only adds and compares.',
      'The behaviour of the whole network is set entirely by the numbers on the cards. Changing a number changes the behaviour.',
      'Training a real network means finding good numbers automatically, by trying, measuring how wrong the output is, and nudging many numbers a little. Here you changed one by hand.',
    ],
    discuss: [
      'What rule is the network following? Say it in a sentence.',
      'What changed in the table after you raised H1’s threshold? Why?',
      'A real network has millions of these numbers. Why can nobody set them by hand?',
    ],
    answers: [
      'Cards. H1: Sunny weight 1, Friend free weight 1, needs at least 1. H2: Homework done weight 1, needs at least 1. Output: H1 weight 1, H2 weight 1, needs at least 2.',
      'This computes “(sunny or friend free) and homework done”. Checking the eight rows: it says go only when homework is done and at least one of sunny and friend is 1. That is 3 of the 8 combinations.',
      'With H1 raised to “needs at least 2” the network needs both sunny and a friend as well as homework, so it says go in only 1 of the 8 combinations.',
      'This is a network of simple threshold units. Real networks usually use smoother functions, and set their numbers by training, but each unit still takes a weighted sum.',
    ],
    lessons: ['deep-learning/inside-a-neural-network', 'foundations/how-models-learn'],
    cards: [
      {
        title: 'Unit cards',
        note: 'Each unit adds weight × input for each input it hears, then says 1 if the total reaches its number, otherwise 0.',
        items: [
          'H1: Sunny × 1 + Friend free × 1. Say 1 if the total is at least 1.',
          'H2: Homework done × 1. Say 1 if the total is at least 1.',
          'OUTPUT: H1 × 1 + H2 × 1. Say GO (1) if the total is at least 2.',
          'Input card: Sunny (1 or 0)',
          'Input card: Friend free (1 or 0)',
          'Input card: Homework done (1 or 0)',
        ],
      },
    ],
    related: [
      { label: 'AI4K12, Big Idea 3 progression chart (neural networks, grades 6-8 and 9-12)', url: 'https://ai4k12.org/big-idea-3-overview/' },
    ],
  },
  {
    id: 'spot-the-fake-source',
    title: 'Spot the fake source',
    hook: 'Eight invented scenarios, some real and some fake: decide what you would check before you believed or shared each one.',
    bands: ['10-12', '13-15', '16-18'],
    minutes: 25,
    group: 'Pairs, then the class',
    bigIdea: 5,
    materials: ['One set of scenario cards per pair', 'Paper for each pair’s verdict list'],
    steps: [
      'Pairs take the cards in order. For each card they write one of three verdicts: believe it, check it first, or do not trust it, and the first thing they would check.',
      'Groups report back. Ask for the check, not the verdict: what exactly would you do, and where?',
      'Reveal the teacher notes for each card. Count how many cards were real: the answer is not zero.',
      'Finish with a class list of the three checks that were most useful. Keep it on the wall.',
    ],
    notice: [
      'Several cards describe things that are true. Treating everything as fake is as unhelpful as believing everything.',
      'The strongest checks do not depend on guessing whether something is AI-made. They ask where it came from, and whether you can confirm it a different way.',
      'Not every fake uses AI. An old, real photo with a wrong caption is a fake too.',
    ],
    discuss: [
      'Which card was hardest to judge, and what would have made it easier?',
      'What does a scam usually try to make you feel before you act?',
      'What would you do if a friend shared a card you think is fake?',
    ],
    answers: [
      'All scenarios are invented for this activity. Checking steps are general advice, not a guarantee of finding the truth. Detection tools are not reliable enough to decide for you.',
      'The UK Safer Internet Centre’s advice for young people lists signs such as content that looks surprising or shocking, looks too perfect, or has details you know are untrue, and says to check other sources or talk to an adult. Use it alongside the notes below.',
    ],
    lessons: ['responsible/real-or-fake', 'start/using-ai-without-getting-burned'],
    cards: [
      {
        title: 'Scenario cards',
        note: 'Teacher key: 1 do not trust (urgency, unusual request, call back on the number you know); 2 check first (find the earliest copy and a news source); 3 check first (no source, no name); 4 do not trust until you find the paper; 5 check first (look at the school’s own site or app); 6 check first (real picture, wrong caption); 7 do not trust (send money first); 8 believe it, with normal care (named sources and a link to the original).',
        items: [
          '1. A voice message from “Dad” on an unknown number says he has lost his phone and needs gift-card codes now. It sounds exactly like him.',
          '2. A photo shows a shark swimming along a flooded motorway. It was posted by an account with three posts and gives no place or date.',
          '3. A screenshot of a quote: “Scientists say this snack is dangerous.” It names no scientist, no study and no link.',
          '4. A chatbot gives you a source: “Journal of Applied Cats, 2019, volume 12, page 4”. You cannot find the journal.',
          '5. An email from an odd address says school is closed tomorrow and asks you to click a link to confirm your name.',
          '6. A real photograph of a past flood is shared with a caption saying it happened in your town this morning.',
          '7. A video of a famous footballer says you will receive double any money you send to his “giveaway” account.',
          '8. A local news report names two people it spoke to and links to the council’s published report it is describing.',
        ],
      },
    ],
    related: [
      { label: 'UK Safer Internet Centre: top tips for young people (Safer Internet Day 2026)', url: 'https://saferinternet.org.uk/safer-internet-day/safer-internet-day-2026/top-tips-for-young-people' },
      { label: 'Day of AI: free AI literacy lessons and activities', url: 'https://dayofai.org/' },
    ],
  },
  {
    id: 'reward-learning',
    title: 'Learn from rewards: beads and rock-paper-scissors',
    hook: 'A cup of beads plays rock-paper-scissors against a dice-driven opponent and learns which move wins most often.',
    bands: ['13-15', '16-18'],
    minutes: 35,
    group: 'Pairs',
    bigIdea: 3,
    materials: ['A cup or bag per pair', '9 beads or paper counters per pair: 3 each of three colours (rock, paper, scissors)', 'A die per pair', 'A tally sheet'],
    steps: [
      'One student is the learner and one is the opponent. The learner draws a bead without looking, announces the move it stands for, and puts it back.',
      'The opponent rolls the die. The opponent plays rock on 1, 2 or 3, paper on 4 or 5, and scissors on 6. The learner must not know this.',
      'Score the round. If the learner wins, add two beads of that colour. If the learner loses, remove one bead of that colour, but never remove the last bead of a colour. If it is a draw, change nothing.',
      'Play 20 rounds. After every five rounds, count the beads in the cup and note the share of each colour.',
      'Compare cups across the class. Then reveal how the opponent behaved, and ask which colour the cup should favour. Did it?',
    ],
    notice: [
      'The learner was never told the opponent’s habit. The beads changed because winning was rewarded and losing was penalised.',
      'Luck matters. Some cups learn well and some do not, even with the same rules, so a few games do not prove that a method works or fails.',
      'This is reinforcement learning in miniature: try something, get a reward or penalty, and change the odds for next time.',
    ],
    discuss: [
      'Did your cup learn the right move? How many rounds did it take?',
      'What happens if the opponent changes its habit halfway through?',
      'Why did we never remove the last bead of a colour? What might go wrong if we did?',
    ],
    answers: [
      'Paper beats rock, and the opponent plays rock half the time, so paper is the best move to favour.',
      'In a simulation of this exact rule (starting with 3 beads each, 20 rounds, repeated 20,000 times), paper’s share of the cup rose from one third to about 58 per cent on average, and was the most common colour in roughly four out of five cups. Individual cups varied widely, so expect some cups to learn nothing.',
      'The method is inspired by MENACE, a set of matchboxes that learned noughts and crosses, built by Donald Michie in the early 1960s.',
    ],
    lessons: ['start/three-ways-machines-learn'],
    related: [
      { label: 'MENACE, the matchbox noughts-and-crosses learner (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Matchbox_Educable_Noughts_and_Crosses_Engine' },
      { label: 'AI4K12, Big Idea 3 progression chart (reinforcement learning, grades 6-8)', url: 'https://ai4k12.org/big-idea-3-overview/' },
    ],
  },
  {
    id: 'draw-from-the-prompt',
    title: 'Draw from the prompt',
    hook: 'Write a prompt for a picture, hand it to a partner who draws it, and see what your words left out.',
    bands: ['10-12', '13-15', '16-18'],
    minutes: 25,
    group: 'Pairs',
    bigIdea: 4,
    materials: ['A small picture or simple scene for each writer (a drawing, a photo, or a card)', 'Plain paper and pencils', 'Optional: a timer'],
    steps: [
      'Writer A looks at a picture that partner B cannot see, and writes a prompt of no more than 20 words. A hands only the prompt over.',
      'B draws what the prompt says and nothing more. B may not ask questions. B should draw plainly, as a machine would, rather than guess what A meant.',
      'Compare B’s drawing with the original. List three things that went wrong and say, for each, what the prompt left out.',
      'A writes a second prompt, now allowed 40 words, and B draws again on a new sheet. Compare the two drawings.',
      'As a class, build a list of what a good prompt contains. Then ask what the machine would do with an unclear instruction: ask, guess, or make something up?',
    ],
    notice: [
      'The drawer filled every gap with a guess. A chatbot does the same, and it does not always tell you it guessed.',
      'More words help only when they are the right words: who, what, where, how many, which style.',
      'A short prompt that says what you want and what you do not want often beats a long vague one.',
    ],
    discuss: [
      'Which detail made the biggest difference? Why?',
      'If the drawer had been allowed to ask one question, which would it be?',
      'When would you want a chatbot to ask you a question rather than guess?',
    ],
    answers: [
      'This is a variation on a familiar barrier game used to teach precise instructions; no scoring is needed. Pick pictures with a few clear objects, a colour, and one unusual feature.',
    ],
    lessons: ['start/how-a-chatbot-answers', 'start/using-ai-without-getting-burned'],
    related: [
      { label: 'AI4K12 activity resource guides', url: 'https://ai4k12.org/activities/' },
    ],
  },
  {
    id: 'tokens-by-hand',
    title: 'Tokens by hand',
    hook: 'Cut a sentence into the fewest pieces from a small shared vocabulary, and discover why unusual words cost more.',
    bands: ['10-12', '13-15', '16-18'],
    minutes: 25,
    group: 'Pairs',
    bigIdea: 4,
    materials: ['The vocabulary strips, cut out, one set per pair', 'The sentence cards', 'Scissors and a pencil'],
    steps: [
      'Give each pair the vocabulary strips. They may use a whole strip as a piece, or a single letter. Spaces between words are free and are ignored.',
      'Show the first sentence. Pairs spell it using as few pieces as possible, and count the pieces. Ask for the count.',
      'Repeat with the second and third sentences. For each, compare the word count with the piece count.',
      'Ask the class: which words were cheap and which were expensive? Which words were spelled letter by letter, and why?',
      'Close with a connection: chatbots read text in pieces, and many systems charge by the piece. A rare word, a typo or a name can cost far more than a common word of the same length.',
    ],
    notice: [
      'Common words and common endings were in the vocabulary, so they cost one piece. A word that is not built from the vocabulary falls back to single letters.',
      'The vocabulary is chosen for a particular kind of text. Real systems build theirs from huge amounts of writing, which is why they split English differently from other languages.',
      'This is a toy. Real tokenisers learn their pieces from text and handle spaces and capital letters in ways this game ignores.',
    ],
    discuss: [
      'Why might another language, or a name like “Aoife” or “Nakamura”, take more pieces than a common English word?',
      'If a system charged per piece, how could you shorten a message without losing meaning?',
      'Why would a vocabulary of single letters only be a bad idea? Why would a vocabulary of every word be bad too?',
    ],
    answers: [
      'Vocabulary: the, teach, er, s, re, play, ed, video, un, happy, est, ing, plus every single letter.',
      'Sentence 1, “the teachers replayed the videos”: 5 words, 10 pieces (the, teach, er, s, re, play, ed, the, video, s).',
      'Sentence 2, “the unhappiest teachers”: 3 words, 11 pieces. “happy” does not fit “unhappiest” (it ends in i), so the letters h, a, p, p, i are spelled singly: the, un, h, a, p, p, i, est, teach, er, s.',
      'Sentence 3, “replaying”: 1 word, 3 pieces (re, play, ing). A made-up word such as “zzyzx” needs 5 pieces, one per letter.',
      'We computed these minimum counts with a short script over exactly this vocabulary.',
    ],
    lessons: ['start/how-computers-read-words', 'foundations/tokens-and-embeddings'],
    cards: [
      { title: 'Vocabulary strips', items: ['the', 'teach', 'er', 's', 're', 'play', 'ed', 'video', 'un', 'happy', 'est', 'ing', 'Plus every single letter, a to z'] },
      { title: 'Sentences', items: ['the teachers replayed the videos', 'the unhappiest teachers', 'replaying', 'Your own: write a sentence and cut it'] },
    ],
    related: [
      { label: 'AI4K12 activity resource guides (language and chatbots)', url: 'https://ai4k12.org/activities/' },
    ],
  },
  {
    id: 'pixels-by-numbers',
    title: 'Pixels by numbers',
    hook: 'Colour in a grid of 0s and 1s to reveal a picture, then find the edges the way a computer would.',
    bands: ['10-12', '13-15', '16-18'],
    minutes: 25,
    group: 'Pairs',
    bigIdea: 1,
    materials: ['The 8 × 8 grid of numbers, one per pair', 'A pencil or a dark crayon', 'A ruler (optional)'],
    steps: [
      'Give each pair the grid. Tell them only that 0 means white and 1 means dark, and ask them to shade every square marked 1.',
      'Ask what the picture is. Then ask what the computer was given: a picture, or a table of numbers? Where was the picture?',
      'Next, find the “edges”. Look along each row, and put a mark between two neighbouring squares wherever the number changes from 0 to 1 or from 1 to 0.',
      'Count the marks. Then compare the marks with the picture: where did they appear?',
      'Ask how the grid would change for a colour photograph (each square would need more than one number), and how many numbers a phone photo has (millions).',
    ],
    notice: [
      'A computer has no picture, only numbers. “Seeing” starts by looking for patterns in the numbers.',
      'Edges are easy to find from numbers: they are where neighbouring values change. Many vision systems start by finding features like this and build up to whole objects.',
      'This grid is tiny. Real photographs are made of millions of numbers.',
    ],
    discuss: [
      'What do the edges tell you about where the shape begins and ends?',
      'How could a computer use edges to tell a heart from a circle?',
      'What would go wrong if the picture were dark or blurry, so that the numbers were all close together?',
    ],
    answers: [
      'The grid is a heart. There are 40 squares marked 1, and 10 left-to-right changes (marks) in total: 4 in the top row, 2 in the fifth row, 2 in the sixth row, and 2 in the seventh row.',
      'Rows two to four are all 1s, so they have no left-to-right changes: their edges are at the top and bottom, which students find if they also compare neighbours in each column. Extension: count the up-down changes too.',
    ],
    lessons: ['start/ai-that-sees-and-hears', 'deep-learning/how-computers-see'],
    cards: [
      {
        title: 'The grid (1 = dark, 0 = white)',
        note: 'Rows from top to bottom.',
        items: ['0 1 1 0 0 1 1 0', '1 1 1 1 1 1 1 1', '1 1 1 1 1 1 1 1', '1 1 1 1 1 1 1 1', '0 1 1 1 1 1 1 0', '0 0 1 1 1 1 0 0', '0 0 0 1 1 0 0 0', '0 0 0 0 0 0 0 0'],
      },
    ],
    related: [
      { label: 'CS Unplugged, Image representation (Colour by numbers, ages 5 to 10)', url: 'https://www.csunplugged.org/en/topics/image-representation/' },
      { label: 'AI4K12, Big Idea 1 progression chart (digital encoding and feature extraction)', url: 'https://ai4k12.org/big-idea-1-overview/' },
    ],
  },
  {
    id: 'guess-the-next-word',
    title: 'Be the next-word machine',
    hook: 'Everyone writes the next word for the same sentence start, tally the results, and pick by chance from the tally.',
    bands: ['10-12', '13-15', '16-18'],
    minutes: 20,
    group: 'Whole class',
    bigIdea: 4,
    materials: ['A whiteboard', 'A slip of paper per student', 'A die or a pack of numbered cards'],
    steps: [
      'Write a sentence start on the board, such as “After school I like to…”. Each student secretly writes the one word they think comes next.',
      'Collect the slips and make a tally on the board: each different word and how many students wrote it.',
      'Ask which word a machine that always picks the most common one would choose. Write the sentence with that word.',
      'Now pick a word by chance in proportion to the tally: number the slips, roll a die or draw a card, and use the matching slip. Do it three times. Are the sentences the same?',
      'Continue the sentence one more word and repeat. Compare a sentence made by always picking the top word with one made by chance.',
    ],
    notice: [
      'Always taking the most common word gives the same answer every time, and often a dull one. Picking by chance gives variety.',
      'A chatbot has a setting called temperature that moves between those two. A low temperature stays near the most likely word; a high one takes more risks.',
      'The class knew nothing about the words except what people tend to write next. A chatbot is built from the same idea at huge scale.',
    ],
    discuss: [
      'Which sentence made by chance surprised you most? Was it wrong, or just unusual?',
      'Why can a chatbot give a different answer to the same question?',
      'Why might picking by chance sometimes make a chatbot say something false?',
    ],
    answers: [
      'No right answers. Use the class’s own tally. Keep a record of the three “chance” sentences for the discussion.',
    ],
    lessons: ['start/how-a-chatbot-answers'],
    related: [
      { label: 'AI4K12 activity resource guides: Markov Chain demo (grades 6-8 and 9-12)', url: 'https://ai4k12.org/activities/' },
    ],
  },
  {
    id: 'spam-by-tally',
    title: 'Spam filter by tally',
    hook: 'Count which words appear in spam and in real messages, then score new messages by hand and measure where the filter fails.',
    bands: ['16-18'],
    minutes: 40,
    group: 'Groups of four',
    bigIdea: 3,
    materials: ['The 12 labelled training messages, cut out and shared out among the group', 'The five test messages', 'A tally table: word, spam count, real count', 'Paper and a calculator (optional)'],
    steps: [
      'Split the 12 labelled messages among the group. For every word, tally how many times it appears in the spam messages and how many times in the real ones, counting every appearance. Ignore capitals and punctuation.',
      'Combine the group’s tallies into one table. This table is the model.',
      'Score each test message: for every word in it, add the word’s spam tally and subtract its real tally. A positive total means “spam”, a negative total means “real”.',
      'Write down the filter’s verdict for each of the five test messages. Then reveal the true labels and count the mistakes.',
      'For each mistake, say which word caused it. Then ask what extra training messages would fix it, and what a real filter would need that this one does not have.',
    ],
    notice: [
      'The model is nothing but counted evidence. It has no idea what a prize or a lunch is.',
      'A word that is common in spam, such as “free”, can also appear in an ordinary message. A filter that looks at single words cannot see that context.',
      'Whether a mistake matters depends on the cost: a real message sent to spam may matter more than a spam message that gets through.',
    ],
    discuss: [
      'Which kind of error is worse for a school email filter? Why?',
      'Twelve training messages is tiny. What would change with twelve million, and what would not?',
      'How could a spammer beat this filter?',
    ],
    answers: [
      'This is a deliberately simple word-evidence tally, not a full naive Bayes classifier. We computed every number below with a short script.',
      'Spam training messages: Win a free prize now. Click now to claim your free prize. You are a winner claim your free gift now. Free entry click here to win. Urgent click this link to claim cash now. Winner winner free cash prize.',
      'Real training messages: Are you coming to football tomorrow. Homework is due tomorrow can you send yours. Lunch at one near the library. Can you bring the football to school. Free period tomorrow so lunch. See you at the library after school.',
      'Selected tallies (spam, real): free (5, 1), now (4, 0), click (3, 0), claim (3, 0), prize (3, 0), tomorrow (0, 3), lunch (0, 2), football (0, 2).',
      'Scores for the tests: “Claim your free prize” = +12 (spam, correct). “Free period tomorrow after lunch” = -3 (real, correct). “Click this link now” = +9 (spam, correct). “Football at lunch tomorrow” = -9 (real, correct). “Are you a winner of free lunch” = +4 (spam). That last message is an ordinary message from a friend, so it is a false positive that the filter gets wrong because of “winner” and “free”.',
      'Accuracy on these five is 4 of 5, which says little: five test messages are too few to trust. That is a point worth making.',
    ],
    lessons: ['ml/getting-data-ready', 'ml/overfitting-and-bias-variance', 'foundations/classical-ml-essentials'],
    cards: [
      {
        title: 'Labelled training messages',
        items: [
          'SPAM: Win a free prize now',
          'SPAM: Click now to claim your free prize',
          'SPAM: You are a winner claim your free gift now',
          'SPAM: Free entry click here to win',
          'SPAM: Urgent click this link to claim cash now',
          'SPAM: Winner winner free cash prize',
          'REAL: Are you coming to football tomorrow',
          'REAL: Homework is due tomorrow can you send yours',
          'REAL: Lunch at one near the library',
          'REAL: Can you bring the football to school',
          'REAL: Free period tomorrow so lunch',
          'REAL: See you at the library after school',
        ],
      },
      {
        title: 'Test messages (hide the labels)',
        note: 'Labels for the teacher: spam, real, spam, real, real.',
        items: ['Claim your free prize', 'Free period tomorrow after lunch', 'Click this link now', 'Football at lunch tomorrow', 'Are you a winner of free lunch'],
      },
    ],
    related: [
      { label: 'Experience AI, Foundations of AI, lesson 5: How to solve problems with machine learning models', url: 'https://experience-ai.org/en/units/foundations-of-ai-11-14' },
    ],
  },
];

export const unpluggedById = Object.fromEntries(unplugged.map((a) => [a.id, a]));
