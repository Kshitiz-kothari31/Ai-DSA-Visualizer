import { p } from "framer-motion/client";
import { Codesandbox } from "lucide-react";

export const transpileToVisualJS = (code, language) => {
    let jsCode = code;

    jsCode = stripBoilerplate(jsCode, language);

    if( language === 'python' ){
        jsCode = transformPythonStructure(jsCode);
    }else if( language === 'cpp' ){
        jsCode = transformCppStructure(jsCode);
    }else if( language === 'java' ){
        jsCode = transformJavaStructure(jsCode);
    }

    jsCode = finalizeCommonSyntax(jsCode);
    return jsCode;
}

const stripBoilerplate = (code, lang) => { // -> Write this funciton for other languages also.
    if( lang === 'cpp' ){
        return code 
            .replace(/#include.*/g, "")
            .replace(/using namespace std;/g, "")
            .replace(/int\s+main\s*\(\s*\)\s*\{/, "")
            .replace(/\}\s*(return 0;)?\s*$/, "");
    }
    return code;
};

const pythonToJSBraces = (code) => {
    const lines = code.split('\n');
    let result = [];
    let indentStack = [0];

    lines.forEach((line) => {
        if( line.trim().length === 0 || line.trim().startsWith('#')) {
            result.push(line);
            return;
        }

        const currentIndent = line.search(/\S/);

        while (currentIndent < indentStack[indentStack.length - 1]) {
            indentStack.pop();
            result.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
        }

        // If this line starts a block (ends with :)
        if (line.trim().endsWith(':')) {
            // Remove the colon and add a brace
            const cleanLine = line.trim().slice(0, -1);
            result.push(' '.repeat(currentIndent) + cleanLine + ' {');
            indentStack.push(currentIndent + 4); // Assume 4-space indentation standard
        } else {
            result.push(line);
        }
    });

    while (indentStack.length > 1) {
        indentStack.pop();
        result.push('}');
    }

    return result.join('\n');
};

const transformPythonStructure = (code) => {
    let processed = code;

    // 1. Convert Indentation to Braces first
    processed = pythonToJSBraces(processed);

    // 2. Convert 'for i in range(n)' to JS syntax
    processed = processed.replace(/for\s+(\w+)\s+in\s+range\((.*?)\)\s*\{/g, (match, varName, args) => {
        const parts = args.split(',').map(s => s.trim());
        let start = "0", stop = "0", step = "1";

        if (parts.length === 1) stop = parts[0];
        else if (parts.length === 2) { start = parts[0]; stop = parts[1]; }
        else if (parts.length === 3) { start = parts[0]; stop = parts[1]; step = parts[2]; }
        
        return `for (let ${varName} = ${start}; ${varName} < ${stop}; ${varName} += ${step}) {`;
    });

    // 3. Simple keyword translations
    processed = processed.replace(/\belif\b/g, "else if")
                         .replace(/\bTrue\b/g, "true")
                         .replace(/\bFalse\b/g, "false")
                         .replace(/\bNone\b/g, "null")
                         .replace(/print\((.*?)\)/g, "console.log($1)");

    return processed;
};

const transformCppStructure = (code) => {
    let processed = code;

    processed = processed.replace(/(\w+)\s+(\w+)\[\]\s*=\s*\{(.*?)\}/g, "let $2 = [$3]");

    processed = processed.replace(/swap\((.*?), (.*?)\)/g, "[$1, $2] = [$2, $1]");

    processed = processed.replace(/cout\s*<<\s*(.*?)(<<\s*endl)?\s*;/g, "console.log($1);");

    return processed;
};

const finalizeCommonSyntax = (code) => {
    return code
        .replace(/\b(int|float|double|char|string|auto|bool)\b(?!\s*\()/g, "let").trim();
};