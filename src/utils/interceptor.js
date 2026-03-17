import * as acorn from 'acorn';
import { generate } from 'astring';

/**
 * Instruments the user's code to capture state changes.
 */
export function instrumentCode(code) {
    let ast;
    try {
        ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
    } catch (e) {
        throw new Error(`Parse Error: ${e.message}`);
    }

    const variableNames = new Set();

    // Pass 1: Global discovery of variable names
    const discover = (node) => {
        if (!node || typeof node !== 'object') return;
        
        if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
            variableNames.add(node.id.name);
        } else if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.params) {
            node.params.forEach(p => {
                if (p.type === 'Identifier') variableNames.add(p.name);
                else if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier') variableNames.add(p.left.name);
            });
        } else if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') {
            variableNames.add(node.left.name);
        }

        for (let key in node) {
            if (key === 'loc' || key === 'start' || key === 'end') continue;
            const child = node[key];
            if (Array.isArray(child)) child.forEach(discover);
            else discover(child);
        }
    };
    discover(ast);

    const varsToTrack = Array.from(variableNames).filter(v => 
        !v.startsWith('__') && !['console', 'window', 'document', 'Math', 'JSON'].includes(v)
    );

    // Pass 2: Injection and flattening
    const createReportCall = (node) => {
        const line = getLineNumber(code, node.start);
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
            kind: 'init'
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

        // Flatten let/const to var
        if (node.type === 'VariableDeclaration') {
            node.kind = 'var';
        }

        // Handle Loop Statements to capture indices
        if (node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
            const body = node.body;
            if (body.type !== 'BlockStatement') {
                node.body = { type: 'BlockStatement', body: [body] };
            }
            // Inject report call at the VERY START of the loop body
            node.body.body.unshift(createReportCall(node));
        }

        // Process bodies (Program, BlockStatement, etc.)
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
            // Transform sub-bodies (if/for/while/switch cases)
            const subBodies = ['body', 'consequent', 'alternate', 'init', 'update'];
            for (let key of subBodies) {
                if (node[key] && typeof node[key] === 'object') {
                    if (Array.isArray(node[key])) {
                         // already handled for Program/BlockStatement
                    } else if (node[key].type && node[key].type !== 'BlockStatement' && key !== 'init' && key !== 'update') {
                        node[key] = {
                            type: 'BlockStatement',
                            body: [node[key]]
                        };
                    }
                }
            }

            for (let key in node) {
                if (key === 'loc' || key === 'start' || key === 'end' || key === 'body') continue;
                const child = node[key];
                if (Array.isArray(child)) child.forEach(transform);
                else transform(child);
            }
            if (node.body && !Array.isArray(node.body)) transform(node.body);
        }
    };

    const shouldInstrument = (node) => {
        if (node.type === 'VariableDeclaration') return true;
        if (node.type === 'ExpressionStatement') {
            const expr = node.expression;
            return expr.type === 'AssignmentExpression' || 
                   expr.type === 'UpdateExpression' || // i++, j--
                   (expr.type === 'CallExpression' && isMutation(expr));
        }
        return false;
    };

    const isMutation = (expr) => {
        const mutations = ['push', 'pop', 'splice', 'reverse', 'sort', 'shift', 'unshift'];
        return expr.callee.type === 'MemberExpression' &&
               expr.callee.property.type === 'Identifier' &&
               mutations.includes(expr.callee.property.name);
    };

    const getLineNumber = (c, pos) => c.substring(0, pos).split('\n').length;

    transform(ast);
    return { instrumented: generate(ast), varsToTrack };
}

export function executeInstrumented({ instrumented }, initialState = {}) {
    const reports = [];
    const MAX_FRAMES = 1000;
    let lastStateStr = '';

    const __report = (line, state) => {
        if (reports.length >= MAX_FRAMES) return;
        const s = JSON.stringify(state);
        if (s !== lastStateStr) {
            reports.push({ line, state: JSON.parse(s) });
            lastStateStr = s;
        }
    };

    const runner = new Function('__report', `
        ${Object.keys(initialState).map(k => `var ${k} = ${JSON.stringify(initialState[k])};`).join('\n')}
        try {
            ${instrumented}
        } catch (e) {
            __report(0, { error: e.message });
        }
    `);

    try {
        runner(__report);
    } catch (e) {
        console.error('Runner crash:', e);
    }
    return reports;
}
