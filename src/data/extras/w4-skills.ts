import type { Extra } from '../lesson-extras';

/** Extras (takeaways, prerequisites, quiz) for the lessons in the wave 4 "skills" batch. */
export const extrasW4Skills: Record<string, Extra> = {
  'skills/maths-without-fear': {
    takeaways: [
      'A vector is a list of numbers, drawn as an arrow. The dot product says how much two arrows point the same way, which is how similar things are found.',
      'A matrix is a machine that moves every arrow at once. A layer of a neural network is a machine like this.',
      'The slope tells you which way is downhill. Training takes many small steps downhill, and a step that is too big overshoots.',
      'Slopes along a chain multiply (the chain rule), and probability is counting: when something is rare, even a good detector gives many false alarms.',
    ],
    prereq: ['start/how-computers-learn'],
    quiz: [
      { q: 'What is the dot product of the arrows (2, 3) and (4, 1)?', options: ['6', '11', '14', '24'], answer: 1, why: 'Multiply the across numbers (2 x 4 = 8), multiply the up numbers (3 x 1 = 3), then add: 8 + 3 = 11.' },
      { q: 'Pressing a pedal 1 cm moves a gearbox 3 cm. Each cm of gearbox moves a wheel 2 cm. How far does the wheel move?', options: ['5 cm', '3 cm', '6 cm', '1.5 cm'], answer: 2, why: 'Slopes along a chain multiply, so 3 x 2 = 6 cm. This is the chain rule.' },
      { q: 'A ball sits on a hill where the slope is steeply uphill to the right. Which way is a downhill step?', options: ['To the left', 'To the right', 'Straight up', 'It does not move'], answer: 0, why: 'The ground rises to the right, so going downhill means going left. Training always steps against the slope.' },
      { q: 'One player in 100 cheats. A detector catches 9 in 10 cheats and wrongly flags 9 in 100 honest players. Of 1,000 players, about how often is a flagged player a real cheat?', options: ['Nearly every flagged player', 'About half', 'Nine in ten', 'About one in eleven'], answer: 3, why: 'About 9 cheats are caught but about 89 honest players are flagged too, so only 9 of about 98 flags are real cheats.' },
    ],
  },
  'skills/your-toolkit-notebooks-colab-and-git': {
    takeaways: [
      'A notebook is cells of text and code with a kernel that remembers variables in the order you ran things. Restart and run all shows what the notebook really does.',
      'Colab runs your notebook on a virtual machine that is deleted when idle, so put install lines in the first cell. Sharing a notebook shares code and output, not the machine.',
      'Five commands (pwd, ls, cd, cat, mkdir) get you around a terminal. Git keeps save points: add chooses changes, commit saves them, and branches let you try ideas safely.',
      'Keep secrets out of notebooks and commits, list them in .gitignore, pin package versions, and if a key leaks, revoke it first.',
    ],
    prereq: ['skills/python-first-steps'],
    quiz: [
      { q: 'You run cells 1, 2 and 3, then edit cell 1 and run only cells 1 and 3. Cell 3 still shows the old answer. Why?', options: ['Cell 3 is broken', 'The notebook is saved wrongly', 'Python cannot change a number', 'Cell 2 never ran again, so the kernel still holds the old value it made'], answer: 3, why: 'The kernel remembers values in the order you ran things. Restart and run all rebuilds them from the top.' },
      { q: 'Which command tells you which folder you are in?', options: ['ls', 'cd', 'pwd', 'cat'], answer: 2, why: 'pwd prints the working folder. ls lists files, cd moves, and cat prints a file.' },
      { q: 'What does git add notes.txt do?', options: ['Makes a permanent save point', 'Chooses that file\'s changes for the next save point', 'Sends the file to GitHub', 'Deletes the file'], answer: 1, why: 'Add puts changes in the staging area. Only git commit makes the save point.' },
      { q: 'You find that an API key was committed to a repository. What should you do first?', options: ['Revoke or rotate the key', 'Delete the file and carry on', 'Wait to see if anyone notices', 'Rename the repository'], answer: 0, why: 'GitHub advises revoking or rotating a leaked secret first, because it may already have been copied.' },
    ],
  },
};
