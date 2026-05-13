const QUEST_TEMPLATES = {
    cpp: [
        {
            id: "cpp_render_engine",
            files: ["renderer.cpp", "game.cpp", "math_utils.hpp"],
            devTasks: [
                { id: "cpp-r1", label: "Khai báo struct Player { string name; int hp; }", target: "game.cpp", difficulty: "easy", testCode: "Player p; p.name = \"Test\"; p.hp = 100; std::cout << p.hp;", expectedOutput: "100" },
                { id: "cpp-r2", label: "Implement Renderer(w,h): gán width và height", target: "renderer.cpp", difficulty: "easy", testCode: "Renderer r(800, 600); std::cout << r.width;", expectedOutput: "800" },
                { id: "cpp-r3", label: "Viết hàm clamp(val, min, max) trong math_utils", target: "math_utils.hpp", difficulty: "medium", testCode: "std::cout << clamp(15, 0, 10);", expectedOutput: "10" },
                { id: "cpp-r4", label: "Implement draw(): in msg ra std::cout", target: "renderer.cpp", difficulty: "medium", testCode: "Renderer r(0,0); r.draw(\"OK\");", expectedOutput: "OK" },
                { id: "cpp-r5", label: "Xử lý vị trí players trong hàm update()", target: "game.cpp", difficulty: "hard", testCode: "update(); std::cout << \"PASS\";", expectedOutput: "PASS" },
                { id: "cpp-r6", label: "Tối ưu vòng lặp render bằng con trỏ", target: "renderer.cpp", difficulty: "hard", testCode: "std::cout << \"PASS\";", expectedOutput: "PASS" }
            ],
            injTasks: [
                { id: "incpp-r1", label: "Thêm delete ptr; sau khi dùng trong update()", target: "game.cpp", testCode: "delete", expectedOutput: "SABOTAGE" },
                { id: "incpp-r2", label: "Đổi <= thành < trong vòng lặp", target: "game.cpp", testCode: "i <[^=]", expectedOutput: "SABOTAGE" },
                { id: "incpp-r3", label: "Xóa this->width = w trong constructor", target: "renderer.cpp", testCode: "width", expectedOutput: "MISSING" }
            ]
        },
        {
            id: "cpp_physics",
            files: ["physics.cpp", "vector.hpp", "collision.cpp"],
            devTasks: [
                { id: "cpp-p1", label: "Khai báo struct Vector2 { float x, y; }", target: "vector.hpp", difficulty: "easy", testCode: "Vector2 v; v.x = 5.0; std::cout << v.x;", expectedOutput: "5" },
                { id: "cpp-p2", label: "Implement operator+ cho Vector2", target: "vector.hpp", difficulty: "easy", testCode: "Vector2 a{1,2}, b{3,4}; Vector2 c = a + b; std::cout << c.x;", expectedOutput: "4" },
                { id: "cpp-p3", label: "Viết hàm applyForce(force, mass)", target: "physics.cpp", difficulty: "medium", testCode: "Vector2 f{10,0}; applyForce(f, 2.0); std::cout << \"OK\";", expectedOutput: "OK" },
                { id: "cpp-p4", label: "Implement checkCollision(a, b)", target: "collision.cpp", difficulty: "medium", testCode: "std::cout << (checkCollision(0,0) ? \"YES\" : \"NO\");", expectedOutput: "YES" },
                { id: "cpp-p5", label: "Tính toán velocity trong update()", target: "physics.cpp", difficulty: "hard", testCode: "update(1.0); std::cout << \"PASS\";", expectedOutput: "PASS" },
                { id: "cpp-p6", label: "Xử lý va chạm đàn hồi", target: "collision.cpp", difficulty: "hard", testCode: "std::cout << \"PASS\";", expectedOutput: "PASS" }
            ],
            injTasks: [
                { id: "incpp-p1", label: "Đổi + thành - trong operator+", target: "vector.hpp", testCode: "operator-", expectedOutput: "SABOTAGE" },
                { id: "incpp-p2", label: "Chia cho 0 trong applyForce", target: "physics.cpp", testCode: "/ 0", expectedOutput: "SABOTAGE" },
                { id: "incpp-p3", label: "Return false trong checkCollision", target: "collision.cpp", testCode: "return false", expectedOutput: "SABOTAGE" }
            ]
        }
    ],
    java: [
        {
            id: "java_backend",
            files: ["Main.java", "GameEngine.java", "Database.java"],
            devTasks: [
                { id: "java-b1", label: "Khởi tạo score=0 trong constructor", target: "GameEngine.java", difficulty: "easy", testCode: "GameEngine g = new GameEngine(); System.out.println(g.getScore());", expectedOutput: "0" },
                { id: "java-b2", label: "In danh sách players trong toString()", target: "Main.java", difficulty: "easy", testCode: "PlayerManager pm = new PlayerManager(); pm.addPlayer(\"A\"); System.out.println(pm.toString());", expectedOutput: "A" },
                { id: "java-b3", label: "Viết connectDB() ném SQLException", target: "Database.java", difficulty: "medium", testCode: "Database db = new Database(); db.connect(); System.out.println(\"OK\");", expectedOutput: "OK" },
                { id: "java-b4", label: "Set running=true trong start()", target: "GameEngine.java", difficulty: "medium", testCode: "GameEngine g = new GameEngine(); g.start(); System.out.println(\"OK\");", expectedOutput: "OK" },
                { id: "java-b5", label: "Lưu score vào Database", target: "Database.java", difficulty: "hard", testCode: "Database db = new Database(); db.save(100); System.out.println(\"PASS\");", expectedOutput: "PASS" },
                { id: "java-b6", label: "Xử lý đa luồng cho GameEngine", target: "GameEngine.java", difficulty: "hard", testCode: "System.out.println(\"PASS\");", expectedOutput: "PASS" }
            ],
            injTasks: [
                { id: "injava-b1", label: "Xóa return trong toString()", target: "Main.java", testCode: "return", expectedOutput: "MISSING" },
                { id: "injava-b2", label: "Comment out score=0", target: "GameEngine.java", testCode: "//.*score", expectedOutput: "SABOTAGE" },
                { id: "injava-b3", label: "Đổi running=true thành false", target: "GameEngine.java", testCode: "running\\s*=\\s*false", expectedOutput: "SABOTAGE" }
            ]
        },
        {
            id: "java_inventory",
            files: ["Inventory.java", "Item.java", "Player.java"],
            devTasks: [
                { id: "java-i1", label: "Khai báo List<Item> items trong Inventory", target: "Inventory.java", difficulty: "easy", testCode: "Inventory inv = new Inventory(); System.out.println(\"OK\");", expectedOutput: "OK" },
                { id: "java-i2", label: "Implement addItem(Item item)", target: "Inventory.java", difficulty: "easy", testCode: "Inventory inv = new Inventory(); inv.addItem(new Item(\"Sword\", 10)); System.out.println(\"OK\");", expectedOutput: "OK" },
                { id: "java-i3", label: "Viết constructor Item(name, value)", target: "Item.java", difficulty: "medium", testCode: "Item i = new Item(\"Potion\", 5); System.out.println(i.name);", expectedOutput: "Potion" },
                { id: "java-i4", label: "Implement removeItem(String name)", target: "Inventory.java", difficulty: "medium", testCode: "Inventory inv = new Inventory(); inv.removeItem(\"X\"); System.out.println(\"OK\");", expectedOutput: "OK" },
                { id: "java-i5", label: "Tính tổng giá trị items", target: "Inventory.java", difficulty: "hard", testCode: "System.out.println(\"PASS\");", expectedOutput: "PASS" },
                { id: "java-i6", label: "Implement equip/unequip trong Player", target: "Player.java", difficulty: "hard", testCode: "System.out.println(\"PASS\");", expectedOutput: "PASS" }
            ],
            injTasks: [
                { id: "injava-i1", label: "Xóa items.add() trong addItem", target: "Inventory.java", testCode: "items.add", expectedOutput: "MISSING" },
                { id: "injava-i2", label: "Return null trong constructor", target: "Item.java", testCode: "return null", expectedOutput: "SABOTAGE" },
                { id: "injava-i3", label: "Đổi += thành -= khi tính tổng", target: "Inventory.java", testCode: "-=", expectedOutput: "SABOTAGE" }
            ]
        }
    ],
    python: [
        {
            id: "py_ai_logic",
            files: ["game_state.py", "ai_brain.py", "utils.py"],
            devTasks: [
                { id: "py-a1", label: "Thêm is_running=False vào __init__", target: "game_state.py", difficulty: "easy", testCode: "print(GameState().is_running)", expectedOutput: "False" },
                { id: "py-a2", label: "Implement lerp(a, b, t)", target: "utils.py", difficulty: "easy", testCode: "print(lerp(0, 10, 0.5))", expectedOutput: "5" },
                { id: "py-a3", label: "Viết check_winner trả về True/False", target: "game_state.py", difficulty: "medium", testCode: "print(check_winner(GameState()))", expectedOutput: "False" },
                { id: "py-a4", label: "Tính khoảng cách Euclidean", target: "utils.py", difficulty: "medium", testCode: "print(int(distance([0,0], [3,4])))", expectedOutput: "5" },
                { id: "py-a5", label: "Dự đoán nước đi trong ai_brain", target: "ai_brain.py", difficulty: "hard", testCode: "print('PASS')", expectedOutput: "PASS" },
                { id: "py-a6", label: "Tối ưu bằng generator", target: "game_state.py", difficulty: "hard", testCode: "print('PASS')", expectedOutput: "PASS" }
            ],
            injTasks: [
                { id: "inpy-a1", label: "Đổi return True thành False", target: "game_state.py", testCode: "return False", expectedOutput: "SABOTAGE" },
                { id: "inpy-a2", label: "Import nonexistent_module", target: "game_state.py", testCode: "import nonexistent", expectedOutput: "SABOTAGE" },
                { id: "inpy-a3", label: "Đổi math.sqrt thành math.sin", target: "utils.py", testCode: "math.sin", expectedOutput: "SABOTAGE" }
            ]
        },
        {
            id: "py_data_parser",
            files: ["parser.py", "validator.py", "config.py"],
            devTasks: [
                { id: "py-d1", label: "Viết parse_json(data) trả về dict", target: "parser.py", difficulty: "easy", testCode: "print(type(parse_json('{}')).__name__)", expectedOutput: "dict" },
                { id: "py-d2", label: "Implement validate_schema(data)", target: "validator.py", difficulty: "easy", testCode: "print(validate_schema({}))", expectedOutput: "True" },
                { id: "py-d3", label: "Load config từ file JSON", target: "config.py", difficulty: "medium", testCode: "print('OK')", expectedOutput: "OK" },
                { id: "py-d4", label: "Xử lý lỗi JSONDecodeError", target: "parser.py", difficulty: "medium", testCode: "print('OK')", expectedOutput: "OK" },
                { id: "py-d5", label: "Validate nested objects", target: "validator.py", difficulty: "hard", testCode: "print('PASS')", expectedOutput: "PASS" },
                { id: "py-d6", label: "Cache config với decorator", target: "config.py", difficulty: "hard", testCode: "print('PASS')", expectedOutput: "PASS" }
            ],
            injTasks: [
                { id: "inpy-d1", label: "Return None thay vì dict", target: "parser.py", testCode: "return None", expectedOutput: "SABOTAGE" },
                { id: "inpy-d2", label: "Raise Exception trong validate", target: "validator.py", testCode: "raise Exception", expectedOutput: "SABOTAGE" },
                { id: "inpy-d3", label: "Xóa try-except trong load", target: "config.py", testCode: "try", expectedOutput: "MISSING" }
            ]
        }
    ],
    javascript: [
        {
            id: "js_web_core",
            files: ["main.game.js", "engine.js", "ui.js"],
            devTasks: [
                { id: "js-w1", label: "Set score = 0 trong init", target: "main.game.js", difficulty: "easy", testCode: "console.log(score);", expectedOutput: "0" },
                { id: "js-w2", label: "Thêm EventListener cho nút start", target: "ui.js", difficulty: "easy", testCode: "console.log('OK');", expectedOutput: "OK" },
                { id: "js-w3", label: "Implement EventEmitter.on(event, fn)", target: "engine.js", difficulty: "medium", testCode: "const e = new EventEmitter(); e.on('test', () => console.log('OK')); e.emit('test');", expectedOutput: "OK" },
                { id: "js-w4", label: "Thêm logic trong gameLoop()", target: "main.game.js", difficulty: "medium", testCode: "gameLoop(); console.log('OK');", expectedOutput: "OK" },
                { id: "js-w5", label: "Implement EventEmitter.emit(event, data)", target: "engine.js", difficulty: "hard", testCode: "console.log('PASS');", expectedOutput: "PASS" },
                { id: "js-w6", label: "Xử lý async fetch dữ liệu", target: "engine.js", difficulty: "hard", testCode: "console.log('PASS');", expectedOutput: "PASS" }
            ],
            injTasks: [
                { id: "injs-w1", label: "Thêm while(true){} trong gameLoop", target: "main.game.js", testCode: "while\\s*\\(\\s*true\\s*\\)", expectedOutput: "SABOTAGE" },
                { id: "injs-w2", label: "Đổi score thành s0re", target: "main.game.js", testCode: "s0re", expectedOutput: "SABOTAGE" },
                { id: "injs-w3", label: "Delete Object.prototype", target: "engine.js", testCode: "delete Object.prototype", expectedOutput: "SABOTAGE" }
            ]
        },
        {
            id: "js_socket",
            files: ["socket.js", "network.js", "protocol.js"],
            devTasks: [
                { id: "js-s1", label: "Khởi tạo WebSocket connection", target: "socket.js", difficulty: "easy", testCode: "console.log('OK');", expectedOutput: "OK" },
                { id: "js-s2", label: "Implement send(message)", target: "socket.js", difficulty: "easy", testCode: "console.log('OK');", expectedOutput: "OK" },
                { id: "js-s3", label: "Parse incoming messages", target: "protocol.js", difficulty: "medium", testCode: "console.log('OK');", expectedOutput: "OK" },
                { id: "js-s4", label: "Handle reconnection logic", target: "network.js", difficulty: "medium", testCode: "console.log('OK');", expectedOutput: "OK" },
                { id: "js-s5", label: "Implement message queue", target: "network.js", difficulty: "hard", testCode: "console.log('PASS');", expectedOutput: "PASS" },
                { id: "js-s6", label: "Serialize complex objects", target: "protocol.js", difficulty: "hard", testCode: "console.log('PASS');", expectedOutput: "PASS" }
            ],
            injTasks: [
                { id: "injs-s1", label: "Close socket ngay sau connect", target: "socket.js", testCode: "close\\(\\)", expectedOutput: "SABOTAGE" },
                { id: "injs-s2", label: "Return undefined trong parse", target: "protocol.js", testCode: "return undefined", expectedOutput: "SABOTAGE" },
                { id: "injs-s3", label: "Xóa reconnection timeout", target: "network.js", testCode: "setTimeout", expectedOutput: "MISSING" }
            ]
        }
    ]
};

const COLORS  = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7'];
const AVATARS = ['👾', '🔴', '🔵', '🟡', '🟣'];

const LANG_CONFIGS = {
    javascript: {
        id: 'javascript', label: 'JavaScript', icon: '🟦', ext: '.js',
        color: '#f7df1e',
        files: [
            {
                name: 'main.game.js',
                content: `let score = null;
let playerName = "";
let isRunning = false;

function initPlayer(name) {

}

function gameLoop() {

}

function onCollision(a, b) {
    return a.x === b.x && a.y === b.y;
}`,
            },
            {
                name: 'engine.js',
                content: `class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, fn) {

    }

    emit(event, data) {

    }
}

function loadAssets(list) {
    return Promise.all(list.map(url => fetch(url)));
}`,
            },
            {
                name: 'ui.js',
                content: `class UI {
    constructor() {
        this.elements = {};
    }

    render() {

    }

    update(data) {

    }
}`,
            },
        ],
    },
    python: {
        id: 'python', label: 'Python', icon: '🐍', ext: '.py',
        color: '#3776ab',
        files: [
            {
                name: 'game_state.py',
                content: `class GameState:
    def __init__(self):
        self.players = []
        self.round = 1
        self.score = 0

def check_winner(state):
    pass

def run_game():
    state = GameState()
    return state`,
            },
            {
                name: 'utils.py',
                content: `import math

def clamp(value, min_val, max_val):
    pass

def lerp(a, b, t):
    pass

def distance(p1, p2):
    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)`,
            },
            {
                name: 'ai_brain.py',
                content: `class AI:
    def __init__(self):
        self.memory = []

    def predict(self, state):
        pass

    def learn(self, data):
        pass`,
            },
        ],
    },
    java: {
        id: 'java', label: 'Java', icon: '☕', ext: '.java',
        color: '#ed8b00',
        files: [
            {
                name: 'Main.java',
                content: `import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        PlayerManager pm = new PlayerManager();
        System.out.println(pm.toString());
    }
}

class PlayerManager {
    private List<String> players = new ArrayList<>();

    public void addPlayer(String name) {
        players.add(name);
    }

    public String toString() {
        return "";
    }
}`,
            },
            {
                name: 'GameEngine.java',
                content: `public class GameEngine {
    private int score;
    private boolean running;

    public GameEngine() {

    }

    public void start() {

    }

    public int getScore() {
        return score;
    }
}`,
            },
            {
                name: 'Database.java',
                content: `import java.sql.*;

public class Database {
    private Connection conn;

    public void connect() {

    }

    public void save(int score) {

    }
}`,
            },
        ],
    },
    cpp: {
        id: 'cpp', label: 'C/C++', icon: '⚙️', ext: '.cpp',
        color: '#00599c',
        files: [
            {
                name: 'game.cpp',
                content: `#include <iostream>
#include <vector>
#include <string>

struct Player {

};

std::vector<Player> players;

void update() {

}

int main() {
    update();
    std::cout << "Game running" << std::endl;
    return 0;
}`,
            },
            {
                name: 'renderer.cpp',
                content: `#include <iostream>

class Renderer {
public:
    int width;
    int height;

    Renderer(int w, int h) {

    }

    void draw(const std::string& msg) {

    }
};
`,
            },
            {
                name: 'physics.cpp',
                content: `#include <cmath>

struct Vector2 {
    float x, y;
};

void applyForce(Vector2& obj, Vector2 force, float mass) {

}

void update(Vector2& obj, float dt) {

}`,
            },
        ],
    },
};

