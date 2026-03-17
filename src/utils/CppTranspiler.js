export const transpileCppToJs = (cppCode) => {
    let jsCode = cppCode;

    jsCode = jsCode.replace(/#include.*/g, "");
    jsCode = jsCode.replace(/using namespace std;/g, "");

    jsCode = jsCode.replace(
        /int\s+(\w+)\[\]\s*=\s*\{(.*?)\};/g,
        (match, name, values) => {
            return `let ${name} = [${values}]; recordStep('${name}', [...${name}])`;
        }
    );
}