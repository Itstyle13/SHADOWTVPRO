const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
data.filter(d => d.errorCount > 0 || d.warningCount > 0).forEach(d => {
    console.log('\n--- ' + d.filePath.replace(/.*web[\\\/]src[\\\/]/, '').replace(/.*web[\\\/]public[\\\/]/, '') + ' ---');
    d.messages.forEach(m => console.log(m.line + ':' + m.column + ' ' + m.ruleId + ' ' + m.message));
});