const FILES = {
    'main.game.js': {
        content: LANG_CONFIGS.javascript.files[0].content,
        lang: 'javascript',
        icon: '🟦'
    },
    'script.py': {
        content: LANG_CONFIGS.python.files[0].content,
        lang: 'python',
        icon: '🐍'
    },
    'Main.java': {
        content: LANG_CONFIGS.java.files[0].content,
        lang: 'java',
        icon: '☕'
    },
    'game.cpp': {
        content: LANG_CONFIGS.cpp.files[0].content,
        lang: 'cpp',
        icon: '⚙️'
    }
};

const PUBLIC_ROOMS = [
    { id: '123456', name: 'Battle Royale #001', cur: 3, max: 5 },
    { id: '789012', name: 'Code Duel #042',     cur: 1, max: 5 },
    { id: '345678', name: 'Speed Code VIP',     cur: 4, max: 5 },
];

const FILES_DEFAULT = {};
(function() {
    Object.keys(FILES).forEach(fn => {
        FILES_DEFAULT[fn] = FILES[fn].content;
    });
})();

function resetFilesContent() {
    Object.keys(FILES).forEach(fn => {
        FILES[fn].content = FILES_DEFAULT[fn];
    });
}

function rebuildFilesFromLangs(langIds) {
    const allLangs = Object.keys(LANG_CONFIGS);
    let chosen;
    if (!langIds || langIds.length === 0 || langIds[0] === 'random') {
        const shuffled = _shuffleArray(allLangs.slice());
        chosen = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
    } else {
        chosen = langIds.filter(id => LANG_CONFIGS[id]);
        if (chosen.length === 0) chosen = ['javascript', 'python'];
    }
    Object.keys(FILES).forEach(k => delete FILES[k]);
    const allSlots = [];
    chosen.forEach(langId => {
        const cfg = LANG_CONFIGS[langId];
        const shuffledFiles = _shuffleArray(cfg.files.slice());
        shuffledFiles.forEach(f => allSlots.push({ langId, cfg, file: f }));
    });
    _shuffleArray(allSlots);
    const TARGET = 4;
    while (allSlots.length < TARGET) {
        allSlots.push({ ...allSlots[allSlots.length % allSlots.length] });
    }
    const finalSlots = allSlots.slice(0, TARGET);
    const usedNames = new Set();
    finalSlots.forEach(slot => {
        const cfg  = slot.cfg;
        let name   = slot.file.name;
        if (usedNames.has(name)) {
            const ext  = name.lastIndexOf('.');
            const base = ext > 0 ? name.slice(0, ext) : name;
            const sfx  = ext > 0 ? name.slice(ext) : '';
            let i = 2;
            while (usedNames.has(`${base}${i}${sfx}`)) i++;
            name = `${base}${i}${sfx}`;
        }
        usedNames.add(name);
        FILES[name] = {
            content: slot.file.content,
            lang:    cfg.id,
            icon:    cfg.icon,
            _langId: cfg.id,
        };
        FILES_DEFAULT[name] = slot.file.content;
    });
    return FILES;
}

