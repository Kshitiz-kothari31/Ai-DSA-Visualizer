const code = `#include <iostream>\n#include <vector>\nusing namespace std;\nint main() { cout << \"VISUALIZE: [1, 2, 3]\" << endl; return 0; }`;

fetch('http://localhost:5173/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language: 'cpp' })
})
.then(res => res.json())
.then(data => {
    console.log("RESPONSE:", data);
})
.catch(err => console.error(err));
