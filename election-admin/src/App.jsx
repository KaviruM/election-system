import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const JsonFileUpload = () => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedData, setUploadedData] = useState(null);
  const wsRef = useRef(null);
  const [detectedType, setDetectedType] = useState(null); // PV, PD, ED

  useEffect(() => {
    wsRef.current = new WebSocket('ws://localhost:3001');

    wsRef.current.onopen = () => setConnected(true);
    wsRef.current.onclose = () => setConnected(false);
    wsRef.current.onerror = () => setError('Connection failed');

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'upload_success') {
        setSuccess(`${data.resultType} data uploaded successfully for ${data.districtName}!`);
        setUploadedData(data.uploadedData);
        setDetectedType(data.resultType);
      } else if (data.type === 'error') {
        setError(data.message);
      }
    };

    return () => wsRef.current?.close();
  }, []);

  const detectResultType = (jsonData) => {
    // Use the level field to determine type (primary method)
    if (jsonData.level === 'ELECTORAL-DISTRICT') {
      return 'ED';
    }
    
    if (jsonData.level === 'POLLING-DIVISION') {
      return 'PD';
    }
    
    if (jsonData.level === 'POSTAL-VOTE') {
      return 'PV';
    }
    
    // Fallback to old detection method if level field is not present
    if (jsonData.result_type === 'postal' || 
        jsonData.type === 'postal' || 
        (jsonData.pd_name && jsonData.pd_name.toLowerCase().includes('postal')) ||
        (jsonData.ed_name && jsonData.ed_name.toLowerCase().includes('postal'))) {
      return 'PV'; // Postal Votes
    }
    
    // Check if it has polling division data (pd_code exists)
    if (jsonData.pd_code) {
      return 'PD'; // Polling Division
    }
    
    // If it has ed_code and summary but no pd_code, it's likely electoral district final
    if (jsonData.ed_code && jsonData.summary && !jsonData.pd_code) {
      return 'ED'; // Electoral District Final
    }
    
    // Default fallback
    return 'UNKNOWN';
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Please select a JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        const resultType = detectResultType(jsonData);
        
        setDetectedType(resultType);
        
        wsRef.current.send(JSON.stringify({
          type: 'election_data_upload',
          fileName: file.name,
          jsonData,
          resultType
        }));
        setError('');
        setSuccess('');
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className='container'>
      <h2>Election Data Upload</h2>
      
      <div className='status'>
        Status: {connected ? '✅ Connected' : '❌ Disconnected'}
      </div>

      {detectedType && (
        <div className='status'>
          Detected Type: {detectedType} - {detectedType === 'PV' ? 'Postal Votes' : detectedType === 'PD' ? 'Polling Division' : detectedType === 'ED' ? 'Electoral District (Final)' : 'Unknown Type'}
        </div>
      )}

      <input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        disabled={!connected}
        className='file-input'
      />

      {error && <div className='error'>{error}</div>}
      {success && <div className='success'>{success}</div>}

      {uploadedData && (
        <div className='uploaded-data'>
          <h3>Uploaded: {uploadedData.ed_name || uploadedData.pd_name || 'Unknown'}</h3>
          <p>Type: {detectedType} - {detectedType === 'PV' ? 'Postal Votes' : detectedType === 'PD' ? 'Polling Division' : detectedType === 'ED' ? 'Electoral District (Final)' : 'Unknown Type'}</p>
          <p>Code: {uploadedData.ed_code || uploadedData.pd_code}</p>
          <p>Valid Votes: {uploadedData.summary?.valid?.toLocaleString()}</p>
          <p>Rejected Votes: {uploadedData.summary?.rejected?.toLocaleString()}</p>
          <p>Total Polled: {uploadedData.summary?.polled?.toLocaleString()}</p>
          <p>Percent Polled: {uploadedData.summary?.percent_polled}%</p>
          <p>Parties: {uploadedData.by_party?.length}</p>

          <div className='party-results'>
            <h4>Party Results:</h4>
            <ul>
              {uploadedData.by_party?.map((party) => (
                <li key={party.party_name}>
                  {party.candidate}: {party.votes.toLocaleString()} votes ({party.percentage}%)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonFileUpload;