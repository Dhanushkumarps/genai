import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(msg, type = 'info') {
    if (type === 'pass') console.log(`${GREEN}✔ ${msg}${RESET}`);
    else if (type === 'fail') console.log(`${RED}✘ ${msg}${RESET}`);
    else console.log(msg);
}

function checkFileExists(filePath) {
    const fullPath = path.join(rootDir, filePath);
    if (fs.existsSync(fullPath)) {
        log(`File exists: ${filePath}`, 'pass');
        return true;
    } else {
        log(`Missing file: ${filePath}`, 'fail');
        return false;
    }
}

function checkContent(filePath, regex, description) {
    const fullPath = path.join(rootDir, filePath);
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (regex.test(content)) {
            log(`Content Verified [${description}] in ${filePath}`, 'pass');
            return true;
        } else {
            log(`Missing content [${description}] in ${filePath}`, 'fail');
            return false;
        }
    } catch (e) {
        log(`Could not read ${filePath}`, 'fail');
        return false;
    }
}

console.log('Running SkillOS Validation System...\n');

// 1. Structure Check
console.log(`${YELLOW}1. Checking Feature-First Structure...${RESET}`);
const requiredDirs = [
    'src/features/dashboard',
    'src/features/auth',
    'src/features/tasks',
    'src/lib',
    'src/styles',
    'src/types'
];
requiredDirs.forEach(d => checkFileExists(d));

// 2. Dependency Check
console.log(`\n${YELLOW}2. Checking Dependencies...${RESET}`);
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const deps = ['@supabase/supabase-js', 'uplot', 'date-fns', 'canvas-confetti', 'lucide-react'];
deps.forEach(d => {
    if (pkg.dependencies[d]) log(`Dependency found: ${d}`, 'pass');
    else log(`Missing dependency: ${d}`, 'fail');
});

// 3. Glass System Check
console.log(`\n${YELLOW}3. Checking Glass System...${RESET}`);
checkContent('src/styles/glass-system.css', /\.glass-panel/, '.glass-panel class');
checkContent('src/styles/glass-system.css', /--glass-bg-intense/, 'CSS Variables');
checkContent('src/styles/glass-system.css', /@keyframes glitch/, 'Cyberpunk Glitch Animation');

// 4. Edge Function Check
console.log(`\n${YELLOW}4. Checking Backend Logic...${RESET}`);
const edgeFuncPath = path.join(rootDir, '../supabase/functions/update-system-stats/index.ts');
if (fs.existsSync(edgeFuncPath)) {
    log(`Edge Function exists: update-system-stats`, 'pass');
    // Simple check for logic
    const content = fs.readFileSync(edgeFuncPath, 'utf8');
    if (content.includes('active_tasks * 10')) log('Calculation Formula Verified', 'pass');
    else log('Missing Calculation Formula', 'fail');
} else {
    log('Missing Edge Function: update-system-stats', 'fail');
}

// 5. Component Logic
console.log(`\n${YELLOW}5. Checking Component Logic...${RESET}`);
checkContent('src/features/dashboard/SystemMonitor.tsx', /uPlot/, 'uPlot Integration');
checkContent('src/features/tasks/TaskManager.tsx', /grid-cols-12/, 'Bento Grid Layout');
checkContent('src/features/tasks/useTaskOperations.ts', /deleted_at/, 'Deleted At Column Handling');

console.log(`\n${YELLOW}Validation Complete.${RESET}`);
