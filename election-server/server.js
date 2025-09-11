const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

// Storage
const electoralDataStore = [];

console.log('WebSocket server started on port 3001');

// send data to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (client) => {
  console.log('Client connected');

  // Send existing data to new client
  client.send(JSON.stringify({
    type: 'initial_data',
    data: electoralDataStore
  }));

  client.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'json_upload') {
        console.log('JSON file uploaded:', data.fileName);
        const jsonData = data.jsonData;

        if (jsonData && jsonData.ed_code) {

          const existingIndex = electoralDataStore.findIndex(d => d.ed_code === jsonData.ed_code);
          
          // Sort candidates by votes and get top 5
          const sortedCandidates = jsonData.by_party
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 5);

          const districtData = {
            ed_code: jsonData.ed_code,
            ed_name: jsonData.ed_name,
            by_party: sortedCandidates,
            summary: jsonData.summary
          };

          if (existingIndex !== -1) {
            electoralDataStore[existingIndex] = districtData;
          } else {
            electoralDataStore.push(districtData);
          }

          console.log('Electoral District:', jsonData.ed_name);
          console.log('Total districts stored:', electoralDataStore.length);

          broadcast({
            type: 'update',
            data: electoralDataStore
          });
        } else {
          client.send(JSON.stringify({
            type: 'error',
            message: 'Invalid electoral data'
          }));
        }
      }
    } catch (error) {
      console.log('Received raw message:', message);
      console.error('Error parsing message:', error);
      client.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  client.on('close', () => {
    console.log('Client disconnected');
  });
});