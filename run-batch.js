const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Run a list of commands with a max concurrency limit
async function runWithConcurrencyLimit(tasks, limit) {
  const results = [];
  const executing = [];
  
  for (const task of tasks) {
    const p = execPromise(task.command)
      .then((res) => {
        console.log(`[SUCCESS] Row ${task.row}: ${task.name}`);
        return { task, success: true, stdout: res.stdout };
      })
      .catch((err) => {
        console.error(`[FAILED] Row ${task.row}: ${task.name} - ${err.message}`);
        return { task, success: false, error: err };
      });
      
    results.push(p);
    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);
    
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
    
    // Add an artificial delay between task starts to stagger API bursts
    await new Promise(r => setTimeout(r, 5000));
  }
  
  return Promise.all(results);
}

async function main() {
  const CONCURRENCY_LIMIT = 2; // Strict limit to prevent Groq/Gemini/Cloudflare API exhaustion
  console.log(`Starting Batch Run with a concurrency limit of ${CONCURRENCY_LIMIT}...`);

  const batchTasks = [
    { row: 4, name: 'Apollo Clinic', command: `node index.js "https://www.google.com/maps/search/?api=1&query=Apollo+Clinic+Sector+8+Chandigarh" 4` },
    { row: 5, name: 'Sagar Express', command: `node index.js "https://www.google.com/maps/search/?api=1&query=Sagar+Express+Sector+17+Chandigarh" 5` },
    { row: 8, name: 'Roxy Salon', command: `node index.js "https://www.google.com/maps/search/?api=1&query=Roxy+Salon+Sector+17+Chandigarh" 8` },
    { row: 45, name: 'Mittal Real Estate', command: `node index.js "https://www.google.com/maps/search/?api=1&query=Mittal+Real+Estate+provider+Sector+23+Chandigarh" 45` },
    { row: 17, name: 'Wao Fitness', command: `node index.js "https://www.google.com/maps/search/?api=1&query=Wao+Fitness+Sector+9+Chandigarh" 17` }
  ];

  const results = await runWithConcurrencyLimit(batchTasks, CONCURRENCY_LIMIT);
  console.log('\\nBatch Run Complete!');
  
  const successful = results.filter(r => r.success).length;
  console.log(`Successfully completed: ${successful}/${batchTasks.length}`);
}

main();