function buildTasksForFiles() {
    const devTasks = {};
    const injTasks = {};
    const activeFiles = Object.keys(FILES);
    if (activeFiles.length === 0) return { devTasks, injTasks };
    const filesByLang = {};
    activeFiles.forEach(fn => {
        const langId = FILES[fn]._langId || FILES[fn].lang;
        if (!filesByLang[langId]) filesByLang[langId] = [];
        filesByLang[langId].push(fn);
    });
    const selectedTemplates = [];
    Object.keys(filesByLang).forEach(langId => {
        const templates = QUEST_TEMPLATES[langId];
        if (!templates || templates.length === 0) return;
        const template = templates[Math.floor(Math.random() * templates.length)];
        if (!template || !template.files) return;
        selectedTemplates.push({ langId, template });
    });
    if (selectedTemplates.length === 0) return { devTasks, injTasks };
    const fileMapping = {};
    selectedTemplates.forEach(({ langId, template }) => {
        const filesForLang = filesByLang[langId] || [];
        if (!template.files) return;
        template.files.forEach((templateFile, idx) => {
            const actualFile = filesForLang[idx % filesForLang.length];
            if (actualFile) fileMapping[templateFile] = actualFile;
        });
    });
    selectedTemplates.forEach(({ template }) => {
        if (!template) return;
        const devTaskList = template.devTasks || [];
        const injTaskList = template.injTasks || [];
        let devAttempts = 0;
        devTaskList.forEach(task => {
            if (devAttempts++ > 100) return;
            if (!task || !task.target) return;
            const actualFile = fileMapping[task.target];
            if (!actualFile || !FILES[actualFile]) return;
            if (!devTasks[actualFile]) devTasks[actualFile] = [];
            devTasks[actualFile].push({
                ...task,
                targetFile: actualFile,
                fileName: actualFile,
                fileId: actualFile
            });
        });
        let injAttempts = 0;
        injTaskList.forEach(task => {
            if (injAttempts++ > 100) return;
            if (!task || !task.target) return;
            const actualFile = fileMapping[task.target];
            if (!actualFile || !FILES[actualFile]) return;
            if (!injTasks[actualFile]) injTasks[actualFile] = [];
            injTasks[actualFile].push({
                ...task,
                targetFile: actualFile,
                fileName: actualFile,
                fileId: actualFile
            });
        });
    });
    activeFiles.forEach(fn => {
        if (!devTasks[fn]) devTasks[fn] = [];
        if (!injTasks[fn]) injTasks[fn] = [];
    });
    Object.keys(devTasks).forEach(fn => {
        devTasks[fn] = _shuffleArray(devTasks[fn]).slice(0, 3);
    });
    Object.keys(injTasks).forEach(fn => {
        injTasks[fn] = _shuffleArray(injTasks[fn]).slice(0, 2);
    });
    return { devTasks, injTasks };
}

function _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
