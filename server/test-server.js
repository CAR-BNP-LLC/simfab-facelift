// Simple test to verify the server can start
const { spawn } = require('child_process');

console.log('Testing server startup...');

const server = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'pipe'
});

let output = '';
let hasStarted = false;

server.stdout.on('data', (data) => {
  output += data.toString();
  console.log(data.toString());
  
  if (data.toString().includes('Server is running on port')) {
    hasStarted = true;
    console.log('✅ Server started successfully!');
    server.kill();
  }
});

server.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

server.on('close', (code) => {
  if (hasStarted) {
    console.log('✅ Test completed successfully');
  } else {
    console.log('❌ Server failed to start');
    console.log('Output:', output);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  if (!hasStarted) {
    console.log('❌ Test timed out');
    server.kill();
  }
}, 10000);
