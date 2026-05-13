const questTemplates = {
  javascript: [
    {
      id: 'js_web_core',
      files: ['main.game.js', 'engine.js', 'ui.js'],
      devTasks: [
        { id: 'js-w1', label: 'Set score = 0 trong init', target: 'main.game.js', testCode: 'console.log(score);', expectedOutput: '0' },
        { id: 'js-w3', label: 'Implement EventEmitter.on(event, fn)', target: 'engine.js', testCode: "const e = new EventEmitter(); e.on('test', () => console.log('OK')); e.emit('test');", expectedOutput: 'OK' },
        { id: 'js-w4', label: 'Thêm logic trong gameLoop()', target: 'main.game.js', testCode: "gameLoop(); console.log('OK');", expectedOutput: 'OK' }
      ],
      injTasks: [
        { id: 'injs-w1', label: 'Thêm while(true){} trong gameLoop', target: 'main.game.js', testCode: 'while\\s*\\(\\s*true\\s*\\)', expectedOutput: 'SABOTAGE' },
        { id: 'injs-w3', label: 'Delete Object.prototype', target: 'engine.js', testCode: 'delete Object.prototype', expectedOutput: 'SABOTAGE' }
      ]
    }
  ],
  python: [
    {
      id: 'py_ai_logic',
      files: ['game_state.py', 'ai_brain.py', 'utils.py'],
      devTasks: [
        { id: 'py-a1', label: 'Thêm is_running=False vào __init__', target: 'game_state.py', testCode: 'print(GameState().is_running)', expectedOutput: 'False' },
        { id: 'py-a2', label: 'Implement lerp(a, b, t)', target: 'utils.py', testCode: 'print(lerp(0, 10, 0.5))', expectedOutput: '5' },
        { id: 'py-a3', label: 'Viết check_winner trả về True/False', target: 'game_state.py', testCode: 'print(check_winner(GameState()))', expectedOutput: 'False' }
      ],
      injTasks: [
        { id: 'inpy-a1', label: 'Đổi return True thành False', target: 'game_state.py', testCode: 'return False', expectedOutput: 'SABOTAGE' },
        { id: 'inpy-a2', label: 'Import nonexistent_module', target: 'game_state.py', testCode: 'import nonexistent', expectedOutput: 'SABOTAGE' }
      ]
    }
  ],
  cpp: [
    {
      id: 'cpp_render_engine',
      files: ['renderer.cpp', 'game.cpp', 'math_utils.hpp'],
      devTasks: [
        { id: 'cpp-r1', label: 'Khai báo struct Player { string name; int hp; }', target: 'game.cpp', testCode: 'Player p; p.name = "Test"; p.hp = 100; std::cout << p.hp;', expectedOutput: '100' },
        { id: 'cpp-r2', label: 'Implement Renderer(w,h): gán width và height', target: 'renderer.cpp', testCode: 'Renderer r(800, 600); std::cout << r.width;', expectedOutput: '800' },
        { id: 'cpp-r3', label: 'Viết hàm clamp(val, min, max) trong math_utils', target: 'math_utils.hpp', testCode: 'std::cout << clamp(15, 0, 10);', expectedOutput: '10' }
      ],
      injTasks: [
        { id: 'incpp-r1', label: 'Thêm delete ptr; sau khi dùng trong update()', target: 'game.cpp', testCode: 'delete', expectedOutput: 'SABOTAGE' },
        { id: 'incpp-r3', label: 'Xóa this->width = w trong constructor', target: 'renderer.cpp', testCode: 'width', expectedOutput: 'MISSING' }
      ]
    }
  ]
};

function buildQuestSet(language) {
  const templates = questTemplates[language] || [];
  if (!templates.length) throw new Error(`Unsupported language: ${language}`);
  const template = templates[0];
  const files = Object.fromEntries(template.files.map(fileId => [fileId, { fileId, language, content: '' }]));
  const developerTasks = Object.fromEntries(template.files.map(fileId => [fileId, template.devTasks.filter(task => task.target === fileId)]));
  const injectorTasks = Object.fromEntries(template.files.map(fileId => [fileId, template.injTasks.filter(task => task.target === fileId)]));
  return {
    templateId: template.id,
    language,
    files,
    developerTasks,
    injectorTasks
  };
}

module.exports = {
  questTemplates,
  buildQuestSet
};