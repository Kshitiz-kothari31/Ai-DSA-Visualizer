import * as acorn from 'acorn';
import { generate } from 'astring';

export function instrumentCode(code) {
    let ast;
    try {
        ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
    } catch (e) {
        throw new Error(`Parse Error: ${e.message}`);
    }

    const variableNames = new Set();

    // Pass 1: Global discovery of variable names (Improved)
    const discover = (node) => {
        if (!node || typeof node !== 'object') return;
        
        if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
            variableNames.add(node.id.name);
        } else if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') {
            variableNames.add(node.left.name);
        } else if (node.type === 'FunctionDeclaration' && node.id) {
            variableNames.add(node.id.name);
        }

        for (let key in node) {
            if (['loc', 'start', 'end'].includes(key)) continue;
            const child = node[key];
            if (Array.isArray(child)) child.forEach(discover);
            else discover(child);
        }
    };
    discover(ast);

    const varsToTrack = Array.from(variableNames).filter(v => 
        !v.startsWith('__') && !['console', 'window', 'document', 'Math', 'JSON', 'input'].includes(v)
    );

    // Pass 2: Injection (The "Report" generator)
    const createReportCall = (node) => {
        const line = getLineNumber(code, node.start);
        
        // Create an object where each key is the variable name and value is the variable itself
        const properties = varsToTrack.map(v => ({
            type: 'Property',
            key: { type: 'Identifier', name: v },
            value: {
                type: 'ConditionalExpression',
                test: {
                    type: 'BinaryExpression',
                    left: { type: 'UnaryExpression', operator: 'typeof', prefix: true, argument: { type: 'Identifier', name: v } },
                    operator: '!==',
                    right: { type: 'Literal', value: 'undefined' }
                },
                consequent: { type: 'Identifier', name: v },
                alternate: { type: 'Identifier', name: 'undefined' }
            },
            kind: 'init',
            shorthand: false
        }));

        return {
            type: 'ExpressionStatement',
            expression: {
                type: 'CallExpression',
                callee: { type: 'Identifier', name: '__report' },
                arguments: [
                    { type: 'Literal', value: line },
                    { type: 'ObjectExpression', properties }
                ]
            }
        };
    };

    const transform = (node) => {
        if (!node || typeof node !== 'object') return;

        // Force all declarations to 'var' so they are accessible in the same scope
        if (node.type === 'VariableDeclaration') {
            node.kind = 'var';
        }

        if (Array.isArray(node.body)) {
            const newBody = [];
            for (let stmt of node.body) {
                newBody.push(stmt);
                if (shouldInstrument(stmt)) {
                    newBody.push(createReportCall(stmt));
                }
                transform(stmt);
            }
            node.body = newBody;
        } else {
            // Traverse children
            for (let key in node) {
                if (['loc', 'start', 'end'].includes(key)) continue;
                const child = node[key];
                if (Array.isArray(child)) child.forEach(transform);
                else if (child && typeof child === 'object') transform(child);
            }
        }
    };

    const shouldInstrument = (node) => {
        const types = ['VariableDeclaration', 'ExpressionStatement', 'ReturnStatement'];
        if (!types.includes(node.type)) return false;
        
        if (node.type === 'ExpressionStatement') {
            const expr = node.expression;
            return expr.type === 'AssignmentExpression' || 
                   expr.type === 'UpdateExpression' || 
                   (expr.type === 'CallExpression');
        }
        return true;
    };

    const getLineNumber = (c, pos) => c.substring(0, pos).split('\n').length;

    transform(ast);
    return { instrumented: generate(ast), varsToTrack };
}

export async function executeInstrumented({ instrumented }, initialState = {}, onInputRequest) {
    const reports = [];
    const logs = []; 
    const MAX_FRAMES = 500;
    let lastStateStr = '';

    const __report = (line, state) => {
        if (reports.length >= MAX_FRAMES) return;
        
        // Filter out undefineds to keep the visualizer clean
        const cleanState = {};
        Object.entries(state).forEach(([k, v]) => {
            if (v !== undefined) cleanState[k] = v;
        });

        const stateWithLogs = { variables: cleanState, __logs: [...logs] };
        const s = JSON.stringify(stateWithLogs);
        
        if (s !== lastStateStr) {
            reports.push({ line, state: JSON.parse(s) });
            lastStateStr = s;
        }
    };

    const customConsole = {
        log: (...args) => {
            const output = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            logs.push(output);
        }
    };

    const input = async (promptText) => {
        if (promptText) customConsole.log(promptText);
        if (!onInputRequest) return "";
        return await onInputRequest();
    };

    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

    // We wrap the code in a function where __report is available in the scope
    const runner = new AsyncFunction('__report', 'console', 'input', `
        try {
            ${instrumented}
        } catch (e) {
            console.log("Error during execution: " + e.message);
        }
    `);

    await runner(__report, customConsole, input);
    return reports;
}