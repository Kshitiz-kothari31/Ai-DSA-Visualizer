export const transpileToVisualJS = (code, language) => {
    let jsCode = code;

    if ( language === 'cpp' ){
        jsCode = jsCode.replace(/#include.*/g, "").replace(/using namespace std;/g, "");

        jsCode = jsCode.replace(
            /int\s+(\w+)\[\]\s*=\s*\{(.*?)\};/g,
            "let $1 = [$2]; recordStep('$1', [...$1])"
        );

        jsCode = jsCode.replace(
            /swap\((.*?)\[(.*?)\],(.*?)\[(.*?)\]\)/g,
            "[$1[$2], $3[$4]] = [$3[$4], $1[$2]]; recordState('$1', [...$1], [$2, $4]);"
        );
    }else if( language === 'python' ){
        jsCode = jsCode.replace(/(\w+)\s*=\s*\[(.*?)\]/g, "let $1 = [$2]; recordState('$1', [...$1]);");
    }

    jsCode = jsCode.replace(/(int|var|let)\s+(\w+)\s*=/g, "let $2 =");

    return jsCode;
}