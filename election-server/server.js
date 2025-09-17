const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

// Storage
const electoralDataStore = {};

console.log('WebSocket server started on port 3001');

// Detect result type
function detectResultType(jsonData) {
  // Electoral district
  if (jsonData.level === 'ELECTORAL-DISTRICT') {
    return 'ED';
  }

  // Polling division
  if (jsonData.level === 'POLLING-DIVISION') {
    return 'PD';
  }
  
  // Postal votes
  if (jsonData.level === 'POSTAL-VOTE') {
    return 'PV';
  }
  
  // default
  return 'UNKNOWN';
}

// Send data to all connected clients
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
    electoralData: electoralDataStore
  }));

  client.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'election_data_upload') {
        console.log('JSON file uploaded:', data.fileName);
        const jsonData = data.jsonData;
        const resultType = detectResultType(jsonData);

        if (jsonData && jsonData.ed_code) {
          console.log(`Uploading ${resultType} data:`, jsonData.ed_name || jsonData.pd_name || 'Unknown');

          const districtCode = jsonData.ed_code;
          
          // Initialize district type
          if (!electoralDataStore[districtCode]) {
            electoralDataStore[districtCode] = {
              district_name: jsonData.ed_name || jsonData.district_name,
              ED: null,
              PV: {},
              PD: {}
            };
          }

          // Sort candidates by votes and get top 5
          const sortedCandidates = jsonData.by_party ? 
            jsonData.by_party.sort((a, b) => b.votes - a.votes).slice(0, 5) : [];

          const processedData = {
            ...jsonData,
            type: resultType,
            by_party: sortedCandidates
          };

          // Store based on type
          if (resultType === 'ED') {
            electoralDataStore[districtCode].ED = processedData;
          } else if (resultType === 'PV') {
            const pvKey = districtCode + '_PV';
            electoralDataStore[districtCode].PV[pvKey] = processedData;
          } else if (resultType === 'PD') {
            electoralDataStore[districtCode].PD[jsonData.pd_code] = processedData;
          }

          console.log(`Total districts stored: ${Object.keys(electoralDataStore).length}`);

          // Send success response
          client.send(JSON.stringify({
            type: 'upload_success',
            resultType: resultType,
            districtName: jsonData.ed_name || jsonData.pd_name,
            uploadedData: processedData
          }));

          broadcast({
            type: 'data_update',
            electoralData: electoralDataStore
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

console.log('Server ready - supports PV (Postal Votes), PD (Polling Division), ED (Electoral District)');