import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '');
const stripStackTrace = (str) => str.replace(/\sat.*/g, '').trim();

class CustomReporter 
{
    onRunStart () 
    {
        const dir = path.resolve(__dirname, '../jest-logs');

        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    }
  
    onTestResult (test, testResult) 
    {
        const fileName = path.basename(test.path);
        const logFile = path.resolve(__dirname, `../jest-logs/jest--${fileName}.log`);

        let allPass = true;

        let logOutput = `Test File: ${fileName}\n\n`;

        for (const testCase of testResult.testResults)
        {
            if (testCase.status !== 'passed')
            {
                allPass = false;
                logOutput += `FAILED: \n${testCase.fullName}.\n`;
    
                const failureMessages = testCase.failureMessages
                    .map(msg => stripStackTrace(stripAnsi(msg)))
                    .join('\n  ');
                
                logOutput += `\nREASON: ${failureMessages}\n`;
                logOutput += `\n--------------------------------\n\n`;
            }
        };

        if (allPass) logOutput += `All test passed.\n\n`;

        fs.writeFileSync(logFile, logOutput, { flag: 'w' });
    }
}
  
export default CustomReporter;