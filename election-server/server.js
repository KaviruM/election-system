const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 3001 });

server.on('connection', (client) => {
  console.log('Client connected');

  client.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'json_upload') {
        console.log('JSON file uploaded:', data.fileName);
        
        const jsonData = data.jsonData;
        

        const electoralData = {
          ed_code: jsonData.ed_code,
          ed_name: jsonData.ed_name,
          by_party: jsonData.by_party,
          summary: jsonData.summary
        };
        
        console.log('Electoral District:', electoralData.ed_name);
        console.log('Number of parties:', electoralData.by_party?.length);
        

        client.send(JSON.stringify({
          type: 'electoral_data',
          message: 'Electoral data processed successfully',
          fileName: data.fileName,
          data: electoralData
        }));
      }
    } catch (error) {
      console.log('Received raw message:', message);
      

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