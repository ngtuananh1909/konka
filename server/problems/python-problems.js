const PYTHON_PROBLEMS = {
  'game_state.py': {
    id: 'py-game-state-winner',
    title: 'Implement check_winner',
    statement: 'Complete the check_winner(state) function so it returns True when the game should end and False otherwise.',
    functionName: 'check_winner',
    starterCode: `class GameState:\n    def __init__(self):\n        self.players = []\n        self.round = 1\n        self.score = 0\n\ndef check_winner(state):\n    pass\n\ndef run_game():\n    state = GameState()\n    return state`,
    sampleTests: [
      {
        name: 'empty players returns False',
        setup: 'state = GameState()\nstate.players = []',
        expression: 'check_winner(state)',
        expected: false
      },
      {
        name: 'three players returns True',
        setup: 'state = GameState()\nstate.players = ["a", "b", "c"]',
        expression: 'check_winner(state)',
        expected: true
      }
    ],
    hiddenTests: [
      {
        name: 'single player returns False',
        setup: 'state = GameState()\nstate.players = ["solo"]',
        expression: 'check_winner(state)',
        expected: false
      },
      {
        name: 'many players returns True',
        setup: 'state = GameState()\nstate.players = [1, 2, 3, 4]',
        expression: 'check_winner(state)',
        expected: true
      }
    ]
  },
  'utils.py': {
    id: 'py-utils-lerp',
    title: 'Implement lerp',
    statement: 'Complete lerp(a, b, t) so it linearly interpolates between a and b.',
    functionName: 'lerp',
    starterCode: `import math\n\ndef clamp(value, min_val, max_val):\n    pass\n\ndef lerp(a, b, t):\n    pass\n\ndef distance(p1, p2):\n    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)`,
    sampleTests: [
      {
        name: 'midpoint',
        expression: 'lerp(0, 10, 0.5)',
        expected: 5
      },
      {
        name: 'quarter point',
        expression: 'lerp(4, 8, 0.25)',
        expected: 5
      }
    ],
    hiddenTests: [
      {
        name: 'same endpoints',
        expression: 'lerp(3, 3, 0.8)',
        expected: 3
      },
      {
        name: 'negative range',
        expression: 'lerp(-10, 10, 0.75)',
        expected: 5
      }
    ]
  },
  'ai_brain.py': {
    id: 'py-ai-predict',
    title: 'Implement AI.predict',
    statement: 'Complete AI.predict so it returns the last remembered value when memory exists, otherwise returns None.',
    functionName: 'AI.predict',
    starterCode: `class AI:\n    def __init__(self):\n        self.memory = []\n\n    def predict(self, state):\n        pass\n\n    def learn(self, data):\n        pass`,
    sampleTests: [
      {
        name: 'empty memory',
        setup: 'ai = AI()',
        expression: 'ai.predict({})',
        expected: null
      },
      {
        name: 'last memory wins',
        setup: 'ai = AI()\nai.memory = [1, 2, 7]',
        expression: 'ai.predict({})',
        expected: 7
      }
    ],
    hiddenTests: [
      {
        name: 'string memory',
        setup: 'ai = AI()\nai.memory = ["left", "right"]',
        expression: 'ai.predict({})',
        expected: 'right'
      },
      {
        name: 'single item memory',
        setup: 'ai = AI()\nai.memory = [42]',
        expression: 'ai.predict({})',
        expected: 42
      }
    ]
  }
};

function getProblemForFile(fileId) {
  return PYTHON_PROBLEMS[fileId] || null;
}

module.exports = {
  PYTHON_PROBLEMS,
  getProblemForFile
};
